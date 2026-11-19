import { esCorreoPermitido } from '@lab/nucleo';
import type { ClienteTracker } from './cliente';
import { comprobar, conTraduccion, traducirError } from './errores';
import { ErrorDatos, type Datos, type Perfil } from './tipos';

type Sesion = Pick<Datos, 'entrar' | 'sesionActual' | 'salir' | 'pedirRecuperacion' | 'crearClave'>;

const correoNoPermitido = () => new ErrorDatos('correo_no_permitido', 'Usa tu correo de Reset o Wanted.');

function mensajeClave(error: { name?: string; code?: string }): string {
  if (error.name === 'AuthSessionMissingError') return 'El enlace venció. Pide uno nuevo desde «¿La olvidaste?».';
  if (error.name === 'AuthWeakPasswordError' || error.code === 'weak_password') {
    return 'La contraseña debe tener al menos 6 caracteres.';
  }
  return 'No pudimos guardar tu contraseña. Inténtalo de nuevo.';
}

export function crearSesion(cliente: ClienteTracker, urlApp?: string): Sesion {
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
        const { error } = await cliente.auth.resetPasswordForEmail(
          correo.trim(),
          urlApp ? { redirectTo: `${urlApp}/crear-password` } : undefined,
        );
        if (error) throw error;
      }),
    crearClave: (clave) =>
      conTraduccion(async () => {
        const { error } = await cliente.auth.updateUser({ password: clave });
        if (error) {
          const t = traducirError(error);
          if (t.codigo !== 'otro') throw t;
          throw new ErrorDatos('datos_invalidos', mensajeClave(error));
        }
      }),
  };
}
