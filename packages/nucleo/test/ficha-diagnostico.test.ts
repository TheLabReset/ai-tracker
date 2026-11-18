import { describe, expect, it } from 'vitest';
import { aplicarCorrecciones, diagnosticarFicha, type Anomalia } from '../src/ficha/diagnostico';
import { fichaDe, fila } from './ayudas/filas';

const de = (as: Anomalia[], tipo: Anomalia['tipo']) => as.filter((a) => a.tipo === tipo);
const IAS = ['ChatGPT', 'Gemini', 'Claude', 'Perplexity'];
const vueltaCompleta = (vuelta: number, fecha: number, desde: number) =>
  ['P1', 'P2', 'P3', 'P4', 'P5'].flatMap((p, i) => IAS.map((ia, j) => fila(desde + i * 4 + j, { vuelta, fecha, pregunta: p, ia })));

describe('diagnosticarFicha', () => {
  it('propone valores canónicos sin aplicarlos', () => {
    const as = diagnosticarFicha(fichaDe([fila(2, { nombra: 'Si' }), fila(3, { fuente: 'No Cita' }), fila(4, { sentimiento: '-' }), fila(5, { vuelta: '3' })]));
    expect(de(as, 'valor_fuera_de_lista').map((a) => a.correccion)).toEqual([
      { id: '2:nombra', fila: 2, columna: 'nombra', de: 'Si', a: 'Sí' },
      { id: '3:fuente', fila: 3, columna: 'fuente', de: 'No Cita', a: 'No cita fuentes' },
      { id: '4:sentimiento', fila: 4, columna: 'sentimiento', de: '-', a: null },
      { id: '5:vuelta', fila: 5, columna: 'vuelta', de: '3', a: 3 },
    ]);
  });
  it('propone el número de una vuelta sin número', () => {
    const as = diagnosticarFicha(
      fichaDe([fila(2, { vuelta: 7, fecha: 46335 }), fila(3, { vuelta: null, fecha: 46335 }), fila(4, { vuelta: null, fecha: 46342 })]),
    );
    expect(de(as, 'vuelta_sin_numero').map((a) => [a.fila, a.correccion?.a])).toEqual([
      [3, 7],
      [4, 8],
    ]);
  });
  it('detecta puesto con "No", fórmulas rotas y filas incompletas como en la columna K', () => {
    const as = diagnosticarFicha(
      fichaDe([
        fila(2, { nombra: 'No', puesto: '2º' }),
        fila(3, { puntos: { error: '#REF!' } }),
        fila(4, { puesto: null }),
        fila(5, { fuente: null }),
        fila(6, { fuente: '-' }),
        fila(7, { ia: null }),
      ]),
    );
    expect(de(as, 'puesto_con_no')[0]?.correccion).toEqual({ id: '2:puesto', fila: 2, columna: 'puesto', de: '2º', a: null });
    expect(de(as, 'formula_rota').map((a) => [a.fila, a.correccion])).toEqual([[3, null]]);
    expect(de(as, 'fila_incompleta').map((a) => [a.fila, a.detalle])).toEqual([
      [4, 'Falta el puesto'],
      [5, 'Falta la fuente'],
      [7, 'Falta vuelta, pregunta o IA'],
    ]);
  });
  it('informa vuelta fuera de su semana y cobertura incompleta', () => {
    const sinPerplexity = vueltaCompleta(1, 46293, 2).filter((f) => f.ia !== 'Perplexity');
    const as = diagnosticarFicha(fichaDe([...sinPerplexity, ...vueltaCompleta(2, 46286, 30)])); // 46286 = 21/09/2026, semana 0
    expect(de(as, 'cobertura_incompleta').map((a) => a.vuelta)).toEqual([1]);
    expect(de(as, 'cobertura_incompleta')[0]?.detalle).toContain('Perplexity');
    expect(de(as, 'vuelta_distinta_de_semana').map((a) => a.vuelta)).toEqual([2]);
  });
});

describe('aplicarCorrecciones', () => {
  it('solo cambia lo aceptado y no muta', () => {
    const filas = [fila(2, { nombra: 'Si' }), fila(3, { fuente: 'No Cita' })];
    const copia = structuredClone(filas);
    expect(aplicarCorrecciones(filas, [])).toEqual(filas);
    const r = aplicarCorrecciones(filas, [{ id: '2:nombra', fila: 2, columna: 'nombra', de: 'Si', a: 'Sí' }]);
    expect(r[0]?.nombra).toBe('Sí');
    expect(r[1]?.fuente).toBe('No Cita');
    expect(filas).toEqual(copia);
  });
});
