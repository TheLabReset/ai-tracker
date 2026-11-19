import { ErrorDatos, type Datos, type DatosAlta, type Proyecto, type ResumenProyecto } from '@lab/datos';
import { PESOS_EXCEL, claveMarca } from '@lab/nucleo';
import { conAliasOrdenados, insertarAlias, insertarMarca, insertarSector, reutilizarMarca } from './catalogo';
import {
  duplicado,
  esUuid,
  generico,
  idDe,
  invalido,
  porTexto,
  sinPermiso,
  type Contexto,
  type PreguntaEnMemoria,
  type ProyectoEnMemoria,
} from './contexto';
import { ponerMembresia } from './usuarios';
import { TIPOS_PREGUNTA, validarCadencia, validarDia, validarHora, validarMuestras, validarTope } from './validar';

type Proyectos = Pick<Datos, 'crearProyecto' | 'listarProyectos' | 'obtenerProyecto'>;

const SETS = ['compat', 'extendido', 'propia'];

const solo = (p: PreguntaEnMemoria) => ({ id: p.id, codigo: p.codigo, tipo: p.tipo, set: p.set, categoria: p.categoria, texto: p.texto, version: p.version });
export const soloPregunta = solo;

function validarAlta(ctx: Contexto, d: DatosAlta) {
  const { estado } = ctx;
  const competidores: unknown = d.competidores ?? [];
  if (!Array.isArray(competidores) || competidores.length < 1 || competidores.length > 5) {
    throw new ErrorDatos('limite_competidores', 'Elige de 1 a 5 competidores.');
  }
  if (!Array.isArray(d.motorIds) || d.motorIds.length < 1) throw invalido('Elige al menos un motor.');
  if (!Array.isArray(d.preguntas) || d.preguntas.length < 1) throw invalido('Agrega al menos una pregunta.');
  const p: unknown = d.competidorPrincipal;
  if (typeof p !== 'number' || !Number.isInteger(p) || p < 0 || p > competidores.length - 1) {
    throw invalido('El competidor principal no es válido.');
  }
  if (d.muestras !== undefined) validarMuestras(d.muestras);
  if (d.diaSemana !== undefined) validarDia(d.diaSemana);
  validarCadencia(d.cadencia ?? 'semanal');
  validarHora(d.hora ?? '07:00');
  validarTope(d.topeGastoMensual);
  if (d.motorIds.some((m) => !estado.motores.some((x) => x.id === m))) throw invalido('Hay un motor que no existe.');
  if ('id' in d.sector && !estado.sectores.some((s) => s.id === (d.sector as { id: string }).id)) throw invalido('El sector no existe.');
  const sectorId = 'id' in d.sector ? d.sector.id : null;
  for (const c of d.competidores) {
    if ('id' in c && (sectorId === null || !estado.marcas.some((m) => m.id === c.id && m.sectorId === sectorId))) {
      throw invalido('Un competidor no es del sector de la marca.');
    }
  }
}

export function crearProyecto(ctx: Contexto, d: DatosAlta): string {
  const yo = ctx.yo();
  const { estado } = ctx;
  if (!ctx.puedeAmpliar(yo)) {
    throw new ErrorDatos('sin_permiso', 'Solo un admin o un líder puede dar de alta una marca.');
  }
  const liderPedido = d.liderId || undefined;
  const liderId = yo.admin ? liderPedido : idDe(yo);
  const responsableId = d.responsableId || undefined;
  if ([liderPedido, responsableId].some((v) => v && !esUuid(v))) throw generico();
  if (!yo.admin && liderPedido && liderPedido !== idDe(yo)) {
    throw new ErrorDatos('sin_permiso', 'Solo un admin puede asignar a otra persona como líder.');
  }
  if (liderId && !estado.usuarios.some((u) => idDe(u) === liderId)) throw invalido('No encontramos al líder.');
  if (responsableId && !estado.usuarios.some((u) => idDe(u) === responsableId)) throw invalido('No encontramos al responsable.');
  validarAlta(ctx, d);

  const sector = 'id' in d.sector ? estado.sectores.find((s) => s.id === (d.sector as { id: string }).id)! : insertarSector(ctx, d.sector);
  const nuevoSector = !('id' in d.sector);
  const existente = nuevoSector
    ? undefined
    : estado.marcas.find((m) => m.sectorId === sector.id && claveMarca(m.nombre) === claveMarca(d.marca.nombre));
  let marca;
  if (existente) {
    if (estado.proyectos.some((p) => p.marcaId === existente.id)) throw invalido(`«${existente.nombre}» ya tiene su proyecto.`);
    reutilizarMarca(ctx, existente, { empresaId: d.marca.empresaId, ambiguo: d.marca.ambiguo, dominios: d.marca.dominios });
    marca = existente;
  } else {
    marca = insertarMarca(ctx, sector.id, { ...d.marca, alias: [] }, { empresaId: d.marca.empresaId });
  }
  for (const a of d.marca.alias ?? []) {
    if (!marca.alias.some((x) => claveMarca(x.texto) === claveMarca(a.texto))) insertarAlias(ctx, marca.id, a);
  }

  const competidorIds: string[] = [];
  for (const c of d.competidores) {
    const id = 'id' in c ? c.id : insertarMarca(ctx, sector.id, c).id;
    if (id === marca.id) throw invalido('La marca no puede ser su propio competidor.');
    competidorIds.push(id);
  }
  if (new Set(competidorIds).size !== competidorIds.length) throw duplicado();

  const proyecto: ProyectoEnMemoria = {
    id: ctx.nuevoId(),
    marcaId: marca.id,
    sectorId: sector.id,
    categoriasExtra: [...(d.categoriasExtra ?? [])],
    competidorIds,
    competidorPrincipalId: competidorIds[d.competidorPrincipal] ?? null,
    motorIds: [...new Set(d.motorIds)],
    cadencia: d.cadencia ?? 'semanal',
    diaSemana: d.diaSemana ?? 3,
    hora: d.hora ?? '07:00',
    muestras: d.muestras ?? 3,
    pesos: { ...PESOS_EXCEL },
    topeGastoMensual: typeof d.topeGastoMensual === 'number' ? d.topeGastoMensual : null,
    estado: 'activo',
    creadoPor: idDe(yo),
  };
  estado.proyectos.push(proyecto);
  ctx.registrar('proyectos', proyecto.id, 'insertar', null, proyecto);
  competidorIds.forEach((m, i) =>
    ctx.registrar('proyecto_competidores', `${proyecto.id}/${m}`, 'insertar', null, { proyectoId: proyecto.id, marcaId: m, orden: i + 1 }),
  );
  for (const m of proyecto.motorIds) {
    ctx.registrar('proyecto_motores', `${proyecto.id}/${m}`, 'insertar', null, { proyectoId: proyecto.id, motorId: m });
  }
  for (const q of d.preguntas) {
    if (!TIPOS_PREGUNTA.includes(q.tipo) || !SETS.includes(q.set) || q.codigo.trim() === '' || q.texto.trim() === '') throw generico();
    if (estado.preguntas.some((x) => x.proyectoId === proyecto.id && x.codigo === q.codigo && x.version === 1)) throw duplicado();
    const pregunta: PreguntaEnMemoria = {
      id: ctx.nuevoId(),
      proyectoId: proyecto.id,
      codigo: q.codigo,
      tipo: q.tipo,
      set: q.set,
      categoria: q.categoria,
      texto: q.texto,
      version: 1,
      activa: true,
      reemplazaA: null,
    };
    estado.preguntas.push(pregunta);
    ctx.registrar('preguntas', pregunta.id, 'insertar', null, pregunta);
  }
  if (liderId) ponerMembresia(ctx, liderId, marca.id, 'lider', false);
  if (responsableId && responsableId !== liderId) ponerMembresia(ctx, responsableId, marca.id, 'responsable', false);
  return proyecto.id;
}

export function crearProyectos(ctx: Contexto): Proyectos {
  const { estado } = ctx;
  const nombreMarca = (id: string) => conAliasOrdenados(estado.marcas.find((m) => m.id === id)!);

  return {
    crearProyecto: (d) => ctx.escribir(() => crearProyecto(ctx, d)),

    listarProyectos: () =>
      ctx.leer((yo) =>
        estado.proyectos
          .flatMap((p): ResumenProyecto[] => {
            const rol = ctx.membresiasDe(yo).find((m) => m.marcaId === p.marcaId)?.rol ?? (yo.admin ? 'admin' : undefined);
            if (!rol) return [];
            return [
              {
                id: p.id,
                marcaNombre: nombreMarca(p.marcaId).nombre,
                sectorNombre: estado.sectores.find((s) => s.id === p.sectorId)?.nombre ?? '',
                estado: p.estado,
                miRol: rol,
              },
            ];
          })
          .sort((a, b) => porTexto(a.marcaNombre, b.marcaNombre)),
      ),

    obtenerProyecto: (id) =>
      ctx.leer((yo): Proyecto => {
        const p = estado.proyectos.find((x) => x.id === id);
        if (!p || !ctx.puedeVer(yo, p.marcaId)) throw sinPermiso();
        return {
          id: p.id,
          marca: nombreMarca(p.marcaId),
          sector: estado.sectores.find((s) => s.id === p.sectorId)!,
          categoriasExtra: p.categoriasExtra,
          competidores: p.competidorIds.map(nombreMarca),
          competidorPrincipalId: p.competidorPrincipalId,
          motores: estado.motores.filter((m) => p.motorIds.includes(m.id)),
          preguntas: estado.preguntas
            .filter((q) => q.proyectoId === p.id && q.activa)
            .sort((a, b) => (a.codigo < b.codigo ? -1 : a.codigo > b.codigo ? 1 : 0))
            .map(solo),
          cadencia: p.cadencia,
          diaSemana: p.diaSemana,
          hora: p.hora,
          muestras: p.muestras,
          pesos: p.pesos,
          topeGastoMensual: p.topeGastoMensual,
          estado: p.estado,
        };
      }),
  };
}
