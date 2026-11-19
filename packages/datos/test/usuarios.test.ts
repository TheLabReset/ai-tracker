import { describe, expect, it } from 'vitest';
import { ErrorDatos } from '../src/tipos';
import { clienteServicio } from './ayudas/entorno';
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
});
