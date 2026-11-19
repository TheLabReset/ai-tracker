import type { Cadencia } from './dominio';

/** Vueltas por mes de cada cadencia; manual no tiene calendario, así que no hay costo mensual. */
export const VUELTAS_POR_MES: Record<Cadencia, number | null> = {
  semanal: 52 / 12,
  quincenal: 26 / 12,
  manual: null,
};

export interface EntradaCosto {
  preguntas: number;
  muestras: number;
  cadencia: Cadencia;
  motores: Array<{ nombre: string; costoEstimado: number | null }>;
}

export interface CostoVuelta {
  porVuelta: number | null;
  porMes: number | null;
  /** Motores sin precio: si hay alguno, no se estima costo. */
  sinPrecio: string[];
}

export function estimarCostoVuelta(e: EntradaCosto): CostoVuelta {
  const sinPrecio = e.motores.filter((m) => m.costoEstimado === null).map((m) => m.nombre);
  if (sinPrecio.length > 0) return { porVuelta: null, porMes: null, sinPrecio };
  const porPregunta = e.motores.reduce((suma, m) => suma + (m.costoEstimado ?? 0), 0);
  const porVuelta = e.preguntas * e.muestras * porPregunta;
  const vueltas = VUELTAS_POR_MES[e.cadencia];
  return { porVuelta, porMes: vueltas === null ? null : porVuelta * vueltas, sinPrecio };
}
