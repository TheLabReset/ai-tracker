import type { MarcaCatalogo, Mencion, ValorCelda } from './dominio';
import { claveMarca } from './texto';

export interface Resolucion {
  marcaId: string | null;
  via: Mencion['via'];
}

/** Resuelve un nombre tal como aparece al id de una marca del catálogo, por nombre o alias. */
export function resolverMarca(texto: string, catalogo: MarcaCatalogo[]): Resolucion {
  const clave = claveMarca(texto);
  if (clave === '') return { marcaId: null, via: null };
  for (const marca of catalogo) {
    if (claveMarca(marca.nombre) === clave) {
      return { marcaId: marca.id, via: marca.ambiguo ? 'alias_ambiguo' : 'nombre' };
    }
    const alias = marca.alias.find((a) => claveMarca(a.texto) === clave);
    if (alias) return { marcaId: marca.id, via: alias.ambiguo ? 'alias_ambiguo' : 'alias' };
  }
  return { marcaId: null, via: null };
}

const SEPARADORES = /,|;|\/|\n|\s+(?:y|e|o)\s+/i;
const NO_ES_MARCA = /^(no (menciona|nombra|hay|aparece)|ningun[oa]?|n\/?a)\b/i;

/** "CENTRUM, ESAN y UP" → ['CENTRUM', 'ESAN', 'UP']. Descarta textos que no son marcas. */
export function dividirListaMarcas(texto: ValorCelda): string[] {
  if (typeof texto !== 'string') return [];
  return texto
    .split(SEPARADORES)
    .map((parte) => parte.replace(/^[\s.\-–—]+|[\s.\-–—]+$/g, ''))
    .filter((parte) => parte !== '' && !NO_ES_MARCA.test(parte));
}

/** Palabras comunes de nuestra propia cartera y del sector (§5.4, "Ojo con nuestra propia cartera"). */
export const PALABRAS_COMUNES: readonly string[] = ['win', 'bata', 'reset', 'pad', 'san fernando', 'claro', 'gloria'];

/** ¿Conviene marcar este nombre o alias como ambiguo? Lo decide una persona; esto solo lo sugiere. */
export function sugerirAmbiguo(termino: string): boolean {
  const clave = claveMarca(termino);
  return clave.length <= 3 || PALABRAS_COMUNES.some((p) => claveMarca(p) === clave);
}

/** Nombres o alias que resuelven a más de una marca del catálogo. */
export function validarCatalogo(catalogo: MarcaCatalogo[]): Array<{ clave: string; marcas: string[] }> {
  const porClave = new Map<string, string[]>();
  for (const marca of catalogo) {
    for (const termino of [marca.nombre, ...marca.alias.map((a) => a.texto)]) {
      const clave = claveMarca(termino);
      const ids = porClave.get(clave) ?? [];
      if (!ids.includes(marca.id)) ids.push(marca.id);
      porClave.set(clave, ids);
    }
  }
  return [...porClave].filter(([, ids]) => ids.length > 1).map(([clave, marcas]) => ({ clave, marcas }));
}
