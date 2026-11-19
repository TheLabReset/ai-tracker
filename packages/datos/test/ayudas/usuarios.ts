import { crearClienteTracker } from '../../src/cliente';
import { crearDatos } from '../../src/datos';
import type { Datos } from '../../src/tipos';
import { clienteServicio, entorno } from './entorno';

const CLAVE = 'clave-de-prueba-123';

export async function usuarioDePrueba(
  o: { correo?: string; admin?: boolean } = {},
): Promise<{ id: string; correo: string; datos: Datos }> {
  const correo = (o.correo ?? `prueba-${crypto.randomUUID()}@reset.com.pe`).toLowerCase();
  const servicio = clienteServicio();
  if (o.admin) {
    const { error } = await servicio.from('admins').upsert({ correo });
    if (error) throw error;
  }
  const { data, error } = await servicio.auth.admin.createUser({ email: correo, password: CLAVE, email_confirm: true });
  if (error) throw error;
  const { url, claveAnonima } = entorno();
  const cliente = crearClienteTracker(url, claveAnonima);
  const { error: errorEntrada } = await cliente.auth.signInWithPassword({ email: correo, password: CLAVE });
  if (errorEntrada) throw errorEntrada;
  const datos = crearDatos(cliente);
  await datos.sesionActual();
  return { id: data.user.id, correo, datos };
}
