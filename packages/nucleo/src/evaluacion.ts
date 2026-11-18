import {
  FUENTES_TERCEROS,
  MOTOR_DE_IA,
  PESOS_EXCEL,
  type Fuente,
  type MarcaCatalogo,
  type Pesos,
  type Puesto,
  type Respuesta,
  type Sentimiento,
} from './dominio';
import { fuenteDeFila } from './fuentes';
import { unirLista } from './texto';

export interface Evaluacion {
  nombra: boolean;
  puesto: Puesto | null;
  posicion: number | null;
  puntos: number;
  sentimiento: Sentimiento | null;
  citaWeb: boolean;
  citaTerceros: boolean;
}

export interface OpcionesEvaluacion {
  esCliente: boolean;
  pesos?: Pesos;
}

const NO_EVALUADA: Evaluacion = {
  nombra: false,
  puesto: null,
  posicion: null,
  puntos: 0,
  sentimiento: null,
  citaWeb: false,
  citaTerceros: false,
};

const POSICION_DE_PUESTO: Partial<Record<Puesto, number>> = { '1º': 1, '2º': 2, '3º': 3 };

/** 1, 2, 3 → "1º", "2º", "3º"; 4 o más, o nombrada sin posición → "Más abajo"; no nombrada → null. */
export function puestoDesdePosicion(posicion: number | null, nombra: boolean): Puesto | null {
  if (!nombra) return null;
  if (posicion === 1) return '1º';
  if (posicion === 2) return '2º';
  if (posicion === 3) return '3º';
  return 'Más abajo';
}

export function puntosDePuesto(puesto: Puesto | null, pesos: Pesos = PESOS_EXCEL): number {
  const posicion = puesto ? POSICION_DE_PUESTO[puesto] : undefined;
  return posicion ? pesos[posicion as 1 | 2 | 3] : 0;
}

function esTercero(categoria: string): boolean {
  return (FUENTES_TERCEROS as readonly string[]).includes(categoria);
}

/** Cómo le fue a una marca en una respuesta, con la misma regla para todas las marcas (§5.4, paso 4). */
export function evaluarMarca(r: Respuesta, marcaId: string, op: OpcionesEvaluacion): Evaluacion {
  if (r.origen === 'importada') {
    if (!op.esCliente) {
      return { ...NO_EVALUADA, nombra: r.menciones.some((m) => m.marcaId === marcaId) };
    }
    const reg = r.registroCliente ?? { nombra: null, puesto: null, sentimiento: null, fuente: null };
    const nombra = reg.nombra === 'Sí';
    return {
      nombra,
      // Se conserva el puesto tal como lo anotó el equipo, aunque la fila diga "No".
      puesto: reg.puesto,
      posicion: nombra && reg.puesto ? (POSICION_DE_PUESTO[reg.puesto] ?? null) : null,
      puntos: nombra ? puntosDePuesto(reg.puesto, op.pesos) : 0,
      sentimiento: reg.sentimiento,
      citaWeb: reg.fuente === 'Nuestra web',
      citaTerceros: reg.fuente !== null && esTercero(reg.fuente),
    };
  }

  const m = r.menciones.find((x) => x.marcaId === marcaId);
  const nombra = m !== undefined;
  const posicion = m?.posicion ?? null;
  // Regla de P5 (§5.1): si la pregunta de marca la nombra, cuenta como 1.º.
  const puesto = r.tipo === 'marca' && nombra ? '1º' : puestoDesdePosicion(posicion, nombra);
  return {
    nombra,
    puesto,
    posicion,
    puntos: puntosDePuesto(puesto, op.pesos),
    sentimiento: m?.sentimiento ?? null,
    citaWeb: r.citas.some((c) => c.categoria === 'Web de marca' && c.marcaId === marcaId),
    citaTerceros: r.citas.some((c) => esTercero(c.categoria)),
  };
}

export interface FilaRegistro {
  pregunta: string;
  ia: string;
  nombra: 'Sí' | 'No';
  puesto: Puesto | null;
  sentimiento: Sentimiento | null;
  fuente: Fuente;
  marcasAntes: string;
  puntos: number;
}

const IA_DE_MOTOR = new Map(Object.entries(MOTOR_DE_IA).map(([ia, motor]) => [motor, ia]));

/** Una respuesta automática con el formato de la hoja Registro, para exportar (M12). */
export function filaRegistro(r: Respuesta, marcaId: string, catalogo: MarcaCatalogo[]): FilaRegistro {
  const e = evaluarMarca(r, marcaId, { esCliente: true });
  const recomendadas = r.menciones
    .filter((m) => m.posicion !== null && m.marcaId !== marcaId)
    .sort((a, b) => (a.posicion ?? 0) - (b.posicion ?? 0));
  const antes =
    e.puesto === '1º' ? [] : e.posicion !== null ? recomendadas.filter((m) => (m.posicion ?? 0) < (e.posicion ?? 0)) : recomendadas;
  const nombreDe = (id: string | null, texto: string) => catalogo.find((c) => c.id === id)?.nombre ?? texto;
  return {
    pregunta: r.preguntaCodigo,
    ia: IA_DE_MOTOR.get(r.motor) ?? r.motor,
    nombra: e.nombra ? 'Sí' : 'No',
    puesto: e.puesto,
    sentimiento: e.sentimiento,
    fuente: fuenteDeFila(r.citas, marcaId),
    marcasAntes: unirLista(antes.map((m) => nombreDe(m.marcaId, m.textoDetectado))),
    puntos: e.puntos,
  };
}
