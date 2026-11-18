import type { Puesto, Respuesta } from '../dominio';
import { evaluarMarca } from '../evaluacion';

export interface EtiquetaOro {
  respuestaId: string;
  marcaId: string;
  nombra: boolean;
  puesto: Puesto | null;
}

/** La etiqueta que produce la herramienta para una respuesta leída, con la misma regla del panel. */
export function etiquetaDesdeRespuesta(r: Respuesta, marcaId: string): EtiquetaOro {
  const e = evaluarMarca(r, marcaId, { esCliente: true });
  return { respuestaId: r.id, marcaId, nombra: e.nombra, puesto: e.puesto };
}

/** Porcentaje de acuerdo entre dos juegos de etiquetas. */
export function medirAcuerdo(a: EtiquetaOro[], b: EtiquetaOro[]): { pares: number; nombra: number | null; puesto: number | null } {
  const clave = (x: EtiquetaOro) => `${x.respuestaId}\u0000${x.marcaId}`;
  const deB = new Map(b.map((x) => [clave(x), x]));
  let pares = 0;
  let nombra = 0;
  let puesto = 0;
  for (const x of a) {
    const y = deB.get(clave(x));
    if (!y) continue;
    pares += 1;
    if (x.nombra === y.nombra) nombra += 1;
    if (x.puesto === y.puesto) puesto += 1;
  }
  if (pares === 0) return { pares: 0, nombra: null, puesto: null };
  return { pares, nombra: (nombra / pares) * 100, puesto: (puesto / pares) * 100 };
}
