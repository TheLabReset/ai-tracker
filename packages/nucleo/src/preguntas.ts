import { TIPO_DE_PREGUNTA_COMPAT, type TipoPregunta } from './dominio';
import { claveMarca } from './texto';

export interface Plantilla {
  codigo: string;
  tipo: TipoPregunta;
  texto: string;
}

export const VARIABLES_PLANTILLA = ['categoria', 'marca', 'competidor', 'ciudad', 'pais', 'necesidad'] as const;
export type VariablePlantilla = (typeof VARIABLES_PLANTILLA)[number];
export type VariablesPlantilla = Partial<Record<VariablePlantilla, string>>;

/** Las 5 preguntas de la hoja Preguntas de la ficha, con su texto exacto (§1.1). */
export const PLANTILLAS_COMPAT: readonly Plantilla[] = [
  { codigo: 'P1', tipo: TIPO_DE_PREGUNTA_COMPAT.P1, texto: '¿Qué marca de {categoria} me recomiendas en Perú?' },
  { codigo: 'P2', tipo: TIPO_DE_PREGUNTA_COMPAT.P2, texto: '¿{marca} o {competidor}? ¿Cuál me conviene?' },
  { codigo: 'P3', tipo: TIPO_DE_PREGUNTA_COMPAT.P3, texto: '¿Qué marcas de {categoria} son confiables en Perú?' },
  { codigo: 'P4', tipo: TIPO_DE_PREGUNTA_COMPAT.P4, texto: '¿Cuál es la mejor opción de {categoria} en Perú hoy?' },
  { codigo: 'P5', tipo: TIPO_DE_PREGUNTA_COMPAT.P5, texto: '¿Qué opinan de {marca}?' },
];

export class ErrorVariableFaltante extends Error {
  constructor(public readonly variable: string) {
    super(`Falta el valor de la variable {${variable}}`);
    this.name = 'ErrorVariableFaltante';
  }
}

const VARIABLE = /\{(\w+)\}/g;

export function variablesDe(texto: string): string[] {
  return [...texto.matchAll(VARIABLE)].map((m) => m[1]!);
}

/** Variables del texto que no están en `VARIABLES_PLANTILLA`, sin repetir y en orden de aparición. */
export function variablesDesconocidas(texto: string): string[] {
  const conocidas = new Set<string>(VARIABLES_PLANTILLA);
  return [...new Set(variablesDe(texto))].filter((v) => !conocidas.has(v));
}

/** Fragmentos con llaves que no son un `{nombre}` bien formado, sin repetir y en orden. */
export function llavesMalformadas(texto: string): string[] {
  const fragmentos = texto.match(/\{[^{}]*\}?|\}/g) ?? [];
  return [...new Set(fragmentos.filter((f) => !/^\{\w+\}$/.test(f)))];
}

export function renderizarPlantilla(texto: string, vars: VariablesPlantilla): string {
  return texto.replace(VARIABLE, (_, nombre: string) => {
    const valor = (vars as Record<string, string | undefined>)[nombre];
    if (valor === undefined || valor === '') throw new ErrorVariableFaltante(nombre);
    return valor;
  });
}

export function armarSetCompat(d: { categoria: string; marca: string; competidor: string }): Plantilla[] {
  return PLANTILLAS_COMPAT.map((p) => ({ codigo: p.codigo, tipo: p.tipo, texto: renderizarPlantilla(p.texto, d) }));
}

const CODIGOS_EXTENDIDO = new Set<string>(['P1', 'P3', 'P4']);

/** P1, P3 y P4 por cada categoría específica; el código lleva la categoría para distinguirlas. */
export function armarSetExtendido(categorias: string[]): Array<Plantilla & { categoria: string }> {
  return categorias.flatMap((categoria) =>
    PLANTILLAS_COMPAT.filter((p) => CODIGOS_EXTENDIDO.has(p.codigo)).map((p) => ({
      codigo: `${p.codigo}·${claveMarca(categoria)}`,
      tipo: p.tipo,
      texto: renderizarPlantilla(p.texto, { categoria }),
      categoria,
    })),
  );
}
