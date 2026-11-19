import { describe, expect, it } from 'vitest';
import { alta } from './ayudas/alta';
import { clienteServicio } from './ayudas/entorno';
import { usuarioDePrueba } from './ayudas/usuarios';

describe('edición de proyectos', () => {
  it('editar el texto crea una versión nueva y guarda la anterior', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const pid = await admin.datos.crearProyecto(await alta(admin.datos));
    const p1 = (await admin.datos.obtenerProyecto(pid)).preguntas[0]!;
    expect(await admin.datos.editarPregunta(p1.id, `  ${p1.texto}  `)).toMatchObject({ id: p1.id, version: 1 });
    const v2 = await admin.datos.editarPregunta(p1.id, '¿Qué marca de zapatillas me recomiendas en Perú?');
    expect(v2).toMatchObject({ codigo: 'P1', version: 2 });
    expect((await admin.datos.obtenerProyecto(pid)).preguntas.filter((q) => q.codigo === 'P1')).toEqual([v2]);
    const { data } = await clienteServicio().from('preguntas').select('version, activa').eq('proyecto_id', pid).eq('codigo', 'P1').order('version');
    expect(data).toEqual([{ version: 1, activa: false }, { version: 2, activa: true }]);
    await expect(admin.datos.editarPregunta(p1.id, 'otro texto')).rejects.toMatchObject({ codigo: 'datos_invalidos' });
  });
  it('suma preguntas propias, cambia competidores y pausa el proyecto', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const pid = await admin.datos.crearProyecto(await alta(admin.datos));
    expect((await admin.datos.agregarPregunta(pid, { tipo: 'descubrimiento', texto: '¿Qué zapatillas duran más?', categoria: null })).codigo).toBe('X1');
    expect((await admin.datos.agregarPregunta(pid, { tipo: 'descubrimiento', texto: '¿Y para correr?', categoria: null })).codigo).toBe('X2');
    const p = await admin.datos.obtenerProyecto(pid);
    const seis = Array.from({ length: 6 }, () => p.competidores[0]!.id);
    await expect(admin.datos.cambiarCompetidores(pid, seis)).rejects.toMatchObject({ codigo: 'limite_competidores' });
    await admin.datos.cambiarEstado(pid, 'pausado');
    expect((await admin.datos.obtenerProyecto(pid)).estado).toBe('pausado');
  });
  it('dos altas simultáneas no repiten código', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const pid = await admin.datos.crearProyecto(await alta(admin.datos));
    const nueva = { tipo: 'marca' as const, texto: '¿Qué tal?', categoria: null };
    const q = await Promise.all([1, 2, 3].map(() => admin.datos.agregarPregunta(pid, nueva)));
    expect(q.map((x) => x.codigo).sort()).toEqual(['X1', 'X2', 'X3']);
  });
  it('un responsable puede ver, pero no editar', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const resp = await usuarioDePrueba();
    const pid = await admin.datos.crearProyecto(await alta(admin.datos, { responsableId: resp.id }));
    await expect(resp.datos.obtenerProyecto(pid)).resolves.toBeDefined();
    await expect(resp.datos.actualizarProyecto(pid, { muestras: 5 })).rejects.toMatchObject({ codigo: 'sin_permiso' });
    const p1 = (await admin.datos.obtenerProyecto(pid)).preguntas[0]!;
    await expect(resp.datos.editarPregunta(p1.id, 'otro texto')).rejects.toMatchObject({ codigo: 'sin_permiso' });
  });
  it('valida la configuración y reemplaza motores y competidores', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const pid = await admin.datos.crearProyecto(await alta(admin.datos));
    const p = await admin.datos.obtenerProyecto(pid);
    await expect(admin.datos.actualizarProyecto(pid, { competidorPrincipalId: p.marca.id })).rejects.toMatchObject({ codigo: 'datos_invalidos' });
    await expect(admin.datos.actualizarProyecto(pid, { muestras: 11 })).rejects.toMatchObject({ codigo: 'datos_invalidos' });
    await expect(admin.datos.actualizarProyecto(pid, { motorIds: [] })).rejects.toMatchObject({ codigo: 'datos_invalidos' });
    await expect(admin.datos.actualizarProyecto(pid, { pesos: { 1: 3, 2: -1, 3: 1 } })).rejects.toMatchObject({ codigo: 'datos_invalidos' });
    await expect(admin.datos.actualizarProyecto(pid, {})).resolves.toBeUndefined();
    const motor = p.motores[0]!.id;
    await admin.datos.actualizarProyecto(pid, { muestras: 5, motorIds: [motor], categoriasExtra: ['running'], topeGastoMensual: 40 });
    expect(await admin.datos.obtenerProyecto(pid)).toMatchObject({ muestras: 5, categoriasExtra: ['running'], topeGastoMensual: 40, motores: [{ id: motor }] });
    await expect(admin.datos.cambiarCompetidores(pid, [p.marca.id])).rejects.toMatchObject({ codigo: 'datos_invalidos' });
    await expect(admin.datos.cambiarEstado(pid, 'roto' as never)).rejects.toMatchObject({ codigo: 'datos_invalidos' });
  });
  it('desactivar deja siempre una pregunta activa', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const pid = await admin.datos.crearProyecto(await alta(admin.datos));
    const { preguntas } = await admin.datos.obtenerProyecto(pid);
    for (const q of preguntas.slice(1)) await admin.datos.desactivarPregunta(q.id);
    await expect(admin.datos.desactivarPregunta(preguntas[0]!.id)).rejects.toMatchObject({ codigo: 'datos_invalidos' });
    expect((await admin.datos.obtenerProyecto(pid)).preguntas).toHaveLength(1);
  });
});
