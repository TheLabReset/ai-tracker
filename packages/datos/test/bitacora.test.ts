import { afterEach, describe, expect, it } from 'vitest';
import { clienteServicio } from './ayudas/entorno';
import { usuarioDePrueba } from './ayudas/usuarios';

afterEach(async () => {
  const { error } = await clienteServicio().from('motores').update({ costo_estimado: null }).not('id', 'is', null);
  if (error) throw error;
});

describe('bitácora', () => {
  it('registra quién cambió qué, y solo el admin la ve', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const [motor] = await admin.datos.listarMotores();
    await admin.datos.actualizarMotor(motor!.id, { costoEstimado: 0.02 });
    const [ultima] = await admin.datos.listarBitacora({ entidad: 'motores', limite: 1 });
    expect(ultima).toMatchObject({ entidad: 'motores', entidadId: motor!.id, accion: 'actualizar', usuarioCorreo: admin.correo });
    expect((ultima?.despues as { costo_estimado: number }).costo_estimado).toBe(0.02);
    const otro = await usuarioDePrueba();
    await expect(otro.datos.listarBitacora()).rejects.toMatchObject({ codigo: 'sin_permiso' });
  });

  it('un cambio sin diferencias no deja entrada, y un cambio del servicio no tiene autor', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const servicio = clienteServicio();
    const contar = async () => (await admin.datos.listarBitacora({ entidad: 'usuarios', limite: 500 })).filter((e) => e.entidadId === admin.id).length;
    const antes = await contar();
    await admin.datos.sesionActual();
    await servicio.from('usuarios').update({ correo: admin.correo }).eq('id', admin.id);
    expect(await contar()).toBe(antes);
    const [motor] = await admin.datos.listarMotores();
    await servicio.from('motores').update({ costo_estimado: 0.5 }).eq('id', motor!.id);
    const [ultima] = await admin.datos.listarBitacora({ entidad: 'motores', limite: 1 });
    expect(ultima).toMatchObject({ entidadId: motor!.id, usuarioCorreo: null });
  });

  it('usa una clave compuesta cuando la tabla no tiene id', async () => {
    const admin = await usuarioDePrueba({ admin: true });
    const otro = await usuarioDePrueba();
    const sector = await admin.datos.crearSector({ nombre: `Sector ${crypto.randomUUID()}`, categoria: 'prueba' });
    const marca = await admin.datos.crearMarca(sector.id, { nombre: 'Marca', ambiguo: false, alias: [], dominios: [] });
    await admin.datos.asignarMembresia(otro.id, marca.id, 'lector');
    const [ultima] = await admin.datos.listarBitacora({ entidad: 'membresias', limite: 1 });
    expect(ultima).toMatchObject({ entidadId: `${otro.id}/${marca.id}`, accion: 'insertar', usuarioCorreo: admin.correo });
    await admin.datos.quitarMembresia(otro.id, marca.id);
  });
});
