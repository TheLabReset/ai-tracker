import { describe, expect, it } from 'vitest';
import { dentroDelRuido, intervaloWilson } from '../src/metricas/ruido';
import { medir } from '../src/metricas/medidas';
import { catalogo } from './ayudas/catalogo';
import { mencion, respuesta } from './ayudas/respuestas';

const op = { esCliente: true, catalogo };
describe('medir', () => {
  const rs = [
    respuesta({ id: 'a', menciones: [mencion('pbs', 1)] }),
    respuesta({ id: 'b', motor: 'gemini', menciones: [mencion('esan', 1), mencion('pbs', 2)] }),
    respuesta({ id: 'c', motor: 'claude', menciones: [mencion('esan', 1)] }),
    respuesta({ id: 'd', motor: 'claude', menciones: [] }),
  ];
  it('cuenta tasas, puntos y posición', () => {
    expect(medir('nombra', rs, 'pbs', op)).toEqual({ valor: 50, exitos: 2, respuestas: 4 });
    expect(medir('puntos', rs, 'pbs', op)).toEqual({ valor: 1.25, exitos: 2, respuestas: 4 });
    expect(medir('posicion_media', rs, 'pbs', op)).toEqual({ valor: 1.5, exitos: 2, respuestas: 2 });
  });
  it('la respuesta vacía cuenta en el denominador', () => {
    expect(medir('nombra', [respuesta({})], 'pbs', op)).toEqual({ valor: 0, exitos: 0, respuestas: 1 });
  });
  it('excluye inválidas y, para no clientes, lo importado', () => {
    expect(medir('nombra', [...rs, respuesta({ valida: false, menciones: [mencion('pbs', 1)] })], 'pbs', op).respuestas).toBe(4);
    const imp = respuesta({
      origen: 'importada',
      menciones: [mencion('esan', null)],
      registroCliente: { nombra: 'Sí', puesto: '1º', sentimiento: null, fuente: null },
    });
    expect(medir('nombra', [imp], 'esan', { ...op, esCliente: false })).toEqual({ valor: null, exitos: 0, respuestas: 0 });
  });
  it('pondera por motor y tolera motores ausentes', () => {
    const p = [respuesta({ menciones: [mencion('pbs', 1)] }), respuesta({ motor: 'gemini', menciones: [] })];
    expect(medir('puntos', p, 'pbs', { ...op, pesosMotor: { chatgpt: 2, gemini: 1, perplexity: 1 } }).valor).toBe(2);
    expect(medir('puntos', [], 'pbs', op)).toEqual({ valor: null, exitos: 0, respuestas: 0 });
  });
  it('calcula share of voice y comparativa', () => {
    const sov = [respuesta({ menciones: [mencion('esan', 1), mencion('pbs', 2)] }), respuesta({ menciones: [mencion('esan', 1)] })];
    expect(medir('sov', sov, 'esan', op).valor).toBeCloseTo(66.667, 2);
    expect(medir('sov', sov, 'pbs', op).valor).toBeCloseTo(33.333, 2);
    const p2 = (ms: ReturnType<typeof mencion>[]) =>
      respuesta({ preguntaCodigo: 'P2', tipo: 'comparativa', competidorId: 'esan', menciones: ms });
    const comp = [
      p2([mencion('pbs', 1), mencion('esan', 2)]),
      p2([mencion('esan', 1), mencion('pbs', 2)]),
      p2([mencion('pbs', 1), mencion('esan', null)]),
    ];
    expect(medir('gana_comparacion', comp, 'pbs', op)).toMatchObject({ exitos: 2, respuestas: 3 });
  });
  it('posición media y share of voice usan solo respuestas automáticas', () => {
    const imp = respuesta({ origen: 'importada', registroCliente: { nombra: 'Sí', puesto: '1º', sentimiento: null, fuente: null } });
    expect(medir('sov', [imp], 'pbs', op)).toEqual({ valor: null, exitos: 0, respuestas: 0 });
    expect(medir('posicion_media', [imp], 'pbs', op)).toEqual({ valor: null, exitos: 0, respuestas: 0 });
  });
});

describe('ruido', () => {
  it('intervalo de Wilson al 90 %', () => {
    const [lo, hi] = intervaloWilson(8, 12);
    expect(lo).toBeCloseTo(0.4315, 3);
    expect(hi).toBeCloseTo(0.8405, 3);
    expect(intervaloWilson(0, 12)[1]).toBeCloseTo(0.184, 3);
    expect(intervaloWilson(0, 0)).toEqual([0, 1]);
  });
  it('un cambio dentro del ruido no se destaca', () => {
    expect(dentroDelRuido({ exitos: 8, n: 12 }, { exitos: 12, n: 12 })).toBe(true);
    expect(dentroDelRuido({ exitos: 3, n: 12 }, { exitos: 12, n: 12 })).toBe(false);
  });
});
