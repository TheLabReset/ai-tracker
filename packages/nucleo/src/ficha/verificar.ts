import type { MarcaCatalogo } from '../dominio';
import { calcularIndicador, type ValorIndicador } from '../indicadores/calcular';
import { indicadorInicial } from '../indicadores/catalogo';
import type { Medida } from '../metricas/medidas';
import { redondearExcel } from '../metricas/redondeo';
import type { Anomalia, ColumnaRegistro } from './diagnostico';
import type { ResultadoImportacion } from './importar';
import type { FichaCruda, IndicadoresPanelVuelta } from './leer';

export interface DiferenciaPanel {
  vuelta: number | 'ultima';
  medida: keyof IndicadoresPanelVuelta | 'ultimaVuelta';
  panel: number | null;
  calculado: number | null;
  explicadaPor: Anomalia[];
}

export interface ResultadoVerificacion {
  cuadra: boolean;
  diferencias: DiferenciaPanel[];
}

/** Las columnas de la ficha de las que depende cada cifra del Panel. */
const COLUMNAS_DE: Record<DiferenciaPanel['medida'], ColumnaRegistro[]> = {
  ultimaVuelta: [],
  respuestas: [],
  nombraVeces: ['nombra'],
  nombraPct: ['nombra'],
  primeroVeces: ['puesto'],
  primeroPct: ['puesto'],
  puntos: ['nombra', 'puesto'],
  hablaBien: ['sentimiento'],
  hablaMal: ['sentimiento'],
  citaWeb: ['fuente'],
  citaTerceros: ['fuente'],
};
const MEDIDAS_DE_PUESTO: ReadonlySet<DiferenciaPanel['medida']> = new Set(['primeroVeces', 'primeroPct']);

/** Anomalías que sacan una fila del cálculo (o la meten): afectan a todas las cifras de su vuelta. */
function cambiaLasFilas(a: Anomalia): boolean {
  if (a.tipo === 'vuelta_sin_numero' || a.tipo === 'fuera_del_panel') return true;
  if (a.tipo === 'fila_incompleta') return a.detalle === 'Falta vuelta, pregunta o IA' || a.detalle === 'Falta ¿nos nombra?';
  return a.tipo === 'valor_fuera_de_lista' && a.columna !== null && ['vuelta', 'pregunta', 'ia', 'nombra'].includes(a.columna);
}

/** ¿Puede esta anomalía explicar una diferencia en esta cifra? */
function explica(a: Anomalia, medida: DiferenciaPanel['medida']): boolean {
  if (cambiaLasFilas(a)) return true;
  if (a.tipo === 'valor_fuera_de_lista') return a.columna !== null && COLUMNAS_DE[medida].includes(a.columna);
  if (a.tipo === 'puesto_con_no') return MEDIDAS_DE_PUESTO.has(medida);
  return false;
}
const MEDIDAS_PANEL: Array<keyof IndicadoresPanelVuelta> = [
  'respuestas',
  'nombraVeces',
  'nombraPct',
  'primeroVeces',
  'primeroPct',
  'puntos',
  'hablaBien',
  'hablaMal',
  'citaWeb',
  'citaTerceros',
];

const redondear = (v: number | null, d: number) => (v === null ? null : redondearExcel(v, d));

/** Compara lo importado con el Panel de la ficha, vuelta por vuelta. */
export function verificarContraPanel(
  ficha: FichaCruda,
  resultado: ResultadoImportacion,
  anomalias: Anomalia[],
  op: { marcaClienteId: string; catalogo: MarcaCatalogo[] },
): ResultadoVerificacion {
  const importadas = resultado.respuestas.filter((r) => r.origen === 'importada');
  const res = calcularIndicador(indicadorInicial('como-en-el-excel'), importadas, { id: op.marcaClienteId, esCliente: true }, op.catalogo);
  const porVuelta = new Map<number, Map<Medida, ValorIndicador>>();
  if (res.aplica) {
    for (const v of res.valores) {
      if (v.motor !== null) continue;
      const m = porVuelta.get(v.vuelta) ?? new Map<Medida, ValorIndicador>();
      m.set(v.medida, v);
      porVuelta.set(v.vuelta, m);
    }
  }

  const calcularVuelta = (k: number): IndicadoresPanelVuelta => {
    const m = porVuelta.get(k);
    const de = (medida: Medida) => m?.get(medida);
    return {
      respuestas: de('nombra')?.respuestas ?? 0,
      nombraVeces: de('nombra')?.exitos ?? 0,
      nombraPct: redondear(de('nombra')?.valor ?? null, 0),
      primeroVeces: de('primero')?.exitos ?? 0,
      primeroPct: redondear(de('primero')?.valor ?? null, 0),
      puntos: redondear(de('puntos')?.valor ?? null, 1),
      hablaBien: de('habla_bien')?.exitos ?? 0,
      hablaMal: de('habla_mal')?.exitos ?? 0,
      citaWeb: de('cita_web')?.exitos ?? 0,
      citaTerceros: de('cita_terceros')?.exitos ?? 0,
    };
  };
  const explican = (medida: DiferenciaPanel['medida'], ...vueltas: Array<number | null>) =>
    anomalias.filter((a) => a.vuelta !== null && vueltas.includes(a.vuelta) && explica(a, medida));

  const diferencias: DiferenciaPanel[] = [];
  for (let k = 1; k <= 6; k++) {
    const panel = ficha.panel.vueltas[k as 1];
    const calculado = calcularVuelta(k);
    for (const medida of MEDIDAS_PANEL) {
      if (panel[medida] !== calculado[medida]) {
        diferencias.push({ vuelta: k, medida, panel: panel[medida], calculado: calculado[medida], explicadaPor: explican(medida, k) });
      }
    }
  }

  const conRespuestas = [...porVuelta.entries()].filter(([, m]) => (m.get('nombra')?.respuestas ?? 0) > 0).map(([k]) => k);
  const ultimaCalculada = conRespuestas.length > 0 ? Math.max(...conRespuestas) : null;
  const ultima = ultimaCalculada === null ? null : calcularVuelta(ultimaCalculada);
  const comparaciones: Array<[DiferenciaPanel['medida'], number | null, number | null]> = [
    ['ultimaVuelta', ficha.panel.ultimaVuelta, ultimaCalculada],
    ['nombraPct', ficha.panel.ultima.nombraPct, ultima?.nombraPct ?? null],
    ['primeroPct', ficha.panel.ultima.primeroPct, ultima?.primeroPct ?? null],
    ['puntos', ficha.panel.ultima.puntos, ultima?.puntos ?? null],
  ];
  for (const [medida, panel, calculado] of comparaciones) {
    if (panel !== calculado) {
      diferencias.push({ vuelta: 'ultima', medida, panel, calculado, explicadaPor: explican(medida, ultimaCalculada, ficha.panel.ultimaVuelta) });
    }
  }

  return { cuadra: diferencias.every((d) => d.explicadaPor.length > 0), diferencias };
}
