import { describe, expect, it } from 'vitest';
import { diagnosticarFicha } from '../src/ficha/diagnostico';
import { importarFicha } from '../src/ficha/importar';
import { verificarContraPanel } from '../src/ficha/verificar';
import { panelComoExcel } from '../src/ficha/panel';
import { catalogo } from './ayudas/catalogo';
import { fichaDe, fila } from './ayudas/filas';

const op = (aceptadas = [] as ReturnType<typeof diagnosticarFicha>[number]['correccion'][]) =>
  ({ marcaClienteId: 'pad', competidorPrincipalId: 'pbs', catalogo, aceptadas: aceptadas.filter((c) => c !== null) });

describe('importarFicha', () => {
  const ficha = fichaDe([
    fila(2, { marcasPrimero: 'CENTRUM, ESAN y UP' }), fila(3, { pregunta: 'P2', ia: 'Gemini', nombra: 'Si', puesto: '2º', marcasPrimero: 'UP' }),
    fila(4, { ia: null }), fila(5, { vuelta: 2, fecha: 46300, pregunta: 'P5', marcasPrimero: 'ESAN' }),
  ]);
  it('convierte filas en respuestas importadas', () => {
    const r = importarFicha(ficha, op());
    expect(r.vueltas).toEqual([{ numero: 1, fecha: '2026-09-28', semana: 1 }, { numero: 2, fecha: '2026-10-05', semana: 2 }]);
    expect(r.respuestas.map((x) => [x.id, x.tipo, x.motor, x.valida, x.competidorId ?? null])).toEqual([
      ['fila-2', 'descubrimiento', 'chatgpt', true, null], ['fila-3', 'comparativa', 'gemini', false, 'pbs'], ['fila-5', 'marca', 'chatgpt', true, null]]);
    expect(r.respuestas[0]?.menciones.map((m) => m.marcaId)).toEqual([null, 'esan', 'pbs']);
    expect(r.excluidas).toEqual([{ fila: 4, motivo: 'Falta vuelta, pregunta o IA' }]);
    expect(r.filasMarcadas.map((f) => f.fila)).toEqual([3, 4]);
    expect(r.competidoresSugeridos.map((c) => [c.texto, c.ocurrencias])).toEqual([['ESAN', 2], ['Pacífico Business School', 2], ['CENTRUM', 1]]);
    expect(r.descubiertas).toEqual([{ texto: 'CENTRUM', ocurrencias: 1 }]);
    expect(r.datos).toEqual({ categoria: 'educación ejecutiva', marca: 'Programa de Alta Dirección', competidor: 'Pacífico Business School' });
  });
  it('aplica solo las correcciones aceptadas', () => {
    const anomalias = diagnosticarFicha(ficha);
    const r = importarFicha(ficha, op(anomalias.map((a) => a.correccion)));
    expect(r.respuestas.find((x) => x.id === 'fila-3')).toMatchObject({ valida: true, registroCliente: { nombra: 'Sí' } });
  });
});

describe('verificarContraPanel', () => {
  it('cuadra sin diferencias cuando la ficha está limpia', () => {
    const limpia = fichaDe([fila(2), fila(3, { ia: 'Gemini', puesto: '3º' })]);
    const ficha = { ...limpia, panel: panelComoExcel(limpia.filas) };
    const r = importarFicha(ficha, op());
    expect(verificarContraPanel(ficha, r, diagnosticarFicha(ficha), op())).toEqual({ cuadra: true, diferencias: [] });
  });
  it('acepta diferencias explicadas por anomalías y rechaza las inexplicables', () => {
    const sucia = fichaDe([fila(2, { nombra: 'Si' }), fila(3, { ia: 'Gemini', nombra: 'No', puesto: '1º' })]);
    const ficha = { ...sucia, panel: panelComoExcel(sucia.filas) };
    const anomalias = diagnosticarFicha(ficha);
    const v = verificarContraPanel(ficha, importarFicha(ficha, op(anomalias.map((a) => a.correccion))), anomalias, op());
    expect(v.cuadra).toBe(true);
    expect(v.diferencias.length).toBeGreaterThan(0);
    expect(v.diferencias.every((d) => d.explicadaPor.length > 0)).toBe(true);
    const alterada = { ...ficha, panel: { ...ficha.panel, vueltas: { ...ficha.panel.vueltas, 1: { ...ficha.panel.vueltas[1], hablaBien: 99 } } } };
    const w = verificarContraPanel(alterada, importarFicha(alterada, op()), [], op());
    expect(w.cuadra).toBe(false);
    expect(w.diferencias.find((d) => d.medida === 'hablaBien')).toMatchObject({ vuelta: 1, panel: 99, explicadaPor: [] });
  });
});
