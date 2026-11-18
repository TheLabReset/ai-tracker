import { describe, expect, it } from 'vitest';
import { redondearExcel } from '../src/metricas/redondeo';

describe('redondearExcel', () => {
  it('redondea la mitad alejándose de cero, como ROUND de Excel', () => {
    expect(redondearExcel(2.5, 0)).toBe(3);
    expect(redondearExcel(-2.5, 0)).toBe(-3);
    expect(redondearExcel(1.25, 1)).toBe(1.3);
    expect(redondearExcel(1.45, 1)).toBe(1.5); // 1.45 en binario es 1.4499…
    expect(redondearExcel(0.285 * 100, 0)).toBe(29); // 28.499999999999996
    expect(redondearExcel((13 / 15) * 100, 0)).toBe(87);
  });
});
