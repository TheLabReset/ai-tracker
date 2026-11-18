import { describe, expect, it } from 'vitest';
import { DefinicionIndicadorSchema, soloCliente } from '../src/indicadores/definicion';
import { calcularIndicador } from '../src/indicadores/calcular';
import { INDICADORES_INICIALES, indicadorInicial } from '../src/indicadores/catalogo';
import { catalogo } from './ayudas/catalogo';
import { mencion, respuesta } from './ayudas/respuestas';

const rs = [
  respuesta({ id: '1', vuelta: 1, menciones: [mencion('pbs', 1), mencion('esan', 2)] }),
  respuesta({ id: '2', vuelta: 1, motor: 'gemini', menciones: [mencion('esan', 1), mencion('pbs', 2)] }),
  respuesta({ id: '3', vuelta: 1, preguntaCodigo: 'P2', tipo: 'comparativa', competidorId: 'esan', menciones: [mencion('pbs', 1)] }),
  respuesta({ id: '4', vuelta: 2, menciones: [mencion('esan', 1)] }),
  respuesta({ id: '5', vuelta: 2, motor: 'gemini', menciones: [mencion('esan', 1), mencion('x', 2), mencion('pbs', 3)] }),
];
const serie = (r: ReturnType<typeof calcularIndicador>, medida = 'puntos', motor: string | null = null) =>
  r.aplica ? r.valores.filter((v) => v.medida === medida && v.motor === motor).map((v) => [v.vuelta, v.valor]) : r.motivo;
const cliente = { id: 'pbs', esCliente: true };

describe('indicadores', () => {
  it('valida definiciones', () => {
    const ok = indicadorInicial('visibilidad-abierta');
    expect(() => DefinicionIndicadorSchema.parse({ ...ok, preguntas: {} })).toThrow();
    expect(() => DefinicionIndicadorSchema.parse({ ...ok, motores: [{ codigo: 'chatgpt', peso: 0 }] })).toThrow();
    expect(() => DefinicionIndicadorSchema.parse({ ...ok, periodo: { tipo: 'ultimas', n: 1 } })).toThrow();
    for (const d of INDICADORES_INICIALES) expect(() => DefinicionIndicadorSchema.parse(d)).not.toThrow();
  });
  it('trae los 6 indicadores iniciales', () => {
    expect(INDICADORES_INICIALES.map((d) => d.id)).toEqual([
      'visibilidad-abierta',
      'visibilidad-por-motor',
      'como-en-el-excel',
      'comparativa',
      'reputacion',
      'share-of-voice',
    ]);
    expect(soloCliente(indicadorInicial('visibilidad-abierta'))).toBe(false);
    expect(soloCliente(indicadorInicial('como-en-el-excel'))).toBe(true);
  });
  it('Visibilidad abierta usa solo P1, P3 y P4', () => {
    expect(serie(calcularIndicador(indicadorInicial('visibilidad-abierta'), rs, cliente, catalogo))).toEqual([
      [1, 2.5],
      [2, 0.5],
    ]);
  });
  it('se calcula igual para un competidor con las mismas respuestas', () => {
    expect(serie(calcularIndicador(indicadorInicial('visibilidad-abierta'), rs, { id: 'esan', esCliente: false }, catalogo))).toEqual([
      [1, 2.5],
      [2, 3],
    ]);
    expect(serie(calcularIndicador(indicadorInicial('comparativa'), rs, { id: 'esan', esCliente: false }, catalogo))).toBe('solo_cliente');
  });
  it('desglosa por motor, filtra motores y acumula periodos', () => {
    const r = calcularIndicador(indicadorInicial('visibilidad-por-motor'), rs, cliente, catalogo);
    expect(serie(r, 'puntos', 'chatgpt')).toEqual([
      [1, 3],
      [2, 0],
    ]);
    expect(serie(r, 'puntos', 'gemini')).toEqual([
      [1, 2],
      [2, 1],
    ]);
    expect(serie(r, 'puntos', null)).toEqual([
      [1, 2.5],
      [2, 0.5],
    ]);
    const soloChatgpt = { ...indicadorInicial('visibilidad-abierta'), motores: [{ codigo: 'chatgpt', peso: 1 }] };
    expect(serie(calcularIndicador(soloChatgpt, rs, cliente, catalogo))).toEqual([
      [1, 3],
      [2, 0],
    ]);
    const acumulado = { ...indicadorInicial('visibilidad-abierta'), periodo: { tipo: 'ultimas' as const, n: 2 } };
    expect(serie(calcularIndicador(acumulado, rs, cliente, catalogo))).toEqual([
      [1, 2.5],
      [2, 1.5],
    ]);
  });
  it('une preguntas por código y por tipo', () => {
    const def = {
      ...indicadorInicial('visibilidad-abierta'),
      preguntas: { codigos: ['P1'], tipos: ['comparativa' as const] },
      medidas: ['nombra' as const] as ['nombra'],
    };
    const r = calcularIndicador(def, rs, cliente, catalogo);
    expect(r.aplica && r.valores.find((v) => v.vuelta === 1)).toMatchObject({
      respuestas: 3,
      exitos: 3,
      indicadorId: 'visibilidad-abierta',
      version: 1,
    });
  });
});
