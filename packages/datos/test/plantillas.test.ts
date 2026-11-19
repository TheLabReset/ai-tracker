import { describe, expect, it } from 'vitest';
import { PLANTILLAS_COMPAT } from '@lab/nucleo';
import { usuarioDePrueba } from './ayudas/usuarios';

describe('plantillas', () => {
  it('las globales son exactamente las 5 de la ficha', async () => {
    const u = await usuarioDePrueba();
    const globales = (await u.datos.listarPlantillas()).filter((p) => p.sectorId === null);
    expect(globales.map((p) => [p.codigo, p.tipo, p.texto])).toEqual(PLANTILLAS_COMPAT.map((p) => [p.codigo, p.tipo, p.texto]));
  });
  it('un sector suma plantillas propias y se validan sus variables', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const sector = await admin.datos.crearSector({ nombre: `Alimentos ${crypto.randomUUID().slice(0, 8)}`, categoria: 'alimentos' });
    await admin.datos.crearPlantilla({ codigo: 'N1', sectorId: sector.id, tipo: 'descubrimiento', texto: '¿Qué {categoria} me recomiendas para {necesidad}?' });
    expect((await admin.datos.listarPlantillas(sector.id)).map((p) => p.codigo)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'N1']);
    await expect(admin.datos.crearPlantilla({ codigo: 'N2', sectorId: sector.id, tipo: 'descubrimiento', texto: '¿Y {precio}?' }))
      .rejects.toMatchObject({ codigo: 'datos_invalidos', message: 'La variable {precio} no existe' });
  });
  it('las de un sector no aparecen en otro ni en la lista global', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const a = await admin.datos.crearSector({ nombre: `A ${crypto.randomUUID().slice(0, 8)}`, categoria: 'a' });
    const b = await admin.datos.crearSector({ nombre: `B ${crypto.randomUUID().slice(0, 8)}`, categoria: 'b' });
    await admin.datos.crearPlantilla({ codigo: 'N1', sectorId: a.id, tipo: 'marca', texto: '¿Y {marca}?' });
    expect((await admin.datos.listarPlantillas(b.id)).map((p) => p.codigo)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5']);
    expect((await admin.datos.listarPlantillas()).some((p) => p.sectorId === a.id)).toBe(false);
  });
  it('sin rol de líder no se crean plantillas de sector', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const otro = await usuarioDePrueba();
    const sector = await admin.datos.crearSector({ nombre: `S ${crypto.randomUUID().slice(0, 8)}`, categoria: 's' });
    await expect(otro.datos.crearPlantilla({ codigo: 'N1', sectorId: sector.id, tipo: 'marca', texto: '¿Y {marca}?' }))
      .rejects.toMatchObject({ codigo: 'sin_permiso' });
  });
  it('un código repetido en el sector llega en español', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const sector = await admin.datos.crearSector({ nombre: `R ${crypto.randomUUID().slice(0, 8)}`, categoria: 'r' });
    const nueva = { codigo: 'N1', sectorId: sector.id, tipo: 'marca' as const, texto: '¿Y {marca}?' };
    await admin.datos.crearPlantilla(nueva);
    await expect(admin.datos.crearPlantilla(nueva)).rejects.toMatchObject({
      codigo: 'datos_invalidos',
      message: 'Ya hay una plantilla con ese código.',
    });
  });
});
