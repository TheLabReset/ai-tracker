import * as XLSX from 'xlsx';
import { ENCABEZADOS_REGISTRO, type FichaCruda } from '../../src/ficha/leer';
import { armarSetCompat } from '../../src/preguntas';

type Celda = string | number | null | { error: string };

export const DATOS_PAD: FichaCruda['datos'] = {
  categoria: 'EDUCACIÓN EJECUTIVA',
  marca: 'PROGRAMA DE ALTA DIRECCIÓN',
  competidor: 'PACÍFICO BUSINESS SCHOOL',
};

function poner(ws: XLSX.WorkSheet, direccion: string, valor: Celda | undefined): void {
  if (valor === null || valor === undefined) return;
  if (typeof valor === 'object') ws[direccion] = { t: 'e', v: 0x17, w: valor.error };
  else if (typeof valor === 'number') ws[direccion] = { t: 'n', v: valor };
  else ws[direccion] = { t: 's', v: valor };
}

/** Arma un .xlsx con la estructura de la ficha GEO: hojas Inicio, Panel, Preguntas y Registro. */
export function crearFichaSintetica(p: {
  datos?: FichaCruda['datos'];
  filas: Celda[][];
  panel?: { C5?: number | ''; D6?: number | ''; E6?: number | ''; F6?: number | ''; tabla?: Array<Array<number | ''>> };
  sinHoja?: string;
  encabezadoRoto?: boolean;
}): Uint8Array {
  const datos = p.datos ?? DATOS_PAD;
  const wb = XLSX.utils.book_new();

  const inicio = XLSX.utils.aoa_to_sheet([['Ficha de seguimiento GEO']]);

  const preguntas: XLSX.WorkSheet = { '!ref': 'A1:C15' };
  poner(preguntas, 'B5', 'Categoría');
  poner(preguntas, 'C5', datos.categoria);
  poner(preguntas, 'B6', 'Marca del cliente');
  poner(preguntas, 'C6', datos.marca);
  poner(preguntas, 'B7', 'Competidor principal');
  poner(preguntas, 'C7', datos.competidor);
  armarSetCompat(datos).forEach((q, i) => {
    poner(preguntas, `B${9 + i}`, q.codigo);
    poner(preguntas, `C${9 + i}`, q.texto);
  });

  const encabezado = [...ENCABEZADOS_REGISTRO] as string[];
  if (p.encabezadoRoto) encabezado[4] = '¿Nos menciona?';
  const registro: XLSX.WorkSheet = { '!ref': 'A1:K401' };
  encabezado.forEach((t, c) => poner(registro, XLSX.utils.encode_cell({ r: 0, c }), t));
  p.filas.forEach((fila, r) => fila.forEach((v, c) => poner(registro, XLSX.utils.encode_cell({ r: r + 1, c }), v)));

  const panel: XLSX.WorkSheet = { '!ref': 'A1:H26' };
  poner(panel, 'B2', 'Panel');
  poner(panel, 'C5', p.panel?.C5);
  poner(panel, 'D6', p.panel?.D6);
  poner(panel, 'E6', p.panel?.E6);
  poner(panel, 'F6', p.panel?.F6);
  (p.panel?.tabla ?? []).forEach((fila, i) => fila.forEach((v, j) => poner(panel, XLSX.utils.encode_cell({ r: 10 + i, c: 2 + j }), v)));

  const hojas: Array<[string, XLSX.WorkSheet]> = [
    ['Inicio', inicio],
    ['Panel', panel],
    ['Preguntas', preguntas],
    ['Registro', registro],
  ];
  for (const [nombre, hoja] of hojas) if (nombre !== p.sinHoja) XLSX.utils.book_append_sheet(wb, hoja, nombre);
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
}
