import { describe, expect, it } from 'vitest';
import { canonizar } from '../src/valores';

describe('canonizar', () => {
  it('acepta los valores exactos y el vacío', () => {
    expect(canonizar('nombra', 'Sí')).toEqual({ valor: 'Sí', exacto: true });
    expect(canonizar('fuente', null)).toEqual({ valor: null, exacto: true });
    expect(canonizar('fuente', '')).toEqual({ valor: null, exacto: true });
  });
  it('propone el valor canónico para variantes de escritura', () => {
    expect(canonizar('nombra', 'Si')).toEqual({ valor: 'Sí', exacto: false });
    expect(canonizar('nombra', ' si ')).toEqual({ valor: 'Sí', exacto: false });
    expect(canonizar('puesto', '1°')).toEqual({ valor: '1º', exacto: false });
    expect(canonizar('puesto', '2')).toEqual({ valor: '2º', exacto: false });
    expect(canonizar('puesto', 3)).toEqual({ valor: '3º', exacto: false });
    expect(canonizar('puesto', 'mas abajo')).toEqual({ valor: 'Más abajo', exacto: false });
    expect(canonizar('fuente', 'No Cita')).toEqual({ valor: 'No cita fuentes', exacto: false });
    expect(canonizar('ia', 'chat gpt')).toEqual({ valor: 'ChatGPT', exacto: false });
    expect(canonizar('pregunta', 'p3')).toEqual({ valor: 'P3', exacto: false });
  });
  it('vacía la basura y lo que no tiene equivalente', () => {
    expect(canonizar('fuente', '-')).toEqual({ valor: null, exacto: false });
    expect(canonizar('sentimiento', ' ')).toEqual({ valor: null, exacto: false });
    expect(canonizar('puesto', 'Sí')).toEqual({ valor: null, exacto: false });
    expect(canonizar('fuente', 'Neutral')).toEqual({ valor: null, exacto: false });
  });
});
