/** Intervalo de Wilson para una tasa (proporción de 0 a 1). z = 1.645 da el 90 % (§5.3). */
export function intervaloWilson(exitos: number, n: number, z = 1.645): [number, number] {
  if (n === 0) return [0, 1];
  const p = exitos / n;
  const z2 = z * z;
  const denominador = 1 + z2 / n;
  const centro = (p + z2 / (2 * n)) / denominador;
  const margen = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denominador;
  return [Math.max(0, centro - margen), Math.min(1, centro + margen)];
}

/** Si los intervalos de dos vueltas se cruzan, el cambio está "dentro del ruido" y no se destaca. */
export function dentroDelRuido(a: { exitos: number; n: number }, b: { exitos: number; n: number }, z = 1.645): boolean {
  const [aBajo, aAlto] = intervaloWilson(a.exitos, a.n, z);
  const [bBajo, bAlto] = intervaloWilson(b.exitos, b.n, z);
  return aBajo <= bAlto && bBajo <= aAlto;
}
