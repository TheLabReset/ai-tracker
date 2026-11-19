import { ErrorDatos, type CodigoError } from './tipos';

const CODIGOS: CodigoError[] = [
  'correo_no_permitido',
  'credenciales',
  'sin_permiso',
  'colision_alias',
  'limite_competidores',
  'datos_invalidos',
  'conexion',
  'otro',
];

interface ErrorCrudo {
  message?: string;
  details?: string | null;
  code?: string;
  name?: string;
  status?: number;
}

const esDeRed = (e: ErrorCrudo) =>
  e.name === 'AuthRetryableFetchError' || /fetch failed|failed to fetch|networkerror|econnrefused/i.test(e.message ?? '');

function textoDuplicado(mensaje: string): string {
  if (mensaje.includes('sectores_nombre_key')) return 'Ya existe un sector con ese nombre.';
  if (mensaje.includes('marcas_sector_id_clave_key')) return 'Ya hay una marca con ese nombre en el sector.';
  return 'Ese dato ya existe.';
}

export function traducirError(error: unknown): ErrorDatos {
  if (error instanceof ErrorDatos) return error;
  const e = (error ?? {}) as ErrorCrudo;
  if (esDeRed(e)) return new ErrorDatos('conexion', 'No hay conexión. Revisa tu internet e inténtalo de nuevo.');
  const mensaje = e.message ?? '';
  if (CODIGOS.includes(mensaje as CodigoError)) {
    return new ErrorDatos(mensaje as CodigoError, e.details || mensaje);
  }
  if (e.code === '42501') return new ErrorDatos('sin_permiso', e.details || 'No tienes permiso para hacer esto.');
  if (e.code === '23505') return new ErrorDatos('datos_invalidos', textoDuplicado(mensaje));
  if (['22P02', '23502', '23503', '23514'].includes(e.code ?? '')) {
    return new ErrorDatos('datos_invalidos', 'Los datos no son válidos.');
  }
  return new ErrorDatos('otro', mensaje || 'Algo salió mal.');
}

export function comprobar<T>(r: { data: T; error: unknown }): T {
  if (r.error) throw traducirError(r.error);
  return r.data;
}

export async function conTraduccion<T>(accion: () => Promise<T>): Promise<T> {
  try {
    return await accion();
  } catch (e) {
    throw traducirError(e);
  }
}

export function comprobarLista<T>(r: { data: T[] | null; error: unknown }): T[] {
  return comprobar(r) ?? [];
}
