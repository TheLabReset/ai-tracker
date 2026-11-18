import { describe, expect, it } from 'vitest';
import { fechaDeCelda, fechaEnLima, rangoDeSemana, semanaDelControl, serialExcelAFecha } from '../src/calendario';

describe('calendario del control', () => {
  it('numera semanas de miércoles a martes desde el 23/09/2026', () => {
    expect(semanaDelControl('2026-09-23')).toBe(1);
    expect(semanaDelControl('2026-09-29')).toBe(1);
    expect(semanaDelControl('2026-11-03')).toBe(6);
    expect(semanaDelControl('2026-11-10')).toBe(7);
    expect(semanaDelControl('2026-11-18')).toBe(9);
    expect(semanaDelControl('2026-09-22')).toBe(0); // San Fernando midió un día antes del inicio
    expect(rangoDeSemana(23)).toEqual({ desde: '2027-02-24', hasta: '2027-03-02' });
  });
  it('convierte instantes a la fecha de Lima', () => {
    expect(fechaEnLima(new Date('2026-11-19T03:00:00Z'))).toBe('2026-11-18');
  });
  it('lee fechas de Excel', () => {
    expect(serialExcelAFecha(46293)).toBe('2026-09-28');
    expect(serialExcelAFecha(46343)).toBe('2026-11-17');
    expect(fechaDeCelda(46293)).toBe('2026-09-28');
    expect(fechaDeCelda('28/09/2026')).toBe('2026-09-28');
    expect(fechaDeCelda('2026-09-28')).toBe('2026-09-28');
    expect(fechaDeCelda('ayer')).toBeNull();
    expect(fechaDeCelda(null)).toBeNull();
  });
});
