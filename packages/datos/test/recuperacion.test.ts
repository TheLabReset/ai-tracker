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
