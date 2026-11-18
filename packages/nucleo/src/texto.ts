const PALABRAS_MENORES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'o', 'e', 'en']);

function sinTildes(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '');
}

/** Sin tildes, en minúsculas, con todo lo que no es letra o dígito convertido en espacio y los espacios colapsados. */
export function normalizarTexto(s: string): string {
  return sinTildes(s)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Clave para comparar marcas: `normalizarTexto` sin espacios ("Mi Fibra" = "MiFibra"). */
export function claveMarca(s: string): string {
  return normalizarTexto(s).replace(/ /g, '');
}

/** ¿Aparece `termino` en `texto` como palabra (o frase) completa, sin importar tildes ni mayúsculas? */
export function contieneTermino(texto: string, termino: string): boolean {
  const t = normalizarTexto(termino);
  if (t === '') return false;
  return ` ${normalizarTexto(texto)} `.includes(` ${t} `);
}

export function esTodoMayusculas(s: string): boolean {
  return /\p{L}/u.test(s) && s === s.toLocaleUpperCase('es') && s !== s.toLocaleLowerCase('es');
}

/** "PROGRAMA DE ALTA DIRECCIÓN" → "Programa de Alta Dirección". */
export function aTitulo(s: string): string {
  return s
    .trim()
    .toLocaleLowerCase('es')
    .split(/\s+/)
    .map((palabra, i) =>
      i > 0 && PALABRAS_MENORES.has(palabra) ? palabra : palabra.charAt(0).toLocaleUpperCase('es') + palabra.slice(1),
    )
    .join(' ');
}

/** ['A', 'B', 'C'] → "A, B y C", como se escribe en la ficha. */
export function unirLista(nombres: string[]): string {
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}
