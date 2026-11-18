import type { ValorCelda } from '../dominio';
import { redondearExcel } from '../metricas/redondeo';
import { ULTIMA_FILA_DEL_PANEL, type FilaCruda, type IndicadoresPanelVuelta, type PanelFicha } from './leer';

const vacia = (v: ValorCelda): boolean => v === null || v === '';

/** Comparación como COUNTIFS: no distingue mayúsculas, pero sí tildes. */
function igual(v: ValorCelda, esperado: string): boolean {
  return typeof v === 'string' && v.toLocaleLowerCase('es') === esperado.toLocaleLowerCase('es');
}

/** La fórmula de la columna Puntos de la ficha; null cuando la fila no tiene "¿Nos nombra?". */
function puntosDeFila(f: FilaCruda): number | null {
  if (vacia(f.nombra)) return null;
  if (igual(f.nombra, 'No')) return 0;
  if (igual(f.puesto, '1º')) return 3;
  if (igual(f.puesto, '2º')) return 2;
  if (igual(f.puesto, '3º')) return 1;
  return 0;
}

function indicadoresDe(filas: FilaCruda[]): IndicadoresPanelVuelta {
  const respuestas = filas.filter((f) => !vacia(f.nombra)).length;
  const cuenta = (pred: (f: FilaCruda) => boolean) => filas.filter(pred).length;
  const nombraVeces = cuenta((f) => igual(f.nombra, 'Sí'));
  const primeroVeces = cuenta((f) => igual(f.puesto, '1º'));
  const suma = filas.reduce((s, f) => s + (puntosDeFila(f) ?? 0), 0);
  const pct = (x: number) => (respuestas === 0 ? null : redondearExcel((x / respuestas) * 100, 0));
  return {
    respuestas,
    nombraVeces,
    nombraPct: pct(nombraVeces),
    primeroVeces,
    primeroPct: pct(primeroVeces),
    puntos: respuestas === 0 ? null : redondearExcel(suma / respuestas, 1),
    hablaBien: cuenta((f) => igual(f.sentimiento, 'Bien')),
    hablaMal: cuenta((f) => igual(f.sentimiento, 'Mal')),
    citaWeb: cuenta((f) => igual(f.fuente, 'Nuestra web')),
    citaTerceros: cuenta((f) => ['Medio de prensa', 'Comparador', 'Reseña'].some((t) => igual(f.fuente, t))),
  };
}

/** Recalcula el Panel con las mismas fórmulas de la ficha, incluidas sus mañas (y su límite de filas). */
export function panelComoExcel(todas: FilaCruda[]): PanelFicha {
  const filas = todas.filter((f) => f.fila <= ULTIMA_FILA_DEL_PANEL);
  const deVuelta = (k: number) => filas.filter((f) => f.vuelta === k);
  const vueltas = {} as PanelFicha['vueltas'];
  for (let k = 1; k <= 6; k++) vueltas[k as 1] = indicadoresDe(deVuelta(k));

  const conNombra = filas.filter((f) => !vacia(f.nombra));
  if (conNombra.length === 0) {
    return { ultimaVuelta: null, ultima: { nombraPct: null, primeroPct: null, puntos: null }, vueltas };
  }
  const ultimaVuelta = Math.max(...conNombra.map((f) => (typeof f.vuelta === 'number' ? f.vuelta : 0)));
  const filasUltima = deVuelta(ultimaVuelta);
  const n = Math.max(1, filasUltima.filter((f) => !vacia(f.nombra)).length);
  const ind = indicadoresDe(filasUltima);
  const suma = filasUltima.reduce((s, f) => s + (puntosDeFila(f) ?? 0), 0);
  return {
    ultimaVuelta,
    ultima: {
      nombraPct: redondearExcel((ind.nombraVeces / n) * 100, 0),
      primeroPct: redondearExcel((ind.primeroVeces / n) * 100, 0),
      puntos: redondearExcel(suma / n, 1),
    },
    vueltas,
  };
}
