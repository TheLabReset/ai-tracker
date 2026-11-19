import { describe, expect, it } from 'vitest';
import { armarSetCompat } from '@lab/nucleo';
import type { DatosAlta } from '../src/tipos';
import { clienteServicio } from './ayudas/entorno';
import { usuarioDePrueba } from './ayudas/usuarios';

const id = () => crypto.randomUUID().slice(0, 8);
async function alta(datos: import('../src/tipos').Datos, o: Partial<DatosAlta> = {}): Promise<DatosAlta> {
  const motores = await datos.listarMotores();
  const marca = `Marca ${id()}`;
  return {
    marca: { nombre: marca, ambiguo: false, alias: [], dominios: ['marca.pe'], empresaId: 'reset' },
    sector: { nombre: `Sector ${id()}`, categoria: 'calzado' }, categoriasExtra: [],
    competidores: [{ nombre: `Rival ${id()}`, ambiguo: false, alias: [], dominios: [] }], competidorPrincipal: 0,
    preguntas: armarSetCompat({ categoria: 'calzado', marca, competidor: 'Rival' }).map((p) => ({ ...p, set: 'compat' as const, categoria: null })),
    motorIds: motores.map((m) => m.id), cadencia: 'semanal', diaSemana: 3, hora: '07:00', muestras: 3, topeGastoMensual: null, ...o,
  };
}

describe('proyectos', () => {
  it('el alta crea marca, sector, competidores, preguntas y deja líder a quien la crea', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const lider = await usuarioDePrueba();
    const base = await admin.datos.crearSector({ nombre: `Base ${id()}`, categoria: 'x' });
    const propia = await admin.datos.crearMarca(base.id, { nombre: `Propia ${id()}`, ambiguo: false, alias: [], dominios: [] });
    await admin.datos.asignarMembresia(lider.id, propia.id, 'lider');
    const proyectoId = await lider.datos.crearProyecto(await alta(lider.datos));
    const p = await lider.datos.obtenerProyecto(proyectoId);
    expect(p.preguntas.map((q) => q.codigo)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5']);
    expect(p).toMatchObject({ muestras: 3, cadencia: 'semanal', estado: 'activo', pesos: { 1: 3, 2: 2, 3: 1 } });
    expect(p.competidorPrincipalId).toBe(p.competidores[0]?.id);
    expect((await lider.datos.listarProyectos()).find((r) => r.id === proyectoId)?.miRol).toBe('lider');
  });
  it('quien no es líder ni admin no da de alta, y nadie ve proyectos ajenos', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const otro = await usuarioDePrueba();
    await expect(otro.datos.crearProyecto(await alta(otro.datos))).rejects.toMatchObject({ codigo: 'sin_permiso' });
    const proyectoId = await admin.datos.crearProyecto(await alta(admin.datos));
    expect((await otro.datos.listarProyectos()).some((r) => r.id === proyectoId)).toBe(false);
    await expect(otro.datos.obtenerProyecto(proyectoId)).rejects.toMatchObject({ codigo: 'sin_permiso' });
  });
  it('si algo choca, no queda nada creado a medias', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const sector = await admin.datos.crearSector({ nombre: `Choque ${id()}`, categoria: 'x' });
    await admin.datos.crearMarca(sector.id, { nombre: 'Pacífico Business School', ambiguo: false, alias: [{ texto: 'UP', ambiguo: false }], dominios: [] });
    const d = await alta(admin.datos, { sector: { id: sector.id }, competidores: [{ nombre: 'UP', ambiguo: false, alias: [], dominios: [] }] });
    await expect(admin.datos.crearProyecto(d)).rejects.toMatchObject({ codigo: 'colision_alias' });
    const { data } = await clienteServicio().from('marcas').select('id').eq('nombre', d.marca.nombre);
    expect(data).toEqual([]);
    const seis = Array.from({ length: 6 }, () => ({ nombre: `R ${id()}`, ambiguo: false, alias: [], dominios: [] }));
    await expect(admin.datos.crearProyecto(await alta(admin.datos, { competidores: seis }))).rejects.toMatchObject({ codigo: 'limite_competidores' });
  });
  it('sin permiso gana a la colisión, y un competidor existente de otro sector es inválido', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const otro = await usuarioDePrueba();
    const sector = await admin.datos.crearSector({ nombre: `Fuga ${id()}`, categoria: 'x' });
    await admin.datos.crearMarca(sector.id, { nombre: 'Secreta SAC', ambiguo: false, alias: [], dominios: [] });
    const choque = await alta(otro.datos, {
      sector: { id: sector.id },
      competidores: [{ nombre: 'Secreta SAC', ambiguo: false, alias: [], dominios: [] }],
    });
    await expect(otro.datos.crearProyecto(choque)).rejects.toMatchObject({ codigo: 'sin_permiso' });
    const ajeno = await admin.datos.crearMarca(
      (await admin.datos.crearSector({ nombre: `Otro ${id()}`, categoria: 'x' })).id,
      { nombre: `Ajena ${id()}`, ambiguo: false, alias: [], dominios: [] },
    );
    await expect(admin.datos.crearProyecto(await alta(admin.datos, { competidores: [{ id: ajeno.id }] }))).rejects.toMatchObject({
      codigo: 'datos_invalidos',
    });
  });
  it('un líder no puede nombrar a otro líder, un admin sí', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const lider = await usuarioDePrueba();
    const otra = await usuarioDePrueba();
    const base = await admin.datos.crearSector({ nombre: `Base ${id()}`, categoria: 'x' });
    const propia = await admin.datos.crearMarca(base.id, { nombre: `Propia ${id()}`, ambiguo: false, alias: [], dominios: [] });
    await admin.datos.asignarMembresia(lider.id, propia.id, 'lider');
    await expect(lider.datos.crearProyecto(await alta(lider.datos, { liderId: otra.id }))).rejects.toMatchObject({ codigo: 'sin_permiso' });
    const proyectoId = await admin.datos.crearProyecto(await alta(admin.datos, { liderId: otra.id, responsableId: lider.id }));
    expect((await otra.datos.listarProyectos()).find((r) => r.id === proyectoId)?.miRol).toBe('lider');
    expect((await lider.datos.listarProyectos()).find((r) => r.id === proyectoId)?.miRol).toBe('responsable');
    expect((await admin.datos.listarProyectos()).find((r) => r.id === proyectoId)?.miRol).toBe('admin');
  });
  it('rechaza muestras, día, motores y principal fuera de rango', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    for (const o of [{ muestras: 11 }, { muestras: 0 }, { diaSemana: 7 }, { motorIds: [] }, { preguntas: [] }, { competidorPrincipal: 5 }, { motorIds: [crypto.randomUUID()] }]) {
      await expect(admin.datos.crearProyecto(await alta(admin.datos, o))).rejects.toMatchObject({ codigo: 'datos_invalidos' });
    }
  });
});
