import { ErrorDatos, type Datos } from '@lab/datos';
import { invalido, sinEdicion, type Contexto, type PreguntaEnMemoria, type ProyectoEnMemoria } from './contexto';
import { soloPregunta } from './proyectos';
import { TIPOS_PREGUNTA, validarCadencia, validarDia, validarHora, validarMuestras } from './validar';

type Edicion = Pick<
  Datos,
  'actualizarProyecto' | 'cambiarCompetidores' | 'editarPregunta' | 'agregarPregunta' | 'desactivarPregunta' | 'cambiarEstado'
>;

const normalizar = (t: string) => t.replace(/\s+/g, ' ').trim();
const ESTADOS = ['activo', 'pausado', 'archivado'];

export function crearEdicion(ctx: Contexto): Edicion {
  const { estado } = ctx;

  const exigirEdicion = (proyectoId: string | undefined): ProyectoEnMemoria => {
    const yo = ctx.yo();
    const p = estado.proyectos.find((x) => x.id === proyectoId);
    if (!p || !ctx.puedeEditar(yo, p.marcaId)) throw sinEdicion();
    return p;
  };

  const exigirPregunta = (id: string): { pregunta: PreguntaEnMemoria; proyecto: ProyectoEnMemoria } => {
    const pregunta = estado.preguntas.find((q) => q.id === id);
    if (!pregunta) throw sinEdicion();
    return { pregunta, proyecto: exigirEdicion(pregunta.proyectoId) };
  };

  const reemplazarCompetidores = (p: ProyectoEnMemoria, nuevos: string[]) => {
    for (const m of p.competidorIds) {
      ctx.registrar('proyecto_competidores', `${p.id}/${m}`, 'borrar', { proyectoId: p.id, marcaId: m }, null);
    }
    nuevos.forEach((m, i) =>
      ctx.registrar('proyecto_competidores', `${p.id}/${m}`, 'insertar', null, { proyectoId: p.id, marcaId: m, orden: i + 1 }),
    );
    p.competidorIds = nuevos;
  };

  const editarTexto = (preguntaId: string, texto: string): PreguntaEnMemoria => {
    const { pregunta, proyecto } = exigirPregunta(preguntaId);
    if (!pregunta.activa) throw invalido('Esa es una versión anterior de la pregunta.');
    const nuevoTexto = normalizar(texto ?? '');
    if (nuevoTexto === '') throw invalido('Escribe el texto de la pregunta.');
    if (nuevoTexto === normalizar(pregunta.texto)) return pregunta;
    const antes = structuredClone(pregunta);
    pregunta.activa = false;
    ctx.registrar('preguntas', pregunta.id, 'actualizar', antes, pregunta);
    const nueva: PreguntaEnMemoria = {
      ...pregunta,
      id: ctx.nuevoId(),
      proyectoId: proyecto.id,
      texto: nuevoTexto,
      version: pregunta.version + 1,
      activa: true,
      reemplazaA: pregunta.id,
    };
    estado.preguntas.push(nueva);
    ctx.registrar('preguntas', nueva.id, 'insertar', null, nueva);
    return nueva;
  };

  const renovarP2 = (p: ProyectoEnMemoria) => {
    const p2 = estado.preguntas.find((q) => q.proyectoId === p.id && q.activa && q.set === 'compat' && q.codigo === 'P2');
    const plantilla = estado.plantillas.find((t) => t.sectorId === null && t.codigo === 'P2');
    const marca = estado.marcas.find((m) => m.id === p.marcaId);
    const competidor = estado.marcas.find((m) => m.id === p.competidorPrincipalId);
    if (!p2 || !plantilla || !marca || !competidor) return;
    editarTexto(p2.id, plantilla.texto.replaceAll('{marca}', () => marca.nombre).replaceAll('{competidor}', () => competidor.nombre));
  };

  return {
    actualizarProyecto: (id, c) =>
      ctx.escribir(() => {
        const p = exigirEdicion(id);
        const x = c as Record<string, unknown>;
        if (typeof c !== 'object' || c === null || Array.isArray(c)) throw invalido('Los cambios no son válidos.');
        const hay = (k: string) => x[k] !== undefined;
        if (hay('muestras')) validarMuestras(x.muestras);
        if (hay('diaSemana')) validarDia(x.diaSemana);
        if (hay('cadencia')) validarCadencia(x.cadencia);
        if (hay('hora')) validarHora(x.hora);
        if (hay('topeGastoMensual')) {
          const t = x.topeGastoMensual;
          if (t !== null && typeof t !== 'number') throw invalido('El tope de gasto no es válido.');
          if (typeof t === 'number' && t < 0) throw invalido('El tope de gasto no puede ser negativo.');
        }
        if (hay('categoriasExtra')) {
          const e = x.categoriasExtra;
          if (!Array.isArray(e) || e.some((v) => typeof v !== 'string')) throw invalido('Las categorías extra no son válidas.');
        }
        if (hay('pesos')) {
          const w = x.pesos as Record<string, unknown> | null;
          if (typeof w !== 'object' || w === null || Array.isArray(w)) throw invalido('Los pesos no son válidos.');
          if (Object.keys(w).some((k) => !['1', '2', '3'].includes(k))) throw invalido('Los pesos solo van por puesto 1, 2 y 3.');
          for (const k of ['1', '2', '3']) {
            if (typeof w[k] !== 'number' || (w[k] as number) < 0) throw invalido('Cada peso debe ser un número de 0 en adelante.');
          }
        }
        if (hay('motorIds')) {
          const m = x.motorIds;
          if (!Array.isArray(m) || m.length < 1) throw invalido('Elige al menos un motor.');
          if (m.some((v) => !estado.motores.some((o) => o.id === v))) throw invalido('Hay un motor que no existe.');
        }
        if (hay('competidorPrincipalId') && !p.competidorIds.includes(x.competidorPrincipalId as string)) {
          throw invalido('El competidor principal debe ser uno de los competidores del proyecto.');
        }

        const antes = structuredClone(p);
        if (hay('muestras')) p.muestras = c.muestras!;
        if (hay('diaSemana')) p.diaSemana = c.diaSemana!;
        if (hay('cadencia')) p.cadencia = c.cadencia!;
        if (hay('hora')) p.hora = c.hora!;
        if (hay('topeGastoMensual')) p.topeGastoMensual = c.topeGastoMensual ?? null;
        if (hay('categoriasExtra')) p.categoriasExtra = [...c.categoriasExtra!];
        if (hay('pesos')) p.pesos = { 1: c.pesos![1], 2: c.pesos![2], 3: c.pesos![3] };
        if (hay('competidorPrincipalId')) p.competidorPrincipalId = c.competidorPrincipalId!;
        ctx.registrarSiCambia('proyectos', p.id, antes, p);
        if (hay('motorIds')) {
          for (const m of p.motorIds) ctx.registrar('proyecto_motores', `${p.id}/${m}`, 'borrar', { proyectoId: p.id, motorId: m }, null);
          p.motorIds = [...new Set(c.motorIds!)];
          for (const m of p.motorIds) ctx.registrar('proyecto_motores', `${p.id}/${m}`, 'insertar', null, { proyectoId: p.id, motorId: m });
        }
        if (hay('competidorPrincipalId') && p.competidorPrincipalId !== antes.competidorPrincipalId) renovarP2(p);
      }),

    cambiarCompetidores: (id, marcaIds) =>
      ctx.escribir(() => {
        const p = exigirEdicion(id);
        if (!Array.isArray(marcaIds) || marcaIds.length < 1 || marcaIds.length > 5) {
          throw new ErrorDatos('limite_competidores', 'Elige de 1 a 5 competidores.');
        }
        if (new Set(marcaIds).size !== marcaIds.length) throw invalido('Hay un competidor repetido.');
        if (marcaIds.includes(p.marcaId)) throw invalido('La marca no puede ser su propio competidor.');
        if (marcaIds.some((m) => !estado.marcas.some((x) => x.id === m && x.sectorId === p.sectorId))) {
          throw invalido('Un competidor no es del sector de la marca.');
        }
        const antes = structuredClone(p);
        reemplazarCompetidores(p, [...marcaIds]);
        const cambiaPrincipal = !p.competidorPrincipalId || !marcaIds.includes(p.competidorPrincipalId);
        if (cambiaPrincipal) p.competidorPrincipalId = marcaIds[0]!;
        ctx.registrarSiCambia('proyectos', p.id, antes, p);
        if (cambiaPrincipal) renovarP2(p);
      }),

    editarPregunta: (preguntaId, texto) => ctx.escribir(() => soloPregunta(editarTexto(preguntaId, texto))),

    agregarPregunta: (proyectoId, p) =>
      ctx.escribir(() => {
        const proyecto = exigirEdicion(proyectoId);
        if (!TIPOS_PREGUNTA.includes(p.tipo)) throw invalido('El tipo de pregunta no es válido.');
        const texto = normalizar(p.texto ?? '');
        if (texto === '') throw invalido('Escribe el texto de la pregunta.');
        const usados = estado.preguntas
          .filter((q) => q.proyectoId === proyecto.id && /^X[0-9]{1,9}$/.test(q.codigo))
          .map((q) => Number(q.codigo.slice(1)));
        const nueva: PreguntaEnMemoria = {
          id: ctx.nuevoId(),
          proyectoId: proyecto.id,
          codigo: `X${Math.max(0, ...usados) + 1}`,
          tipo: p.tipo,
          set: 'propia',
          categoria: p.categoria?.trim() || null,
          texto,
          version: 1,
          activa: true,
          reemplazaA: null,
        };
        estado.preguntas.push(nueva);
        ctx.registrar('preguntas', nueva.id, 'insertar', null, nueva);
        return soloPregunta(nueva);
      }),

    desactivarPregunta: (preguntaId) =>
      ctx.escribir(() => {
        const { pregunta, proyecto } = exigirPregunta(preguntaId);
        if (!pregunta.activa) return;
        if (!estado.preguntas.some((q) => q.proyectoId === proyecto.id && q.activa && q.id !== pregunta.id)) {
          throw invalido('El proyecto necesita al menos una pregunta activa.');
        }
        const antes = structuredClone(pregunta);
        pregunta.activa = false;
        ctx.registrar('preguntas', pregunta.id, 'actualizar', antes, pregunta);
      }),

    cambiarEstado: (id, nuevo) =>
      ctx.escribir(() => {
        const p = exigirEdicion(id);
        if (!ESTADOS.includes(nuevo)) throw invalido('El estado no es válido.');
        const antes = structuredClone(p);
        p.estado = nuevo;
        ctx.registrarSiCambia('proyectos', p.id, antes, p);
      }),
  };
}
