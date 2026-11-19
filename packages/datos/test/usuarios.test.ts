import { describe, expect, it } from 'vitest';
import { crearDatos } from '../src/datos';
import { ErrorDatos } from '../src/tipos';
import { crearClienteTracker } from '../src/cliente';
import { alta } from './ayudas/alta';
import { clienteServicio, entorno } from './ayudas/entorno';
import { usuarioDePrueba } from './ayudas/usuarios';

describe('usuarios y sesión', () => {
  it('crea el perfil al entrar, con la empresa del dominio', async () => {
    const u = await usuarioDePrueba({ correo: `Ana-${crypto.randomUUID()}@RESET.COM.PE` });
    expect(await u.datos.sesionActual()).toMatchObject({ empresaId: 'reset', esAdmin: false, membresias: [] });
  });
  it('rechaza correos fuera de Reset y Wanted, sin crear el perfil', async () => {
    const correo = `ana-${crypto.randomUUID()}@reset.com.pe.otro.com`;
    await expect(usuarioDePrueba({ correo })).rejects.toMatchObject({ codigo: 'correo_no_permitido' });
    const { data } = await clienteServicio().from('usuarios').select('id').eq('correo', correo.toLowerCase());
    expect(data).toEqual([]);
  });
  it('el admin sale de la lista de admins; nadie más puede nombrar admins', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const otro = await usuarioDePrueba();
    expect((await admin.datos.sesionActual())?.esAdmin).toBe(true);
    await expect(otro.datos.cambiarAdmin(otro.id, true)).rejects.toBeInstanceOf(ErrorDatos);
    await admin.datos.cambiarAdmin(otro.id, true);
    expect((await otro.datos.sesionActual())?.esAdmin).toBe(true);
  });
  it('un usuario sin marcas ve el directorio pero no la lista de administración', async () => {
    const u = await usuarioDePrueba();
    expect((await u.datos.listarDirectorio()).some((x) => x.id === u.id)).toBe(true);
    await expect(u.datos.listarUsuarios()).rejects.toMatchObject({ codigo: 'sin_permiso' });
  });
  it('perfil_de no se puede llamar desde la API, ni con sesión ni sin ella', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const otro = await usuarioDePrueba();
    const { url, claveAnonima } = entorno();
    const anonimo = crearClienteTracker(url, claveAnonima);
    expect((await anonimo.rpc('perfil_de', { usuario: admin.id })).error).not.toBeNull();
    const sesion = crearClienteTracker(url, claveAnonima);
    await sesion.auth.signInWithPassword({ email: otro.correo, password: 'clave-de-prueba-123' });
    const r = await sesion.rpc('perfil_de', { usuario: admin.id });
    expect(r.error).not.toBeNull();
    expect(r.data).toBeNull();
  });
  it('quitar una membresía ajena sin ser admin da sin_permiso', async () => {
    const otro = await usuarioDePrueba();
    const u = await usuarioDePrueba();
    const servicio = clienteServicio();
    const { data: sector } = await servicio.from('sectores').insert({ nombre: `Sector ${crypto.randomUUID()}`, categoria: 'prueba' }).select().single();
    const { data: marca } = await servicio.from('marcas').insert({ sector_id: sector.id, nombre: 'Marca de prueba' }).select().single();
    const marcaId = marca.id;
    await servicio.from('membresias').insert({ usuario_id: otro.id, marca_id: marcaId, rol: 'lector' });
    await expect(u.datos.quitarMembresia(otro.id, marcaId)).rejects.toMatchObject({ codigo: 'sin_permiso' });
  });
  it('quien cambia su correo de auth fuera de los dominios deja de leer por la API', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const persona = await usuarioDePrueba();
    const pid = await admin.datos.crearProyecto(await alta(admin.datos, { liderId: persona.id }));
    const servicio = clienteServicio();
    const { url, claveAnonima } = entorno();
    const tablas = ['sectores', 'marcas', 'alias', 'motores', 'motores_historial', 'plantillas', 'usuarios', 'empresas', 'membresias', 'proyectos', 'proyecto_competidores', 'proyecto_motores', 'preguntas', 'bitacora'];
    for (const u of [persona, admin]) {
      const fuera = `fuera-${crypto.randomUUID()}@gmail.com`;
      const { error } = await servicio.auth.admin.updateUserById(u.id, { email: fuera, email_confirm: true, password: 'clave-fuera-123' });
      expect(error).toBeNull();
      const cliente = crearClienteTracker(url, claveAnonima);
      expect((await cliente.auth.signInWithPassword({ email: fuera, password: 'clave-fuera-123' })).error).toBeNull();
      expect((await cliente.from('proyectos').select('id').eq('id', pid)).data).toEqual([]);
      for (const tabla of tablas) {
        const r = await cliente.from(tabla).select('*').limit(1);
        expect({ tabla, error: r.error, filas: r.data }).toEqual({ tabla, error: null, filas: [] });
      }
      expect((await cliente.from('sectores').insert({ nombre: `Sector ${crypto.randomUUID()}`, categoria: 'prueba' })).error).not.toBeNull();
    }
  });
  it('crearClave sin sesión da datos_invalidos con texto en español', async () => {
    const { url, claveAnonima } = entorno();
    const datos = crearDatos(crearClienteTracker(url, claveAnonima));
    await expect(datos.crearClave('clave-nueva-123')).rejects.toMatchObject({
      codigo: 'datos_invalidos',
      message: expect.stringMatching(/venció/),
    });
  });
});
