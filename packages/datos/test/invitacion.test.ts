import { describe, expect, it } from 'vitest';
import { clienteServicio } from './ayudas/entorno';

describe('invitación', () => {
  it('sin redirección explícita, el enlace lleva a /crear-password', async () => {
    const correo = `invitada-${crypto.randomUUID()}@reset.com.pe`;
    const servicio = clienteServicio();
    const { data, error } = await servicio.auth.admin.generateLink({ type: 'invite', email: correo });
    expect(error).toBeNull();
    expect(data.properties?.redirect_to).toBe('http://127.0.0.1:5173/crear-password');
    await servicio.auth.admin.deleteUser(data.user!.id);
  });
});
