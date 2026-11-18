import type { MarcaCatalogo, Pesos, Respuesta } from '../dominio';
import { evaluarMarca, type Evaluacion } from '../evaluacion';

export const MEDIDAS = [
  'nombra',
  'primero',
  'puntos',
  'posicion_media',
  'sov',
  'gana_comparacion',
  'habla_bien',
  'habla_mal',
  'cita_web',
  'cita_terceros',
] as const;
export type Medida = (typeof MEDIDAS)[number];

export interface OpcionesMedida {
  esCliente: boolean;
  catalogo: MarcaCatalogo[];
  pesosMotor?: Record<string, number>;
  pesos?: Pesos;
}

/** `valor` va ponderado por motor; `exitos` y `respuestas` son cuentas sin ponderar. */
export interface ResultadoMedida {
  valor: number | null;
  exitos: number;
  respuestas: number;
}

const TASAS: Partial<Record<Medida, (e: Evaluacion) => boolean>> = {
  nombra: (e) => e.nombra,
  primero: (e) => e.puesto === '1º',
  habla_bien: (e) => e.sentimiento === 'Bien',
  habla_mal: (e) => e.sentimiento === 'Mal',
  cita_web: (e) => e.citaWeb,
  cita_terceros: (e) => e.citaTerceros,
};

interface Muestra {
  peso: number;
  valor: number;
  exito: boolean;
}

function agregar(muestras: Muestra[]): ResultadoMedida {
  const pesoTotal = muestras.reduce((s, m) => s + m.peso, 0);
  const exitos = muestras.filter((m) => m.exito).length;
  if (muestras.length === 0 || pesoTotal === 0) return { valor: null, exitos, respuestas: muestras.length };
  return { valor: muestras.reduce((s, m) => s + m.peso * m.valor, 0) / pesoTotal, exitos, respuestas: muestras.length };
}

function ganaComparacion(r: Respuesta, marcaId: string, e: Evaluacion): boolean {
  if (r.origen === 'importada') return e.puesto === '1º';
  const rival = r.menciones.find((m) => m.marcaId === r.competidorId)?.posicion ?? null;
  return e.posicion !== null && (rival === null || e.posicion < rival);
}

/**
 * Calcula una medida para una marca sobre un conjunto de respuestas (§5.5). Cada respuesta pesa lo
 * que pesa su motor; un motor ausente simplemente no suma. Para marcas que no son cliente solo
 * cuentan las respuestas automáticas (las importadas no traen la posición de los competidores).
 */
export function medir(medida: Medida, respuestas: Respuesta[], marcaId: string, op: OpcionesMedida): ResultadoMedida {
  const base = respuestas.filter((r) => r.valida && (op.esCliente || r.origen === 'auto'));
  const peso = (r: Respuesta) => op.pesosMotor?.[r.motor] ?? 1;
  const evaluar = (r: Respuesta) => evaluarMarca(r, marcaId, { esCliente: op.esCliente, pesos: op.pesos });

  const tasa = TASAS[medida];
  if (tasa) {
    return agregar(
      base.map((r) => {
        const exito = tasa(evaluar(r));
        return { peso: peso(r), valor: exito ? 100 : 0, exito };
      }),
    );
  }

  switch (medida) {
    case 'puntos':
      return agregar(
        base.map((r) => {
          const puntos = evaluar(r).puntos;
          return { peso: peso(r), valor: puntos, exito: puntos > 0 };
        }),
      );
    case 'posicion_media':
      return agregar(
        base.flatMap((r) => {
          const posicion = evaluar(r).posicion;
          return posicion === null ? [] : [{ peso: peso(r), valor: posicion, exito: true }];
        }),
      );
    case 'gana_comparacion':
      return agregar(
        base
          .filter((r) => r.tipo === 'comparativa' && r.competidorId !== undefined)
          .map((r) => {
            const exito = ganaComparacion(r, marcaId, evaluar(r));
            return { peso: peso(r), valor: exito ? 100 : 0, exito };
          }),
      );
    case 'sov': {
      const marcas = new Set([...op.catalogo.map((c) => c.id), marcaId]);
      let numerador = 0;
      let denominador = 0;
      let exitos = 0;
      for (const r of base) {
        const propia = evaluar(r).nombra;
        const otras = [...marcas].filter((id) => id !== marcaId && r.menciones.some((m) => m.marcaId === id)).length;
        numerador += peso(r) * (propia ? 1 : 0);
        denominador += peso(r) * ((propia ? 1 : 0) + otras);
        if (propia) exitos += 1;
      }
      return { valor: denominador === 0 ? null : (numerador / denominador) * 100, exitos, respuestas: base.length };
    }
    default:
      throw new Error(`Medida desconocida: ${medida}`);
  }
}
