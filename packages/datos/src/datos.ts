import type { ClienteTracker } from './cliente';
import { crearSesion } from './sesion';
import type { Datos } from './tipos';
import { crearUsuarios } from './usuarios';

export function crearDatos(cliente: ClienteTracker): Datos {
  const sesion = crearSesion(cliente);
  return { ...sesion, ...crearUsuarios(cliente, sesion.sesionActual) };
}
