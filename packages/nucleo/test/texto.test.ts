import { describe, expect, it } from 'vitest';
import { aTitulo, claveMarca, contieneTermino, esTodoMayusculas, normalizarTexto, unirLista } from '../src/texto';

describe('texto', () => {
  it('normaliza tildes, mayúsculas y signos', () => {
    expect(normalizarTexto('  La-Roche  Posay ')).toBe('la roche posay');
    expect(normalizarTexto('Rímac Seguros')).toBe('rimac seguros');
  });
  it('la clave de marca ignora espacios y signos', () => {
    expect(claveMarca('Mi Fibra')).toBe(claveMarca('MiFibra'));
    expect(claveMarca('La Roche-Posay')).toBe(claveMarca('La-Roche Posay'));
    expect(claveMarca('U.P.')).toBe('up');
  });
  it('busca términos por palabra completa', () => {
    expect(contieneTermino('Te recomiendo la UP y ESAN', 'UP')).toBe(true);
    expect(contieneTermino('Un grupo de apoyo', 'UP')).toBe(false);
    expect(contieneTermino('La Universidad del Pacífico', 'universidad del pacifico')).toBe(true);
    expect(contieneTermino('Es un acuerdo win-win', 'Win')).toBe(true);
  });
  it('propone mayúsculas normales', () => {
    expect(esTodoMayusculas('EDUCACIÓN EJECUTIVA')).toBe(true);
    expect(esTodoMayusculas('Bioderma')).toBe(false);
    expect(aTitulo('PROGRAMA DE ALTA DIRECCIÓN')).toBe('Programa de Alta Dirección');
    expect(aTitulo('PACÍFICO BUSINESS SCHOOL')).toBe('Pacífico Business School');
    expect(aTitulo('DE LA FUENTE')).toBe('De la Fuente');
  });
  it('une listas como en la ficha', () => {
    expect(unirLista([])).toBe('');
    expect(unirLista(['A'])).toBe('A');
    expect(unirLista(['A', 'B'])).toBe('A y B');
    expect(unirLista(['A', 'B', 'C'])).toBe('A, B y C');
  });
});
