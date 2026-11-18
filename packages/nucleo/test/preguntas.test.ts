import { describe, expect, it } from 'vitest';
import { ErrorVariableFaltante, PLANTILLAS_COMPAT, armarSetCompat, renderizarPlantilla, variablesDe } from '../src/preguntas';

describe('preguntas', () => {
  const pad = { categoria: 'educación ejecutiva', marca: 'Programa de Alta Dirección', competidor: 'Pacífico Business School' };
  it('arma las 5 preguntas de la ficha', () => {
    const set = armarSetCompat(pad);
    expect(set.map((p) => p.codigo)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5']);
    expect(set[0]).toEqual({ codigo: 'P1', tipo: 'descubrimiento', texto: '¿Qué marca de educación ejecutiva me recomiendas en Perú?' });
    expect(set[1]?.texto).toBe('¿Programa de Alta Dirección o Pacífico Business School? ¿Cuál me conviene?');
    expect(set[2]?.texto).toBe('¿Qué marcas de educación ejecutiva son confiables en Perú?');
    expect(set[3]?.texto).toBe('¿Cuál es la mejor opción de educación ejecutiva en Perú hoy?');
    expect(set[4]).toEqual({ codigo: 'P5', tipo: 'marca', texto: '¿Qué opinan de Programa de Alta Dirección?' });
  });
  it('reproduce el texto que arma la ficha con sus datos en mayúsculas', () => {
    const set = armarSetCompat({ categoria: 'EDUCACIÓN EJECUTIVA', marca: 'PROGRAMA DE ALTA DIRECCIÓN', competidor: 'PACÍFICO BUSINESS SCHOOL' });
    expect(set[0]?.texto).toBe('¿Qué marca de EDUCACIÓN EJECUTIVA me recomiendas en Perú?');
  });
  it('detecta variables y exige todas', () => {
    expect(variablesDe(PLANTILLAS_COMPAT[1]!.texto)).toEqual(['marca', 'competidor']);
    expect(() => renderizarPlantilla('¿Qué {categoria} me recomiendas para {necesidad}?', { categoria: 'calzado' })).toThrow(
      ErrorVariableFaltante,
    );
  });
});
