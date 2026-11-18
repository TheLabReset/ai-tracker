import { describe, expect, it } from 'vitest';
import { FichaInvalidaError, leerFicha } from '../src/ficha/leer';
import { panelComoExcel } from '../src/ficha/panel';
import { crearFichaSintetica } from './ayudas/ficha-sintetica';

const filas = [
  [46293, 1, 'P1', 'ChatGPT', 'Sí', '1º', 'Bien', 'Nuestra web', '', 3, 'Completa'],
  [46293, 1, 'P1', 'Gemini', 'SÍ', 'Más abajo', 'Neutral', 'Comparador', 'ESAN y UP', 0, 'Completa'],
  [null, null, null, null, null, null, null, null, null, '', ''],
  [46293, 1, 'P2', 'ChatGPT', 'Si', '2º', 'Neutral', 'Otra', 'UP', 2, 'Completa'],
  [46293, 1, 'P3', 'ChatGPT', 'No', '1º', null, 'Otra', 'ESAN', { error: '#REF!' }, 'Completa'],
];
const vacia = [0, 0, '', 0, '', '', 0, 0, 0, 0] as const;
const v1 = [4, 2, 50, 2, 50, 1.3, 1, 0, 1, 1] as const; // "SÍ" cuenta; "Si" no; "1º" con "No" cuenta como primero
const tabla = v1.map((x, i) => [x, vacia[i]!, vacia[i]!, vacia[i]!, vacia[i]!, vacia[i]!]);

describe('leerFicha', () => {
  const ficha = leerFicha(crearFichaSintetica({ filas, panel: { C5: 1, D6: 50, E6: 50, F6: 1.3, tabla } }));
  it('lee datos, preguntas y filas con su número de fila', () => {
    expect(ficha.datos).toEqual({ categoria: 'EDUCACIÓN EJECUTIVA', marca: 'PROGRAMA DE ALTA DIRECCIÓN', competidor: 'PACÍFICO BUSINESS SCHOOL' });
    expect(ficha.preguntas.P1).toBe('¿Qué marca de EDUCACIÓN EJECUTIVA me recomiendas en Perú?');
    expect(ficha.filas.map((f) => f.fila)).toEqual([2, 3, 5, 6]);
    expect(ficha.filas[0]).toMatchObject({ fecha: 46293, vuelta: 1, ia: 'ChatGPT', nombra: 'Sí' });
    expect(ficha.filas[3]?.puntos).toEqual({ error: '#REF!' });
  });
  it('lee el Panel y el recálculo da lo mismo', () => {
    expect(ficha.panel.vueltas[1]).toEqual({
      respuestas: 4,
      nombraVeces: 2,
      nombraPct: 50,
      primeroVeces: 2,
      primeroPct: 50,
      puntos: 1.3,
      hablaBien: 1,
      hablaMal: 0,
      citaWeb: 1,
      citaTerceros: 1,
    });
    expect(ficha.panel.vueltas[2].nombraPct).toBeNull();
    expect(panelComoExcel(ficha.filas)).toEqual(ficha.panel);
  });
  it('rechaza archivos que no son la ficha', () => {
    expect(() => leerFicha(crearFichaSintetica({ filas, sinHoja: 'Registro' }))).toThrow(FichaInvalidaError);
    expect(() => leerFicha(crearFichaSintetica({ filas, encabezadoRoto: true }))).toThrow(/encabezado/i);
  });
});
