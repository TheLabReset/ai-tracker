import { crearBitacora } from './bitacora';
import { crearCatalogo } from './catalogo';
import type { ClienteTracker } from './cliente';
import { crearMotores } from './motores';
import { crearPlantillas } from './plantillas';
import { crearProyectos } from './proyectos';
import { crearSesion } from './sesion';
import type { Datos } from './tipos';
import { crearUsuarios } from './usuarios';

export function crearDatos(cliente: ClienteTracker, opciones: { urlApp?: string } = {}): Datos {
  const sesion = crearSesion(cliente, opciones.urlApp);
  return {
    ...sesion,
    ...crearUsuarios(cliente, sesion.sesionActual),
    ...crearCatalogo(cliente),
    ...crearMotores(cliente),
    ...crearBitacora(cliente),
    ...crearPlantillas(cliente),
    ...crearProyectos(cliente, sesion.sesionActual),
  };
}
