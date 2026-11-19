import { describe, expect, it } from 'vitest';
import { empresaDeCorreo, esCorreoPermitido } from '../src/acceso';
describe('acceso', () => {
  it('acepta solo correos de Reset y Wanted', () => {
    expect(esCorreoPermitido(' Ana@RESET.COM.PE ')).toBe(true);
    expect(esCorreoPermitido('luis@wanted.pe')).toBe(true);
    expect(esCorreoPermitido('ana@gmail.com')).toBe(false);
    expect(esCorreoPermitido('x@reset.com.pe.otro.com')).toBe(false);
    expect(empresaDeCorreo('ana@reset.com.pe')).toBe('reset');
    expect(empresaDeCorreo('luis@WANTED.pe')).toBe('wanted');
    expect(empresaDeCorreo('ana@gmail.com')).toBeNull();
  });
});
