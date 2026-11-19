import { ErrorDatos, type Datos } from '@lab/datos';
import { esCorreoPermitido } from '@lab/nucleo';
import { igual, type Contexto } from './contexto';

type Sesion = Pick<Datos, 'entrar' | 'sesionActual' | 'salir' | 'pedirRecuperacion' | 'crearClave'>;

const noPermitido = () => new ErrorDatos('correo_no_permitido', 'Usa tu correo de Reset o Wanted.');

export function crearSesion(ctx: Contexto): Sesion {
  const { estado } = ctx;
  return {
    entrar: async (correo, clave) => {
      if (!esCorreoPermitido(correo)) throw noPermitido();
      estado.intentosDeEntrada++;
      const usuario = estado.usuarios.find((u) => igual(u.correo, correo));
      if (!usuario || usuario.clave !== clave) throw new ErrorDatos('credenciales', 'Correo o clave incorrectos.');
      if (estado.admins.some((a) => igual(a, usuario.correo))) usuario.admin = true;
      estado.sesion = usuario.correo;
      return ctx.perfilDe(usuario);
    },
    sesionActual: async () => {
      if (!estado.sesion || !esCorreoPermitido(estado.sesion)) return null;
      return structuredClone(ctx.perfilDe(ctx.yo()));
    },
    salir: async () => {
      estado.sesion = null;
    },
    pedirRecuperacion: async (correo) => {
      if (!esCorreoPermitido(correo)) throw noPermitido();
      estado.recuperaciones.push(correo.trim());
    },
    crearClave: async (clave) => {
      estado.clavesNuevas.push(clave);
    },
  };
}
