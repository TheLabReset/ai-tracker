import { crearClienteTracker } from '@lab/datos';
import { leerEntorno } from './entorno';

export const CORREO_E2E = 'e2e-admin@reset.com.pe';
export const CLAVE_E2E = 'e2e-clave-123';

export default async function globalSetup() {
  const { url, claveServicio } = leerEntorno();
  const cliente = crearClienteTracker(url, claveServicio);

  const { error } = await cliente.auth.admin.createUser({
    email: CORREO_E2E,
    password: CLAVE_E2E,
    email_confirm: true,
  });
  if (error) {
    const { data, error: errorLista } = await cliente.auth.admin.listUsers({ perPage: 1000 });
    if (errorLista) throw errorLista;
    const existente = data.users.find((u) => u.email === CORREO_E2E);
    if (!existente) throw error;
    const { error: errorClave } = await cliente.auth.admin.updateUserById(existente.id, {
      password: CLAVE_E2E,
      email_confirm: true,
    });
    if (errorClave) throw errorClave;
  }

  const { error: errorAdmin } = await cliente.from('admins').upsert({ correo: CORREO_E2E }, { onConflict: 'correo' });
  if (errorAdmin) throw errorAdmin;
}
