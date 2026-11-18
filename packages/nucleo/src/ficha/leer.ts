import * as XLSX from 'xlsx';
import type { ValorCelda } from '../dominio';

export const ENCABEZADOS_REGISTRO = [
  'Fecha',
  'Vuelta',
  'Pregunta',
  'IA',
  '¿Nos nombra?',
  '¿En qué puesto?',
  '¿Cómo habla de nosotros?',
  '¿Qué fuente cita?',
  'Marca que pone primero (si no somos nosotros)',
  'Puntos',
  'Estado de la fila',
] as const;

export interface FilaCruda {
  fila: number;
  fecha: ValorCelda;
  vuelta: ValorCelda;
  pregunta: ValorCelda;
  ia: ValorCelda;
  nombra: ValorCelda;
  puesto: ValorCelda;
  sentimiento: ValorCelda;
  fuente: ValorCelda;
  marcasPrimero: ValorCelda;
  puntos: ValorCelda;
  estado: ValorCelda;
}

export interface IndicadoresPanelVuelta {
  respuestas: number;
  nombraVeces: number;
  nombraPct: number | null;
  primeroVeces: number;
  primeroPct: number | null;
  puntos: number | null;
  hablaBien: number;
  hablaMal: number;
  citaWeb: number;
  citaTerceros: number;
}

export interface PanelFicha {
  ultimaVuelta: number | null;
  ultima: { nombraPct: number | null; primeroPct: number | null; puntos: number | null };
  vueltas: Record<1 | 2 | 3 | 4 | 5 | 6, IndicadoresPanelVuelta>;
}

export interface FichaCruda {
  datos: { categoria: string; marca: string; competidor: string };
  preguntas: Record<'P1' | 'P2' | 'P3' | 'P4' | 'P5', string>;
  filas: FilaCruda[];
  panel: PanelFicha;
}

export class FichaInvalidaError extends Error {
  constructor(public readonly motivo: string) {
    super(motivo);
    this.name = 'FichaInvalidaError';
  }
}

const COLUMNAS = ['fecha', 'vuelta', 'pregunta', 'ia', 'nombra', 'puesto', 'sentimiento', 'fuente', 'marcasPrimero', 'puntos', 'estado'] as const;
/** Las fórmulas del Panel solo miran Registro!2:401; las filas posteriores se leen igual. */
export const ULTIMA_FILA_DEL_PANEL = 401;

function valor(ws: XLSX.WorkSheet, direccion: string): ValorCelda {
  const celda = ws[direccion] as XLSX.CellObject | undefined;
  if (!celda || celda.t === 'z') return null;
  if (celda.t === 'e') return { error: celda.w ?? '#ERROR' };
  if (celda.t === 'n' || celda.t === 's' || celda.t === 'b') return celda.v as number | string | boolean;
  return celda.v === undefined ? null : String(celda.v);
}

function texto(ws: XLSX.WorkSheet, direccion: string): string {
  const v = valor(ws, direccion);
  return typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '';
}

const numeroONull = (v: ValorCelda): number | null => (typeof v === 'number' ? v : null);
const cuenta = (v: ValorCelda): number => (typeof v === 'number' ? v : 0);
const vacia = (v: ValorCelda): boolean => v === null || v === '';

function leerPanel(ws: XLSX.WorkSheet): PanelFicha {
  const vueltas = {} as PanelFicha['vueltas'];
  for (let k = 1; k <= 6; k++) {
    const col = XLSX.utils.encode_col(1 + k); // C..H
    const v = (fila: number) => valor(ws, `${col}${fila}`);
    vueltas[k as 1] = {
      respuestas: cuenta(v(11)),
      nombraVeces: cuenta(v(12)),
      nombraPct: numeroONull(v(13)),
      primeroVeces: cuenta(v(14)),
      primeroPct: numeroONull(v(15)),
      puntos: numeroONull(v(16)),
      hablaBien: cuenta(v(17)),
      hablaMal: cuenta(v(18)),
      citaWeb: cuenta(v(19)),
      citaTerceros: cuenta(v(20)),
    };
  }
  return {
    ultimaVuelta: numeroONull(valor(ws, 'C5')),
    ultima: { nombraPct: numeroONull(valor(ws, 'D6')), primeroPct: numeroONull(valor(ws, 'E6')), puntos: numeroONull(valor(ws, 'F6')) },
    vueltas,
  };
}

/** Lee la ficha .xlsx con los valores guardados, sin recalcular fórmulas. */
export function leerFicha(contenido: Uint8Array): FichaCruda {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(contenido, { type: 'array', cellDates: false });
  } catch {
    throw new FichaInvalidaError('El archivo no es un Excel válido');
  }
  const hoja = (nombre: string) => {
    const ws = wb.Sheets[nombre];
    if (!ws) throw new FichaInvalidaError(`Falta la hoja "${nombre}"`);
    return ws;
  };
  const preguntas = hoja('Preguntas');
  const registro = hoja('Registro');
  const panel = hoja('Panel');

  ENCABEZADOS_REGISTRO.forEach((esperado, c) => {
    const encontrado = texto(registro, XLSX.utils.encode_cell({ r: 0, c }));
    if (encontrado !== esperado) {
      throw new FichaInvalidaError(`El encabezado de Registro no coincide en la columna ${XLSX.utils.encode_col(c)}: "${encontrado}"`);
    }
  });

  const filas: FilaCruda[] = [];
  const ultimaFila = Math.max(ULTIMA_FILA_DEL_PANEL, registro['!ref'] ? XLSX.utils.decode_range(registro['!ref']).e.r + 1 : 0);
  for (let r = 1; r < ultimaFila; r++) {
    const valores = COLUMNAS.map((_, c) => valor(registro, XLSX.utils.encode_cell({ r, c })));
    if (valores.slice(0, 9).every(vacia)) continue;
    const fila = { fila: r + 1 } as FilaCruda;
    COLUMNAS.forEach((col, c) => {
      fila[col] = valores[c]!;
    });
    filas.push(fila);
  }

  return {
    datos: { categoria: texto(preguntas, 'C5'), marca: texto(preguntas, 'C6'), competidor: texto(preguntas, 'C7') },
    preguntas: {
      P1: texto(preguntas, 'C9'),
      P2: texto(preguntas, 'C10'),
      P3: texto(preguntas, 'C11'),
      P4: texto(preguntas, 'C12'),
      P5: texto(preguntas, 'C13'),
    },
    filas,
    panel: leerPanel(panel),
  };
}
