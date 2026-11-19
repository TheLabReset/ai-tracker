import { describe, expect, it } from 'vitest';
import { claveMarca } from '@lab/nucleo';
import { crearClienteTracker } from '../src/cliente';
import { clienteServicio, entorno } from './ayudas/entorno';
import { usuarioDePrueba } from './ayudas/usuarios';

const unico = (base: string) => `${base} ${crypto.randomUUID().slice(0, 8)}`;
const nueva = (nombre: string, alias: string[] = []) => ({
  nombre,
  ambiguo: false,
  alias: alias.map((texto) => ({ texto, ambiguo: false })),
  dominios: [],
});

describe('catálogo', () => {
  it('guarda marcas con alias y su clave normalizada', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const sector = await admin.datos.crearSector({ nombre: unico('Educación ejecutiva'), categoria: 'educación ejecutiva' });
    const pbs = await admin.datos.crearMarca(sector.id, nueva('Pacífico Business School', ['UP']));
    expect(pbs.alias.map((a) => a.texto)).toEqual(['UP']);
    const { data } = await clienteServicio().from('marcas').select('clave').eq('id', pbs.id).single();
    expect(data?.clave).toBe(claveMarca('Pacífico Business School'));
  });
  it('rechaza un alias que ya es de otra marca del sector y dice de cuál', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const sector = await admin.datos.crearSector({ nombre: unico('Educación'), categoria: 'educación' });
    await admin.datos.crearMarca(sector.id, nueva('Pacífico Business School', ['UP']));
    const esan = await admin.datos.crearMarca(sector.id, nueva('ESAN'));
    await expect(admin.datos.agregarAlias(esan.id, { texto: 'U.P.', ambiguo: false })).rejects.toMatchObject({
      codigo: 'colision_alias',
      message: '«U.P.» ya es de Pacífico Business School',
    });
    const otroSector = await admin.datos.crearSector({ nombre: unico('Salud'), categoria: 'salud' });
    await expect(admin.datos.crearMarca(otroSector.id, nueva('UP'))).resolves.toBeDefined();
  });
  it('el catálogo se comparte; solo admin o líderes lo amplían', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const sector = await admin.datos.crearSector({ nombre: unico('Calzado'), categoria: 'calzado' });
    const lector = await usuarioDePrueba();
    expect((await lector.datos.listarSectores()).some((s) => s.id === sector.id)).toBe(true);
    await expect(lector.datos.crearMarca(sector.id, nueva('Bata'))).rejects.toMatchObject({ codigo: 'sin_permiso' });
    const bata = await admin.datos.crearMarca(sector.id, nueva('Bata'));
    await admin.datos.asignarMembresia(lector.id, bata.id, 'lider');
    await expect(lector.datos.crearMarca(sector.id, nueva('Footloose'))).resolves.toBeDefined();
    expect((await lector.datos.sesionActual())?.membresias).toEqual([{ marcaId: bata.id, rol: 'lider' }]);
    expect((await admin.datos.listarUsuarios()).find((u) => u.id === lector.id)?.membresias).toEqual([
      { marcaId: bata.id, marcaNombre: 'Bata', rol: 'lider' },
    ]);
  });
  it('un alta de marca rechazada por un alias que choca no deja la marca a medias', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const sector = await admin.datos.crearSector({ nombre: unico('Bancos'), categoria: 'bancos' });
    await admin.datos.crearMarca(sector.id, nueva('Banco Uno', ['BU']));
    await expect(admin.datos.crearMarca(sector.id, nueva('Banco Dos', ['B.U.']))).rejects.toMatchObject({
      codigo: 'colision_alias',
      message: '«B.U.» ya es de Banco Uno',
    });
    const { data } = await clienteServicio().from('marcas').select('id').eq('sector_id', sector.id).eq('nombre', 'Banco Dos');
    expect(data).toEqual([]);
  });
  it('un nombre de marca que es alias de otra también choca, al crear y al renombrar', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const sector = await admin.datos.crearSector({ nombre: unico('Retail'), categoria: 'retail' });
    await admin.datos.crearMarca(sector.id, nueva('Saga Falabella', ['Saga']));
    await expect(admin.datos.crearMarca(sector.id, nueva('SAGA'))).rejects.toMatchObject({
      codigo: 'colision_alias',
      message: '«SAGA» ya es de Saga Falabella',
    });
    const ripley = await admin.datos.crearMarca(sector.id, nueva('Ripley'));
    const { error } = await clienteServicio().from('marcas').update({ nombre: 'Saga' }).eq('id', ripley.id);
    expect(error?.message).toBe('colision_alias');
  });
  it('lista las marcas por nombre con sus alias por texto, y quita alias solo el admin', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const sector = await admin.datos.crearSector({ nombre: unico('Seguros'), categoria: 'seguros' });
    await admin.datos.crearMarca(sector.id, nueva('Rimac', ['Zeta', 'Alfa']));
    const mapfre = await admin.datos.crearMarca(sector.id, nueva('Mapfre'));
    const lista = await admin.datos.listarMarcas(sector.id);
    expect(lista.map((m) => m.nombre)).toEqual(['Mapfre', 'Rimac']);
    expect(lista[1]?.alias.map((a) => a.texto)).toEqual(['Alfa', 'Zeta']);
    const alias = await admin.datos.agregarAlias(mapfre.id, { texto: 'MPF', ambiguo: true });
    const lector = await usuarioDePrueba();
    await expect(lector.datos.quitarAlias(alias.id)).rejects.toMatchObject({ codigo: 'sin_permiso' });
    await admin.datos.quitarAlias(alias.id);
    expect((await admin.datos.listarMarcas(sector.id)).find((m) => m.id === mapfre.id)?.alias).toEqual([]);
  });
  it('un anónimo no averigua qué hay en el catálogo por los errores', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const sector = await admin.datos.crearSector({ nombre: unico('Privado'), categoria: 'privado' });
    await admin.datos.crearMarca(sector.id, nueva('Pacífico Business School', ['UP']));
    const { url, claveAnonima } = entorno();
    const anonimo = crearClienteTracker(url, claveAnonima);
    const directo = await anonimo.from('marcas').insert({ sector_id: sector.id, nombre: 'UP' });
    const rpc = await anonimo.rpc('crear_marca', { sector: sector.id, datos: { nombre: 'UP', alias: [] } });
    for (const r of [directo, rpc]) {
      expect(r.error?.code).toBe('42501');
      expect(JSON.stringify(r.error)).not.toContain('Pacífico');
    }
  });
  it('dos altas simultáneas con el mismo alias en el sector: solo una pasa', async () => {
    const a = await usuarioDePrueba({ admin: true });
    const b = await usuarioDePrueba({ admin: true });
    const sector = await a.datos.crearSector({ nombre: unico('Carreras'), categoria: 'carreras' });
    const resultados = await Promise.allSettled([
      a.datos.crearMarca(sector.id, nueva('Marca X', ['Carrera zzz'])),
      b.datos.crearMarca(sector.id, nueva('Marca Y', ['CARRERA ZZZ'])),
    ]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rechazo = resultados.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(rechazo.reason).toMatchObject({ codigo: 'colision_alias' });
  });
  it('un sector repetido da un error en español', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const nombre = unico('Repetido');
    await admin.datos.crearSector({ nombre, categoria: 'x' });
    await expect(admin.datos.crearSector({ nombre, categoria: 'x' })).rejects.toMatchObject({
      codigo: 'datos_invalidos',
      message: 'Ya existe un sector con ese nombre.',
    });
  });
});
