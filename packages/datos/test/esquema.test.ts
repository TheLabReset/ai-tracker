import { describe, expect, it } from 'vitest';
import { claveMarca } from '@lab/nucleo';
import { clienteServicio } from './ayudas/entorno';

describe('esquema tracker', () => {
  const db = clienteServicio();
  it('la clave de marca en SQL es la misma que en el núcleo', async () => {
    for (const t of ['La Roche-Posay', 'Mi Fibra', 'U.P.', 'Rímac Seguros', 'Ñandú', "L'Oréal", '7-Eleven', '  ESAN  ']) {
      const { data, error } = await db.rpc('clave', { t });
      expect(error).toBeNull();
      expect(data, t).toBe(claveMarca(t));
    }
  });
  it('acepta solo correos de Reset y Wanted', async () => {
    const casos: Array<[string, boolean]> = [['ana@reset.com.pe', true], ['Ana@RESET.COM.PE', true], ['luis@wanted.pe', true],
      ['ana@gmail.com', false], ['x@reset.com.pe.otro.com', false], ['reset.com.pe', false]];
    for (const [correo, esperado] of casos) {
      const { data } = await db.rpc('es_correo_permitido', { correo });
      expect(data, correo).toBe(esperado);
    }
  });
});
