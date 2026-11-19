import { esCorreoPermitido } from '@lab/nucleo';
import type { ClienteTracker } from './cliente';
import { comprobar, conTraduccion, traducirError } from './errores';
import { ErrorDatos, type Datos, type Perfil } from './tipos';

type Sesion = Pick<Datos, 'entrar' | 'sesionActual' | 'salir' | 'pedirRecuperacion' | 'crearClave'>;

const correoNoPermitido = () => new ErrorDatos('correo_no_permitido', 'Usa tu correo de Reset o Wanted.');

export function crearSesion(cliente: ClienteTracker): Sesion {
  async function sincronizar(): Promise<Perfil> {
    return comprobar(await cliente.rpc('sincronizar_perfil')) as unknown as Perfil;
  }

  return {
    entrar: (correo, clave) =>
      conTraduccion(async () => {
        if (!esCorreoPermitido(correo)) throw correoNoPermitido();
        const { error } = await cliente.auth.signInWithPassword({ email: correo.trim(), password: clave });
        if (error) {
          const t = traducirError(error);
          throw t.codigo === 'otro' ? new ErrorDatos('credenciales', 'Correo o clave incorrectos.') : t;
        }
        return sincronizar();
      }),
    sesionActual: () =>
      conTraduccion(async () => {
        const { data, error } = await cliente.auth.getSession();
        if (error) throw error;
        return data.session ? sincronizar() : null;
      }),
    salir: () =>
      conTraduccion(async () => {
        const { error } = await cliente.auth.signOut();
        if (error) throw error;
      }),
    pedirRecuperacion: (correo) =>
      conTraduccion(async () => {
        if (!esCorreoPermitido(correo)) throw correoNoPermitido();
        const { error } = await cliente.auth.resetPasswordForEmail(correo.trim());
        if (error) throw error;
      }),
    crearClave: (clave) =>
      conTraduccion(async () => {
        const { error } = await cliente.auth.updateUser({ password: clave });
        if (error) throw new ErrorDatos('datos_invalidos', error.message);
      }),
  };
}
