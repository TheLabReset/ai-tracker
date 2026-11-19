import type { ClienteTracker } from './cliente';
import { comprobar, comprobarLista, conTraduccion, sinPermiso } from './errores';
import type { CambioMotor, Datos, Motor } from './tipos';

type Motores = Pick<Datos, 'listarMotores' | 'actualizarMotor' | 'historialMotor'>;

export const aMotor = (f: any): Motor => ({
  id: f.id,
  codigo: f.codigo,
  nombre: f.nombre,
  proveedor: f.proveedor,
  modelo: f.modelo,
  busquedaWeb: f.busqueda_web,
  costoEstimado: f.costo_estimado === null ? null : Number(f.costo_estimado),
  activo: f.activo,
  vigenteDesde: f.vigente_desde,
});

const aCambio = (f: any): CambioMotor => ({
  modelo: f.modelo,
  busquedaWeb: f.busqueda_web,
  vigenteHasta: f.vigente_hasta,
});

export function crearMotores(cliente: ClienteTracker): Motores {
  return {
    listarMotores: () =>
      conTraduccion(async () => comprobarLista(await cliente.from('motores').select('*').order('orden')).map(aMotor)),

    actualizarMotor: (id, cambios) =>
      conTraduccion(async () => {
        const fila: Record<string, unknown> = {};
        if (cambios.modelo !== undefined) fila.modelo = cambios.modelo;
        if (cambios.busquedaWeb !== undefined) fila.busqueda_web = cambios.busquedaWeb;
        if (cambios.costoEstimado !== undefined) fila.costo_estimado = cambios.costoEstimado;
        if (cambios.activo !== undefined) fila.activo = cambios.activo;
        const filas = comprobarLista(await cliente.from('motores').update(fila).eq('id', id).select());
        if (filas.length === 0) throw sinPermiso();
        return aMotor(filas[0]);
      }),

    historialMotor: (id) =>
      conTraduccion(async () =>
        comprobarLista(
          await cliente.from('motores_historial').select('*').eq('motor_id', id).order('vigente_hasta', { ascending: false }),
        ).map(aCambio),
      ),
  };
}
