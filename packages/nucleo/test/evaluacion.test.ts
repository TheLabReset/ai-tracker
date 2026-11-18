import { describe, expect, it } from 'vitest';
import { evaluarMarca, filaRegistro } from '../src/evaluacion';
import { clasificarCita } from '../src/fuentes';
import { catalogo } from './ayudas/catalogo';
import { mencion, respuesta } from './ayudas/respuestas';

const cli = { esCliente: true };
describe('evaluarMarca', () => {
  it('traduce la posición a puesto y puntos', () => {
    const r = respuesta({ menciones: [mencion('esan', 1), mencion('pbs', 2)] });
    expect(evaluarMarca(r, 'pbs', cli)).toEqual({
      nombra: true,
      puesto: '2º',
      posicion: 2,
      puntos: 2,
      sentimiento: 'Neutral',
      citaWeb: false,
      citaTerceros: false,
    });
    expect(evaluarMarca(respuesta({ menciones: [mencion('pbs', 5)] }), 'pbs', cli)).toMatchObject({ puesto: 'Más abajo', posicion: 5, puntos: 0 });
    expect(evaluarMarca(respuesta({ menciones: [mencion('pbs', null)] }), 'pbs', cli)).toMatchObject({ nombra: true, puesto: 'Más abajo', puntos: 0 });
    expect(evaluarMarca(respuesta({}), 'pbs', cli)).toEqual({
      nombra: false,
      puesto: null,
      posicion: null,
      puntos: 0,
      sentimiento: null,
      citaWeb: false,
      citaTerceros: false,
    });
  });
  it('aplica la regla de P5 y pesos configurables', () => {
    expect(evaluarMarca(respuesta({ preguntaCodigo: 'P5', tipo: 'marca', menciones: [mencion('pbs', null)] }), 'pbs', cli)).toMatchObject({
      puesto: '1º',
      puntos: 3,
    });
    expect(evaluarMarca(respuesta({ menciones: [mencion('pbs', 1)] }), 'pbs', { esCliente: true, pesos: { 1: 5, 2: 3, 3: 1 } }).puntos).toBe(5);
  });
  it('en lo importado respeta lo que anotó el equipo', () => {
    const r = respuesta({
      origen: 'importada',
      registroCliente: { nombra: 'No', puesto: '1º', sentimiento: null, fuente: 'Nuestra web' },
      menciones: [mencion('esan', null)],
    });
    expect(evaluarMarca(r, 'pbs', cli)).toMatchObject({ nombra: false, puesto: '1º', puntos: 0, citaWeb: true });
    expect(evaluarMarca(r, 'esan', { esCliente: false })).toMatchObject({ nombra: true, puesto: null, puntos: 0 });
  });
});

describe('filaRegistro', () => {
  it('arma la fila con el formato de la ficha', () => {
    const r = respuesta({
      menciones: [mencion('esan', 1), mencion('pbs', 2)],
      citas: [clasificarCita('https://elcomercio.pe/a', [{ dominio: 'elcomercio.pe', categoria: 'Medio de prensa' }], catalogo)],
    });
    expect(filaRegistro(r, 'pbs', catalogo)).toEqual({
      pregunta: 'P1',
      ia: 'ChatGPT',
      nombra: 'Sí',
      puesto: '2º',
      sentimiento: 'Neutral',
      fuente: 'Medio de prensa',
      marcasAntes: 'ESAN',
      puntos: 2,
    });
  });
  it('una IA que no responde cuenta como "No", 0 puntos y sin fuentes', () => {
    expect(filaRegistro(respuesta({}), 'pbs', catalogo)).toEqual({
      pregunta: 'P1',
      ia: 'ChatGPT',
      nombra: 'No',
      puesto: null,
      sentimiento: null,
      fuente: 'No cita fuentes',
      marcasAntes: '',
      puntos: 0,
    });
  });
});
