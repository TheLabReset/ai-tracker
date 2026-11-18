/**
 * Redondea como ROUND de Excel: la mitad se aleja de cero y el valor se
 * corrige antes a 15 dígitos significativos, que es la precisión con que
 * Excel muestra y redondea (1.45 → 1.5 aunque en binario sea 1.4499…).
 */
export function redondearExcel(x: number, decimales: number): number {
  const factor = 10 ** decimales;
  const escalado = Number((Math.abs(x) * factor).toPrecision(15));
  return (Math.sign(x) * Math.round(escalado)) / factor;
}
