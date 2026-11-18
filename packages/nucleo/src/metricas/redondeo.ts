/** Redondea como ROUND de Excel. */
export function redondearExcel(x: number, decimales: number): number {
  const factor = 10 ** decimales;
  const escalado = Number((Math.abs(x) * factor).toPrecision(15));
  return (Math.sign(x) * Math.round(escalado)) / factor;
}
