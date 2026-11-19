import { probarContrato } from '../../../packages/datos/test/contrato';
import { crearDatosEnMemoria, idDeUsuario, otraSesion } from './ayudas/datos-en-memoria';

const ADMIN = 'admin@reset.com.pe';
const OTRO = 'otro@wanted.pe';

probarContrato('contrato de datos en memoria', async () => {
  const admin = crearDatosEnMemoria({
    usuarios: [
      { correo: ADMIN, clave: 'secreta', admin: true },
      { correo: OTRO, clave: 'secreta' },
    ],
  });
  admin.estado.sesion = ADMIN;
  const otro = otraSesion(admin, OTRO);
  return { admin, otro, otroId: idDeUsuario(admin, OTRO) };
});
