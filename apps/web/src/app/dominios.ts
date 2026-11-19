export function normalizarDominios(texto: string): string[] {
  const limpios = texto
    .split(',')
    .map((d) => d.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[/?#].*$/, ''))
    .filter((d) => d !== '');
  return [...new Set(limpios)];
}
