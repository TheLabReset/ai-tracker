// Uso: pnpm -C packages/nucleo verificar-fichas <carpeta> [--salida <carpeta>]
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import {
  diagnosticarFicha,
  importarFicha,
  leerFicha,
  panelComoExcel,
  verificarContraPanel,
  type Anomalia,
  type ValorCelda,
} from '../src/index';

function argumentos(argv: string[]): { carpeta: string; salida: string | null } {
  const [carpeta, ...resto] = argv;
  if (!carpeta) {
    console.error('Uso: verificar-fichas <carpeta> [--salida <carpeta>]');
    process.exit(2);
  }
  const i = resto.indexOf('--salida');
  return { carpeta, salida: i >= 0 ? (resto[i + 1] ?? null) : null };
}

function texto(v: ValorCelda | undefined): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return v.error;
  return String(v);
}

function csv(anomalias: Anomalia[]): string {
  const celda = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const filas = anomalias.map((a) =>
    [
      a.fila === null ? '' : String(a.fila),
      a.tipo,
      a.columna ?? '',
      texto(a.valor),
      a.correccion === null ? '' : a.correccion.a === null ? '(vaciar)' : String(a.correccion.a),
      a.detalle,
    ]
      .map(celda)
      .join(','),
  );
  return ['fila,tipo,columna,valor,propuesta,detalle', ...filas].join('\n') + '\n';
}

const { carpeta, salida } = argumentos(process.argv.slice(2));
const archivos = readdirSync(carpeta)
  .filter((f) => f.toLowerCase().endsWith('.xlsx'))
  .sort();
if (salida) mkdirSync(salida, { recursive: true });

const op = { marcaClienteId: 'cliente', catalogo: [] };
let todoBien = archivos.length > 0;

for (const archivo of archivos) {
  const ficha = leerFicha(new Uint8Array(readFileSync(join(carpeta, archivo))));
  const fiel = isDeepStrictEqual(panelComoExcel(ficha.filas), ficha.panel);
  const anomalias = diagnosticarFicha(ficha);
  const propuestas = anomalias.flatMap((a) => (a.correccion ? [a.correccion] : []));
  const cuadra = [[], propuestas].map(
    (aceptadas) => verificarContraPanel(ficha, importarFicha(ficha, { ...op, aceptadas }), anomalias, op).cuadra,
  );

  const porTipo = new Map<string, number>();
  for (const a of anomalias) porTipo.set(a.tipo, (porTipo.get(a.tipo) ?? 0) + 1);
  const resumen = [...porTipo].map(([tipo, n]) => `${tipo}=${n}`).join(', ') || 'ninguna';
  const siNo = (b: boolean) => (b ? 'sí' : 'no');
  console.log(`${archivo} · ${ficha.datos.marca} · fiel: ${siNo(fiel)} · anomalías: ${resumen} · cuadra: ${cuadra.map(siNo).join(' / ')}`);

  if (salida) writeFileSync(join(salida, `${basename(archivo, '.xlsx')}.anomalias.csv`), csv(anomalias));
  if (!fiel || cuadra.includes(false)) todoBien = false;
}

if (archivos.length === 0) console.error(`No hay archivos .xlsx en ${carpeta}`);
process.exit(todoBien ? 0 : 1);
