import type { Datos, DatosAlta } from '@lab/datos';
import { describe, expect, it } from 'vitest';
import { crearDatosEnMemoria, idDeUsuario, motoresIniciales } from './ayudas/datos-en-memoria';

const ADMIN = 'admin@reset.com.pe';
const LIDER = 'lider@reset.com.pe';
const OTRO = 'otro@wanted.pe';

function montar() {
  const d = crearDatosEnMemoria({
    usuarios: [
      { correo: ADMIN, clave: 'secreta', admin: true },
      { correo: LIDER, clave: 'secreta' },
      { correo: OTRO, clave: 'secreta' },
    ],
  });
  d.estado.sesion = ADMIN;
  return d;
}

async function conSesion<T>(d: ReturnType<typeof montar>, correo: string, accion: () => Promise<T>) {
  const previa = d.estado.sesion;
  d.estado.sesion = correo;
  try {
    return await accion();
  } finally {
    d.estado.sesion = previa;
  }
}

const codigoDe = (p: Promise<unknown>) => p.then(() => null, (e) => ({ codigo: e.codigo, mensaje: e.message }));

async function sectorConMarcas(d: Datos) {
  const sector = await d.crearSector({ nombre: 'Seguros', categoria: 'seguros' });
  const a = await d.crearMarca(sector.id, { nombre: 'Rimac', ambiguo: false, alias: [], dominios: [] });
  const b = await d.crearMarca(sector.id, { nombre: 'Pacifico', ambiguo: false, alias: [{ texto: 'PS', ambiguo: false }], dominios: [] });
  return { sector, a, b };
}

function alta(sectorId: string, competidores: string[], extra: Partial<DatosAlta> = {}): DatosAlta {
  return {
    marca: { nombre: 'Interseguro', ambiguo: false, alias: [], dominios: ['interseguro.pe'], empresaId: 'reset' },
    sector: { id: sectorId },
    categoriasExtra: [],
    competidores: competidores.map((id) => ({ id })),
    competidorPrincipal: 0,
    preguntas: [
      { codigo: 'P1', tipo: 'descubrimiento', set: 'compat', categoria: null, texto: '¿Qué seguro me recomiendas?' },
      { codigo: 'P2', tipo: 'marca', set: 'compat', categoria: null, texto: '¿Qué opinan de Interseguro?' },
    ],
    motorIds: [],
    cadencia: 'semanal',
    diaSemana: 3,
    hora: '07:00',
    muestras: 3,
    topeGastoMensual: null,
    ...extra,
  };
}

describe('datos en memoria: sesión', () => {
  it('rechaza un dominio no permitido antes de mirar nada más', async () => {
    const d = montar();
    expect(await codigoDe(d.entrar('ana@gmail.com', 'x'))).toEqual({ codigo: 'correo_no_permitido', mensaje: 'Usa tu correo de Reset o Wanted.' });
    expect(await codigoDe(d.pedirRecuperacion('ana@gmail.com'))).toMatchObject({ codigo: 'correo_no_permitido' });
  });

  it('clave mala da credenciales y la buena devuelve el perfil', async () => {
    const d = montar();
    expect(await codigoDe(d.entrar(ADMIN, 'mala'))).toEqual({ codigo: 'credenciales', mensaje: 'Correo o clave incorrectos.' });
    const perfil = await d.entrar('Admin@RESET.com.pe', 'secreta');
    expect(perfil).toMatchObject({ correo: ADMIN, empresaId: 'reset', esAdmin: true, membresias: [] });
    expect(await d.sesionActual()).toEqual(perfil);
    await d.salir();
    expect(d.estado.sesion).toBeNull();
    expect(await d.sesionActual()).toBeNull();
  });

  it('sin sesión, lo que la necesita da sin_permiso', async () => {
    const d = montar();
    d.estado.sesion = null;
    expect(await codigoDe(d.listarSectores())).toEqual({ codigo: 'sin_permiso', mensaje: 'Tu sesión terminó. Vuelve a entrar.' });
  });

  it('registra la recuperación y la clave nueva', async () => {
    const d = montar();
    await d.pedirRecuperacion(' ana@reset.com.pe ');
    await d.crearClave('nueva-clave');
    expect(d.estado.recuperaciones).toEqual(['ana@reset.com.pe']);
    expect(d.estado.clavesNuevas).toEqual(['nueva-clave']);
  });
});

describe('datos en memoria: usuarios', () => {
  it('directorio para cualquiera; listado y cambios solo para el admin', async () => {
    const d = montar();
    await conSesion(d, LIDER, async () => {
      expect(await d.listarDirectorio()).toHaveLength(3);
      expect(await codigoDe(d.listarUsuarios())).toEqual({ codigo: 'sin_permiso', mensaje: 'Solo un admin puede hacer esto.' });
      expect(await codigoDe(d.cambiarAdmin(idDeUsuario(d, LIDER), true))).toEqual({ codigo: 'sin_permiso', mensaje: 'Solo un admin puede cambiar esto.' });
      expect(await codigoDe(d.asignarMembresia(idDeUsuario(d, LIDER), 'x', 'lider'))).toMatchObject({ codigo: 'sin_permiso' });
      expect(await codigoDe(d.quitarMembresia(idDeUsuario(d, LIDER), 'x'))).toMatchObject({ codigo: 'sin_permiso' });
    });
  });

  it('asigna, lista con nombre de marca y quita membresías; cambiarAdmin(false) lo quita de la lista', async () => {
    const d = montar();
    const { a } = await sectorConMarcas(d);
    await d.asignarMembresia(idDeUsuario(d, LIDER), a.id, 'lector');
    await d.asignarMembresia(idDeUsuario(d, LIDER), a.id, 'lider');
    const lider = (await d.listarUsuarios()).find((u) => u.id === idDeUsuario(d, LIDER))!;
    expect(lider.membresias).toEqual([{ marcaId: a.id, marcaNombre: 'Rimac', rol: 'lider' }]);
    await d.quitarMembresia(idDeUsuario(d, LIDER), a.id);
    expect((await d.listarUsuarios()).find((u) => u.id === idDeUsuario(d, LIDER))!.membresias).toEqual([]);
    await d.cambiarAdmin(idDeUsuario(d, ADMIN), false);
    expect(d.estado.admins).not.toContain(ADMIN);
    expect(await codigoDe(d.listarUsuarios())).toMatchObject({ codigo: 'sin_permiso' });
  });
});

describe('datos en memoria: catálogo', () => {
  it('sector repetido da el texto de la base', async () => {
    const d = montar();
    await d.crearSector({ nombre: 'Seguros', categoria: 'seguros' });
    expect(await codigoDe(d.crearSector({ nombre: 'Seguros', categoria: 'otra' }))).toEqual({
      codigo: 'datos_invalidos',
      mensaje: 'Ya existe un sector con ese nombre.',
    });
  });

  it('colisión de nombre o alias en el sector nombra la otra marca y no deja nada a medias', async () => {
    const d = montar();
    const { sector, a, b } = await sectorConMarcas(d);
    expect(await codigoDe(d.crearMarca(sector.id, { nombre: 'ps', ambiguo: false, alias: [], dominios: [] }))).toEqual({
      codigo: 'colision_alias',
      mensaje: '«ps» ya es de Pacifico',
    });
    const antes = (await d.listarMarcas(sector.id)).length;
    expect(
      await codigoDe(d.crearMarca(sector.id, { nombre: 'Nueva', ambiguo: false, alias: [{ texto: ' R I mac', ambiguo: false }], dominios: [] })),
    ).toEqual({ codigo: 'colision_alias', mensaje: '« R I mac» ya es de Rimac' });
    expect(await d.listarMarcas(sector.id)).toHaveLength(antes);
    expect(await codigoDe(d.agregarAlias(a.id, { texto: 'Pacífico', ambiguo: false }))).toMatchObject({ codigo: 'colision_alias' });
    const alias = await d.agregarAlias(b.id, { texto: 'Aaa', ambiguo: true });
    expect((await d.listarMarcas(sector.id)).map((m) => m.nombre)).toEqual(['Pacifico', 'Rimac']);
    expect((await d.listarMarcas(sector.id))[0]!.alias.map((x) => x.texto)).toEqual(['Aaa', 'PS']);
    await d.quitarAlias(alias.id);
    expect((await d.listarMarcas(sector.id))[0]!.alias).toHaveLength(1);
  });

  it('el alta pide admin o algún líder', async () => {
    const d = montar();
    await conSesion(d, OTRO, async () => {
      expect(await codigoDe(d.crearSector({ nombre: 'X', categoria: 'x' }))).toEqual({
        codigo: 'sin_permiso',
        mensaje: 'No tienes permiso para hacer esto.',
      });
      expect(await d.listarSectores()).toEqual([]);
    });
  });

  it('devuelve copias que no tocan el almacén', async () => {
    const d = montar();
    const { sector } = await sectorConMarcas(d);
    const marcas = await d.listarMarcas(sector.id);
    marcas[0]!.nombre = 'Cambiado';
    expect((await d.listarMarcas(sector.id))[0]!.nombre).toBe('Pacifico');
  });
});

describe('datos en memoria: motores y plantillas', () => {
  it('trae los 4 motores y guarda historial solo si cambia modelo o búsqueda web', async () => {
    const d = montar();
    const motores = await d.listarMotores();
    expect(motores.map((m) => [m.codigo, m.nombre, m.proveedor])).toEqual([
      ['chatgpt', 'ChatGPT', 'OpenAI'],
      ['gemini', 'Gemini', 'Google'],
      ['claude', 'Claude', 'Anthropic'],
      ['perplexity', 'Perplexity', 'Perplexity'],
    ]);
    expect(motoresIniciales()[0]).toMatchObject({ modelo: null, costoEstimado: null, busquedaWeb: true, activo: true });
    const id = motores[0]!.id;
    await d.actualizarMotor(id, { costoEstimado: 5 });
    expect(await d.historialMotor(id)).toEqual([]);
    const m1 = await d.actualizarMotor(id, { modelo: 'gpt-a' });
    const m2 = await d.actualizarMotor(id, { busquedaWeb: false });
    expect(await d.historialMotor(id)).toEqual([
      { modelo: 'gpt-a', busquedaWeb: true, vigenteHasta: m2.vigenteDesde },
      { modelo: null, busquedaWeb: true, vigenteHasta: m1.vigenteDesde },
    ]);
    expect(m2.vigenteDesde > m1.vigenteDesde).toBe(true);
    await conSesion(d, LIDER, async () => {
      expect(await codigoDe(d.actualizarMotor(id, { activo: false }))).toMatchObject({ codigo: 'sin_permiso' });
    });
  });

  it('ordena globales primero y valida variables y código repetido', async () => {
    const d = montar();
    const sector = await d.crearSector({ nombre: 'Seguros', categoria: 'seguros' });
    await d.crearPlantilla({ codigo: 'A1', sectorId: sector.id, tipo: 'marca', texto: 'Sobre {marca}' });
    expect((await d.listarPlantillas(sector.id)).map((p) => p.codigo)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'A1']);
    expect((await d.listarPlantillas()).map((p) => p.codigo)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5']);
    expect(await codigoDe(d.crearPlantilla({ codigo: 'A2', sectorId: sector.id, tipo: 'marca', texto: 'Hola {zzz}' }))).toEqual({
      codigo: 'datos_invalidos',
      mensaje: 'La variable {zzz} no existe',
    });
    expect(await codigoDe(d.crearPlantilla({ codigo: 'A1', sectorId: sector.id, tipo: 'marca', texto: 'x' }))).toEqual({
      codigo: 'datos_invalidos',
      mensaje: 'Ya hay una plantilla con ese código.',
    });
    await conSesion(d, OTRO, async () => {
      expect(await codigoDe(d.crearPlantilla({ codigo: 'B', sectorId: sector.id, tipo: 'marca', texto: 'x' }))).toMatchObject({ codigo: 'sin_permiso' });
    });
  });
});

describe('datos en memoria: proyectos', () => {
  it('el alta por quien no es admin ni líder da sin_permiso antes de validar', async () => {
    const d = montar();
    const { sector } = await sectorConMarcas(d);
    await conSesion(d, OTRO, async () => {
      expect(await codigoDe(d.crearProyecto(alta(sector.id, [])))).toEqual({
        codigo: 'sin_permiso',
        mensaje: 'Solo un admin o un líder puede dar de alta una marca.',
      });
    });
  });

  it('valida competidores, motores y rangos con los textos de la base', async () => {
    const d = montar();
    const { sector, a, b } = await sectorConMarcas(d);
    const motor = (await d.listarMotores())[0]!.id;
    const seis = Array.from({ length: 6 }, () => a.id);
    expect(await codigoDe(d.crearProyecto(alta(sector.id, seis, { motorIds: [motor] })))).toEqual({
      codigo: 'limite_competidores',
      mensaje: 'Elige de 1 a 5 competidores.',
    });
    expect(await codigoDe(d.crearProyecto(alta(sector.id, [a.id])))).toEqual({ codigo: 'datos_invalidos', mensaje: 'Elige al menos un motor.' });
    expect(await codigoDe(d.crearProyecto(alta(sector.id, [a.id], { motorIds: [motor], muestras: 11 })))).toMatchObject({
      mensaje: 'Las muestras van de 1 a 10.',
    });
    expect(await codigoDe(d.crearProyecto(alta(sector.id, [a.id], { motorIds: [motor], diaSemana: 7 })))).toMatchObject({
      mensaje: 'El día de la semana va de 0 a 6.',
    });
    expect(await codigoDe(d.crearProyecto(alta(sector.id, [a.id, b.id], { motorIds: [motor], competidorPrincipal: 2 })))).toMatchObject({
      mensaje: 'El competidor principal no es válido.',
    });
    expect(await codigoDe(d.crearProyecto(alta(sector.id, ['x'], { motorIds: [motor] })))).toMatchObject({
      mensaje: 'Un competidor no es del sector de la marca.',
    });
    expect(d.estado.proyectos).toEqual([]);
    expect(d.estado.marcas).toHaveLength(2);
  });

  it('un error a mitad del alta no deja nada creado', async () => {
    const d = montar();
    const { sector, a } = await sectorConMarcas(d);
    const motor = (await d.listarMotores())[0]!.id;
    const datos = alta(sector.id, [a.id], { motorIds: [motor] });
    datos.competidores.push({ nombre: 'Rimac', ambiguo: false, alias: [], dominios: [] });
    expect(await codigoDe(d.crearProyecto(datos))).toMatchObject({ codigo: 'colision_alias' });
    expect(d.estado.marcas).toHaveLength(2);
    expect(d.estado.proyectos).toEqual([]);
    expect(d.estado.bitacora.filter((e) => e.entidad === 'marcas')).toHaveLength(2);
  });

  it('crea con defaults, sector nuevo y membresías; reutiliza la marca del catálogo', async () => {
    const d = montar();
    const { sector, a, b } = await sectorConMarcas(d);
    const [motor] = await d.listarMotores();
    const reuso = await d.crearProyecto(
      alta(sector.id, [a.id], {
        motorIds: [motor!.id],
        marca: { nombre: ' pacifico', ambiguo: true, alias: [{ texto: 'PS', ambiguo: false }, { texto: 'Pac', ambiguo: false }], dominios: ['pacifico.pe'], empresaId: 'wanted' },
        liderId: idDeUsuario(d, LIDER),
        responsableId: idDeUsuario(d, OTRO),
      }),
    );
    expect(d.estado.marcas).toHaveLength(2);
    const p = await d.obtenerProyecto(reuso);
    expect(p.marca).toMatchObject({ id: b.id, esCliente: true, empresaId: 'wanted', ambiguo: true, dominios: ['pacifico.pe'] });
    expect(p.marca.alias.map((x) => x.texto)).toEqual(['PS', 'Pac']);
    expect(p).toMatchObject({ muestras: 3, cadencia: 'semanal', diaSemana: 3, hora: '07:00', pesos: { 1: 3, 2: 2, 3: 1 }, estado: 'activo', topeGastoMensual: null });
    expect(p.competidorPrincipalId).toBe(a.id);
    const usuarios = await d.listarUsuarios();
    expect(usuarios.find((u) => u.id === idDeUsuario(d, LIDER))!.membresias[0]).toMatchObject({ rol: 'lider', marcaNombre: 'Pacifico' });
    expect(usuarios.find((u) => u.id === idDeUsuario(d, OTRO))!.membresias[0]).toMatchObject({ rol: 'responsable' });
    expect(await codigoDe(d.crearProyecto(alta(sector.id, [a.id], { motorIds: [motor!.id], marca: { nombre: 'PACÍFICO', ambiguo: false, alias: [], dominios: [], empresaId: 'reset' } })))).toEqual({
      codigo: 'datos_invalidos',
      mensaje: '«Pacifico» ya tiene su proyecto.',
    });
  });

  it('sector nuevo por nombre; un líder queda de líder y no puede nombrar a otro', async () => {
    const d = montar();
    const { sector, a } = await sectorConMarcas(d);
    await d.asignarMembresia(idDeUsuario(d, LIDER), a.id, 'lider');
    const motor = (await d.listarMotores())[0]!.id;
    await conSesion(d, LIDER, async () => {
      expect(await codigoDe(d.crearProyecto(alta(sector.id, [a.id], { motorIds: [motor], liderId: idDeUsuario(d, OTRO) })))).toEqual({
        codigo: 'sin_permiso',
        mensaje: 'Solo un admin puede asignar a otra persona como líder.',
      });
      const id = await d.crearProyecto({
        ...alta(sector.id, [], { motorIds: [motor] }),
        sector: { nombre: 'Bancos', categoria: 'bancos' },
        competidores: [{ nombre: 'BCP', ambiguo: false, alias: [], dominios: [] }],
      });
      const p = await d.obtenerProyecto(id);
      expect(p.sector.nombre).toBe('Bancos');
      expect(p.competidores.map((c) => c.nombre)).toEqual(['BCP']);
      expect((await d.listarProyectos())[0]).toMatchObject({ marcaNombre: 'Interseguro', miRol: 'lider' });
    });
  });

  it('listarProyectos y obtenerProyecto esconden lo ajeno', async () => {
    const d = montar();
    const { sector, a } = await sectorConMarcas(d);
    const motor = (await d.listarMotores())[0]!.id;
    const id = await d.crearProyecto(alta(sector.id, [a.id], { motorIds: [motor] }));
    expect(await d.listarProyectos()).toEqual([{ id, marcaNombre: 'Interseguro', sectorNombre: 'Seguros', estado: 'activo', miRol: 'admin' }]);
    await conSesion(d, OTRO, async () => {
      expect(await d.listarProyectos()).toEqual([]);
      expect(await codigoDe(d.obtenerProyecto(id))).toMatchObject({ codigo: 'sin_permiso' });
    });
  });
});

describe('datos en memoria: edición', () => {
  async function conProyecto() {
    const d = montar();
    const { sector, a, b } = await sectorConMarcas(d);
    const motor = (await d.listarMotores())[0]!.id;
    const id = await d.crearProyecto(alta(sector.id, [a.id], { motorIds: [motor] }));
    const p = await d.obtenerProyecto(id);
    return { d, id, p, a, b, sector, motor };
  }

  it('toda edición pide admin o líder de esa marca, también con ids que no existen', async () => {
    const { d, id, p } = await conProyecto();
    await d.asignarMembresia(idDeUsuario(d, OTRO), p.marca.id, 'responsable');
    await conSesion(d, OTRO, async () => {
      const esperado = { codigo: 'sin_permiso', mensaje: 'No tienes permiso para editar este proyecto.' };
      expect(await codigoDe(d.cambiarEstado(id, 'pausado'))).toEqual(esperado);
      expect(await codigoDe(d.actualizarProyecto(id, { muestras: 4 }))).toEqual(esperado);
      expect(await codigoDe(d.cambiarCompetidores(id, []))).toEqual(esperado);
      expect(await codigoDe(d.agregarPregunta(id, { tipo: 'marca', texto: 'x', categoria: null }))).toEqual(esperado);
      expect(await codigoDe(d.editarPregunta(p.preguntas[0]!.id, 'x'))).toEqual(esperado);
      expect(await codigoDe(d.desactivarPregunta('no-existe'))).toEqual(esperado);
      expect(await codigoDe(d.cambiarEstado('no-existe', 'pausado'))).toEqual(esperado);
    });
  });

  it('editar con espacios de más no crea versión; una edición real crea la v2', async () => {
    const { d, id, p } = await conProyecto();
    const q = p.preguntas[0]!;
    const misma = await d.editarPregunta(q.id, `  ${q.texto.replace(' ', '   ')}  `);
    expect(misma).toEqual(q);
    const v2 = await d.editarPregunta(q.id, '  Otro   texto ');
    expect(v2).toMatchObject({ codigo: 'P1', version: 2, texto: 'Otro texto' });
    expect(d.estado.preguntas.find((x) => x.id === q.id)).toMatchObject({ activa: false });
    expect(d.estado.preguntas.find((x) => x.id === v2.id)).toMatchObject({ reemplazaA: q.id });
    expect((await d.obtenerProyecto(id)).preguntas.map((x) => [x.codigo, x.version])).toEqual([['P1', 2], ['P2', 1]]);
    expect(await codigoDe(d.editarPregunta(q.id, 'algo'))).toEqual({ codigo: 'datos_invalidos', mensaje: 'Esa es una versión anterior de la pregunta.' });
    expect(await codigoDe(d.editarPregunta(v2.id, '  \n '))).toEqual({ codigo: 'datos_invalidos', mensaje: 'Escribe el texto de la pregunta.' });
  });

  it('agrega X1, X2 aunque haya versiones inactivas y no deja desactivar la última', async () => {
    const { d, id, p } = await conProyecto();
    const x1 = await d.agregarPregunta(id, { tipo: 'descubrimiento', texto: ' Mi   pregunta ', categoria: ' ' });
    expect(x1).toMatchObject({ codigo: 'X1', set: 'propia', texto: 'Mi pregunta', categoria: null, version: 1 });
    const x1b = await d.editarPregunta(x1.id, 'Otra');
    expect(x1b.codigo).toBe('X1');
    expect((await d.agregarPregunta(id, { tipo: 'marca', texto: 'z', categoria: 'c' })).codigo).toBe('X2');
    await d.desactivarPregunta(x1b.id);
    await d.desactivarPregunta(p.preguntas[0]!.id);
    await d.desactivarPregunta(p.preguntas[1]!.id);
    expect(await codigoDe(d.desactivarPregunta((await d.obtenerProyecto(id)).preguntas[0]!.id))).toEqual({
      codigo: 'datos_invalidos',
      mensaje: 'El proyecto necesita al menos una pregunta activa.',
    });
  });

  it('cambia competidores (1 a 5, orden, principal) y valida', async () => {
    const { d, id, a, b, sector } = await conProyecto();
    const c = await d.crearMarca(sector.id, { nombre: 'La Positiva', ambiguo: false, alias: [], dominios: [] });
    await d.cambiarCompetidores(id, [b.id, c.id]);
    let p = await d.obtenerProyecto(id);
    expect(p.competidores.map((x) => x.id)).toEqual([b.id, c.id]);
    expect(p.competidorPrincipalId).toBe(b.id);
    await d.actualizarProyecto(id, { competidorPrincipalId: c.id });
    await d.cambiarCompetidores(id, [a.id, c.id]);
    p = await d.obtenerProyecto(id);
    expect(p.competidorPrincipalId).toBe(c.id);
    await d.cambiarCompetidores(id, [a.id]);
    expect((await d.obtenerProyecto(id)).competidorPrincipalId).toBe(a.id);
    expect(await codigoDe(d.cambiarCompetidores(id, []))).toEqual({ codigo: 'limite_competidores', mensaje: 'Elige de 1 a 5 competidores.' });
    expect(await codigoDe(d.cambiarCompetidores(id, [a.id, a.id]))).toMatchObject({ mensaje: 'Hay un competidor repetido.' });
    expect(await codigoDe(d.cambiarCompetidores(id, [p.marca.id]))).toMatchObject({ mensaje: 'La marca no puede ser su propio competidor.' });
  });

  it('actualiza ajustes con las validaciones de la base y cambia el estado', async () => {
    const { d, id, motor } = await conProyecto();
    await d.actualizarProyecto(id, { muestras: 5, hora: '09:30', cadencia: 'manual', topeGastoMensual: 10, pesos: { 1: 5, 2: 1, 3: 0 }, categoriasExtra: ['x'], motorIds: [motor, motor] });
    expect(await d.obtenerProyecto(id)).toMatchObject({ muestras: 5, hora: '09:30', cadencia: 'manual', topeGastoMensual: 10, pesos: { 1: 5, 2: 1, 3: 0 }, categoriasExtra: ['x'] });
    expect((await d.obtenerProyecto(id)).motores).toHaveLength(1);
    const casos: Array<[Parameters<Datos['actualizarProyecto']>[1], string]> = [
      [{ muestras: 0 }, 'Las muestras van de 1 a 10.'],
      [{ hora: '25:00' }, 'La hora no es válida.'],
      [{ topeGastoMensual: -1 }, 'El tope de gasto no puede ser negativo.'],
      [{ motorIds: [] }, 'Elige al menos un motor.'],
      [{ motorIds: ['zzz'] }, 'Hay un motor que no existe.'],
      [{ competidorPrincipalId: 'zzz' }, 'El competidor principal debe ser uno de los competidores del proyecto.'],
    ];
    for (const [cambios, mensaje] of casos) expect(await codigoDe(d.actualizarProyecto(id, cambios))).toEqual({ codigo: 'datos_invalidos', mensaje });
    await d.cambiarEstado(id, 'archivado');
    expect((await d.listarProyectos())[0]!.estado).toBe('archivado');
    expect(await codigoDe(d.cambiarEstado(id, 'raro' as never))).toMatchObject({ mensaje: 'El estado no es válido.' });
  });
});

describe('datos en memoria: bitácora', () => {
  it('solo el admin la lee; viene al revés, filtrada y con límite', async () => {
    const d = montar();
    const sector = await d.crearSector({ nombre: 'Seguros', categoria: 'seguros' });
    await d.crearMarca(sector.id, { nombre: 'Rimac', ambiguo: false, alias: [{ texto: 'R', ambiguo: false }], dominios: [] });
    const todo = await d.listarBitacora();
    expect(todo.map((e) => [e.entidad, e.accion])).toEqual([
      ['alias', 'insertar'],
      ['marcas', 'insertar'],
      ['sectores', 'insertar'],
    ]);
    expect(todo[0]!.usuarioCorreo).toBe(ADMIN);
    expect(todo[0]!.fecha > todo[1]!.fecha).toBe(true);
    expect(await d.listarBitacora({ entidad: 'marcas' })).toHaveLength(1);
    expect(await d.listarBitacora({ limite: 2 })).toHaveLength(2);
    await d.asignarMembresia(idDeUsuario(d, LIDER), (await d.listarMarcas(sector.id))[0]!.id, 'lider');
    await d.quitarMembresia(idDeUsuario(d, LIDER), (await d.listarMarcas(sector.id))[0]!.id);
    expect((await d.listarBitacora({ entidad: 'membresias' })).map((e) => e.accion)).toEqual(['borrar', 'insertar']);
    await conSesion(d, LIDER, async () => {
      expect(await codigoDe(d.listarBitacora())).toEqual({ codigo: 'sin_permiso', mensaje: 'Solo un admin puede hacer esto.' });
    });
  });
});

describe('datos en memoria: ids y validaciones de la base', () => {
  it('los ids de usuario son uuid y un correo no vale como id', async () => {
    const d = montar();
    const { a } = await sectorConMarcas(d);
    const id = idDeUsuario(d, LIDER);
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect((await d.listarDirectorio()).map((u) => u.id)).toContain(id);
    expect((await d.sesionActual())!.id).toBe(idDeUsuario(d, ADMIN));
    const invalido = { codigo: 'datos_invalidos', mensaje: 'Los datos no son válidos.' };
    expect(await codigoDe(d.asignarMembresia(LIDER, a.id, 'lider'))).toEqual(invalido);
    expect(await codigoDe(d.cambiarAdmin(LIDER, true))).toEqual(invalido);
    expect(await codigoDe(d.cambiarAdmin(crypto.randomUUID(), true))).toEqual({ codigo: 'datos_invalidos', mensaje: 'No encontramos a esa persona.' });
    const motor = (await d.listarMotores())[0]!.id;
    expect(await codigoDe(d.crearProyecto(alta(a.sectorId, [a.id], { motorIds: [motor], liderId: LIDER })))).toEqual(invalido);
    expect(await codigoDe(d.crearProyecto(alta(a.sectorId, [a.id], { motorIds: [motor], responsableId: OTRO })))).toEqual(invalido);
    expect(await codigoDe(d.crearProyecto(alta(a.sectorId, [a.id], { motorIds: [motor], liderId: crypto.randomUUID() })))).toEqual({
      codigo: 'datos_invalidos',
      mensaje: 'No encontramos al líder.',
    });
  });

  it('plantillas: sectorId vacío o tipo inválido fallan como en la base', async () => {
    const d = montar();
    const sector = await d.crearSector({ nombre: 'Seguros', categoria: 'seguros' });
    const invalido = { codigo: 'datos_invalidos', mensaje: 'Los datos no son válidos.' };
    expect(await codigoDe(d.crearPlantilla({ codigo: 'Z1', sectorId: '', tipo: 'marca', texto: 'x' }))).toEqual(invalido);
    expect(await codigoDe(d.crearPlantilla({ codigo: 'Z1', sectorId: crypto.randomUUID(), tipo: 'marca', texto: 'x' }))).toEqual(invalido);
    expect(await codigoDe(d.crearPlantilla({ codigo: 'Z1', sectorId: sector.id, tipo: 'rara' as never, texto: 'x' }))).toEqual(invalido);
  });

  it('un usuario creado por la sesión no puede entrar con clave vacía', async () => {
    const d = montar();
    d.estado.sesion = 'nuevo@reset.com.pe';
    await d.sesionActual();
    expect(await codigoDe(d.entrar('nuevo@reset.com.pe', ''))).toEqual({ codigo: 'credenciales', mensaje: 'Correo o clave incorrectos.' });
  });

  it('crearMarca devuelve los alias ordenados por texto', async () => {
    const d = montar();
    const sector = await d.crearSector({ nombre: 'Seguros', categoria: 'seguros' });
    const m = await d.crearMarca(sector.id, { nombre: 'Rimac', ambiguo: false, alias: [{ texto: 'b', ambiguo: false }, { texto: 'a', ambiguo: false }], dominios: [] });
    expect(m.alias.map((x) => x.texto)).toEqual(['a', 'b']);
  });
});
