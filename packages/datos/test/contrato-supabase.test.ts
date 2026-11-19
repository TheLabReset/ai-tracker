import { probarContrato } from './contrato';
import { usuarioDePrueba } from './ayudas/usuarios';

probarContrato('contrato de datos en Supabase', async () => {
  const admin = await usuarioDePrueba({ admin: true });
  const otro = await usuarioDePrueba();
  return { admin: admin.datos, otro: otro.datos, otroId: otro.id };
});
