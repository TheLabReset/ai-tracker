import { describe, expect, it } from 'vitest';
import { estimarCostoVuelta } from '../src/costo';
describe('estimarCostoVuelta', () => {
  const motores = [{ nombre: 'ChatGPT', costoEstimado: 0.01 }, { nombre: 'Gemini', costoEstimado: 0.02 }];
  it('multiplica preguntas × muestras × precio de cada motor', () => {
    const c = estimarCostoVuelta({ preguntas: 5, muestras: 3, cadencia: 'semanal', motores });
    expect(c.porVuelta).toBeCloseTo(0.45, 6);
    expect(c.porMes).toBeCloseTo(1.95, 6);
    expect(c.sinPrecio).toEqual([]);
    expect(estimarCostoVuelta({ preguntas: 5, muestras: 3, cadencia: 'manual', motores }).porMes).toBeNull();
  });
  it('sin precio no inventa un costo y dice qué motores faltan', () => {
    const c = estimarCostoVuelta({ preguntas: 5, muestras: 3, cadencia: 'semanal', motores: [...motores, { nombre: 'Claude', costoEstimado: null }] });
    expect(c).toEqual({ porVuelta: null, porMes: null, sinPrecio: ['Claude'] });
  });
});
