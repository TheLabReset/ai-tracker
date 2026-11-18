import type { ValorCelda } from './dominio';

/** Primer miércoles del control de reportes (semana 1: 23/09 – 29/09/2026). */
export const INICIO_CONTROL = '2026-09-23';
export const ZONA_HORARIA = 'America/Lima';

const MS_POR_DIA = 86_400_000;
const EPOCA_EXCEL = Date.UTC(1899, 11, 30);

function diaUtc(fechaIso: string): number {
  const [a, m, d] = fechaIso.split('-').map(Number) as [number, number, number];
  return Date.UTC(a, m - 1, d) / MS_POR_DIA;
}

function isoDeDiaUtc(dia: number): string {
  return new Date(dia * MS_POR_DIA).toISOString().slice(0, 10);
}

function esFechaValida(a: number, m: number, d: number): boolean {
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

/** Semanas de miércoles a martes: 1 para la primera; 0 o menos antes del inicio. */
export function semanaDelControl(fechaIso: string, inicio: string = INICIO_CONTROL): number {
  return Math.floor((diaUtc(fechaIso) - diaUtc(inicio)) / 7) + 1;
}

export function rangoDeSemana(n: number, inicio: string = INICIO_CONTROL): { desde: string; hasta: string } {
  const desde = diaUtc(inicio) + (n - 1) * 7;
  return { desde: isoDeDiaUtc(desde), hasta: isoDeDiaUtc(desde + 6) };
}

/** La fecha calendario ('YYYY-MM-DD') de un instante, en hora de Lima. */
export function fechaEnLima(instante: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: ZONA_HORARIA }).format(instante);
}

/** Número de serie de Excel (días desde el 30/12/1899) → 'YYYY-MM-DD'. */
export function serialExcelAFecha(serial: number): string {
  return new Date(EPOCA_EXCEL + Math.floor(serial) * MS_POR_DIA).toISOString().slice(0, 10);
}

/** Lee una celda de fecha: serie de Excel, 'YYYY-MM-DD' o 'DD/MM/YYYY'. Si no se puede leer, null. */
export function fechaDeCelda(valor: ValorCelda): string | null {
  if (typeof valor === 'number' && Number.isFinite(valor) && valor > 0) return serialExcelAFecha(valor);
  if (typeof valor !== 'string') return null;
  const t = valor.trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) {
    const [a, mes, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return esFechaValida(a, mes, d) ? `${m[1]}-${m[2]}-${m[3]}` : null;
  }
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (m) {
    const [d, mes, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
    return esFechaValida(a, mes, d) ? `${a}-${String(mes).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null;
  }
  return null;
}
