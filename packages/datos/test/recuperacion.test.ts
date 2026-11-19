import { describe, expect, it, vi } from 'vitest';
import type { ClienteTracker } from '../src/cliente';
import { crearDatos } from '../src/datos';

function clienteFalso() {
  const resetPasswordForEmail = vi.fn(async () => ({ error: null }));
  return { resetPasswordForEmail, cliente: { auth: { resetPasswordForEmail } } as unknown as ClienteTracker };
}

describe('recuperación de contraseña', () => {
  it('con urlApp, el enlace vuelve a /crear-password', async () => {
    const { cliente, resetPasswordForEmail } = clienteFalso();
    await crearDatos(cliente, { urlApp: 'http://127.0.0.1:5173' }).pedirRecuperacion('ana@reset.com.pe');
    expect(resetPasswordForEmail).toHaveBeenCalledWith('ana@reset.com.pe', { redirectTo: 'http://127.0.0.1:5173/crear-password' });
  });
  it('sin urlApp, no pide redirección', async () => {
    const { cliente, resetPasswordForEmail } = clienteFalso();
    await crearDatos(cliente).pedirRecuperacion('ana@reset.com.pe');
    expect(resetPasswordForEmail).toHaveBeenCalledWith('ana@reset.com.pe', undefined);
  });
});

describe('crear contraseña', () => {
  function clienteQueFalla(error: { name: string; code: string; status: number; message: string }) {
    const updateUser = vi.fn(async () => ({ data: { user: null }, error }));
    return crearDatos({ auth: { updateUser } } as unknown as ClienteTracker);
  }

  it('repetir la contraseña actual cuenta como guardada', async () => {
    const datos = clienteQueFalla({
      name: 'AuthApiError',
      code: 'same_password',
      status: 422,
      message: 'New password should be different from the old password.',
    });
    await expect(datos.crearClave('la-misma-clave')).resolves.toBeUndefined();
  });

  it('una contraseña débil sigue dando el aviso de largo mínimo', async () => {
    const datos = clienteQueFalla({ name: 'AuthWeakPasswordError', code: 'weak_password', status: 422, message: 'Password should be at least 6 characters.' });
    await expect(datos.crearClave('123')).rejects.toMatchObject({
      codigo: 'datos_invalidos',
      message: 'La contraseña debe tener al menos 6 caracteres.',
    });
  });
});
