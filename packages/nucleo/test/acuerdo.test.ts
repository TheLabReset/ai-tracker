import { describe, expect, it } from 'vitest';
import { etiquetaDesdeRespuesta, medirAcuerdo, type EtiquetaOro } from '../src/lector/acuerdo';
import { mencion, respuesta } from './ayudas/respuestas';

const e = (respuestaId: string, nombra: boolean, puesto: EtiquetaOro['puesto']): EtiquetaOro => ({ respuestaId, marcaId: 'pbs', nombra, puesto });

describe('acuerdo', () => {
  it('mide el acuerdo en nombra y en puesto sobre los pares comunes', () => {
    const a = [e('1', true, '1º'), e('2', true, '2º'), e('3', false, null), e('4', true, 'Más abajo'), e('5', true, '1º')];
    const b = [e('1', true, '1º'), e('2', true, '3º'), e('3', true, 'Más abajo'), e('4', true, '3º')];
    expect(medirAcuerdo(a, b)).toEqual({ pares: 4, nombra: 75, puesto: 25 });
    expect(medirAcuerdo([], b)).toEqual({ pares: 0, nombra: null, puesto: null });
  });
  it('etiqueta una respuesta leída con la misma regla que el panel', () => {
    expect(etiquetaDesdeRespuesta(respuesta({ id: 'x', menciones: [mencion('pbs', 2)] }), 'pbs')).toEqual({
      respuestaId: 'x',
      marcaId: 'pbs',
      nombra: true,
      puesto: '2º',
    });
  });
});
