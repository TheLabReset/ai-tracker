/** Constantes y tipos de dominio compartidos por todo el núcleo (§1.1, §4 y §5 del spec). */

export const CODIGOS_COMPAT = ['P1', 'P2', 'P3', 'P4', 'P5'] as const;
export type CodigoCompat = (typeof CODIGOS_COMPAT)[number];

export type TipoPregunta = 'descubrimiento' | 'comparativa' | 'marca';

export const TIPO_DE_PREGUNTA_COMPAT: Record<CodigoCompat, TipoPregunta> = {
  P1: 'descubrimiento',
  P2: 'comparativa',
  P3: 'descubrimiento',
  P4: 'descubrimiento',
  P5: 'marca',
};

export const IAS_FICHA = ['ChatGPT', 'Gemini', 'Claude', 'Perplexity'] as const;
export type IaFicha = (typeof IAS_FICHA)[number];

/** 'chatgpt' | 'gemini' | 'claude' | 'perplexity' | … (el catálogo de motores es abierto). */
export type CodigoMotor = string;

export const MOTOR_DE_IA: Record<IaFicha, CodigoMotor> = {
  ChatGPT: 'chatgpt',
  Gemini: 'gemini',
  Claude: 'claude',
  Perplexity: 'perplexity',
};

export const NOS_NOMBRA = ['Sí', 'No'] as const;
export type NosNombra = (typeof NOS_NOMBRA)[number];

/** Con "º" (U+00BA), como en la ficha; nunca "°". */
export const PUESTOS = ['1º', '2º', '3º', 'Más abajo'] as const;
export type Puesto = (typeof PUESTOS)[number];

export const SENTIMIENTOS = ['Bien', 'Neutral', 'Mal'] as const;
export type Sentimiento = (typeof SENTIMIENTOS)[number];

/** Las 6 fuentes de la ficha más "No cita fuentes" (§5.4, paso 5). */
export const FUENTES = [
  'Medio de prensa',
  'Comparador',
  'Reseña',
  'Nuestra web',
  'Red social',
  'Otra',
  'No cita fuentes',
] as const;
export type Fuente = (typeof FUENTES)[number];

export const FUENTES_TERCEROS: readonly Fuente[] = ['Medio de prensa', 'Comparador', 'Reseña'];

export type CategoriaDominio = 'Medio de prensa' | 'Comparador' | 'Reseña' | 'Red social' | 'Otra' | 'Web de marca';

export interface Pesos {
  1: number;
  2: number;
  3: number;
}

/** 1º = 3, 2º = 2, 3º = 1; "Más abajo" o "No" = 0. */
export const PESOS_EXCEL: Pesos = { 1: 3, 2: 2, 3: 1 };

export type ValorCelda = string | number | boolean | null | { error: string };

export interface AliasMarca {
  texto: string;
  ambiguo: boolean;
}

export interface MarcaCatalogo {
  id: string;
  nombre: string;
  /** El nombre mismo es una palabra común (Win, Bata, Reset…). */
  ambiguo: boolean;
  alias: AliasMarca[];
  dominios: string[];
}

export interface Mencion {
  /** null = marca descubierta (fuera del catálogo). */
  marcaId: string | null;
  textoDetectado: string;
  /** 1 = primera en aparecer. */
  orden: number;
  /** Lugar entre las recomendadas, sin repetir; null = no recomendada o desconocida. */
  posicion: number | null;
  recomendada: boolean;
  sentimiento: Sentimiento;
  fragmento: string;
  via: 'nombre' | 'alias' | 'alias_ambiguo' | null;
}

export interface CitaClasificada {
  url: string;
  dominio: string;
  categoria: CategoriaDominio;
  marcaId: string | null;
  conocido: boolean;
}

/** Lo que anotó el equipo en la ficha (solo vueltas importadas). */
export interface RegistroCliente {
  nombra: NosNombra | null;
  puesto: Puesto | null;
  sentimiento: Sentimiento | null;
  fuente: Fuente | null;
}

export interface Respuesta {
  id: string;
  vuelta: number;
  preguntaCodigo: string;
  tipo: TipoPregunta;
  motor: CodigoMotor;
  muestra: number;
  origen: 'auto' | 'importada';
  /** false = no cuenta en los indicadores (p. ej., fila incompleta). */
  valida: boolean;
  competidorId?: string;
  filaOrigen?: number;
  menciones: Mencion[];
  citas: CitaClasificada[];
  registroCliente?: RegistroCliente;
}
