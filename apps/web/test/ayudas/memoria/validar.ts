import { invalido } from './contexto';

const HORA = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
const CADENCIAS = ['semanal', 'quincenal', 'manual'];

const entero = (v: unknown, min: number, max: number) => typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;

export const validarMuestras = (v: unknown) => {
  if (!entero(v, 1, 10)) throw invalido('Las muestras van de 1 a 10.');
};

export const validarDia = (v: unknown) => {
  if (!entero(v, 0, 6)) throw invalido('El día de la semana va de 0 a 6.');
};

export const validarCadencia = (v: unknown) => {
  if (typeof v !== 'string' || !CADENCIAS.includes(v)) throw invalido('La cadencia no es válida.');
};

export const validarHora = (v: unknown) => {
  if (typeof v !== 'string' || !HORA.test(v)) throw invalido('La hora no es válida.');
};

export const validarTope = (v: unknown) => {
  if (typeof v === 'number' && v < 0) throw invalido('El tope de gasto no puede ser negativo.');
};
