import { crearCatalogo } from './catalogo';
import type { ClienteTracker } from './cliente';
import { crearMotores } from './motores';
import { crearPlantillas } from './plantillas';
import { crearSesion } from './sesion';
import type { Datos } from './tipos';
import { crearUsuarios } from './usuarios';

export function crearDatos(cliente: ClienteTracker): Datos {
  const sesion = crearSesion(cliente);
  return {
    ...sesion,
    ...crearUsuarios(cliente, sesion.sesionActual),
    ...crearCatalogo(cliente),
    ...crearMotores(cliente),
    ...crearPlantillas(cliente),
  };
}
