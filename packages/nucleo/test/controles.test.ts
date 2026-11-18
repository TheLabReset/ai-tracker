import { describe, expect, it } from 'vitest';
import { controlarLectura } from '../src/lector/controles';
import type { Mencion } from '../src/dominio';
import { catalogo } from './ayudas/catalogo';

const m = (marcaId: string | null, textoDetectado: string, posicion: number | null, via: Mencion['via'] = 'nombre'): Mencion => ({
  marcaId,
  textoDetectado,
  orden: 1,
  posicion,
  recomendada: posicion !== null,
  sentimiento: 'Neutral',
  fragmento: '',
  via,
});
const motivos = (d: ReturnType<typeof controlarLectura>) => d.map((x) => `${x.motivo}:${x.marcaId}`);

describe('controles de confianza', () => {
  const texto = 'Para educación ejecutiva, ESAN y la Universidad del Pacífico son las más sólidas. Es un esquema win-win.';
  it('marca el alias presente que el lector no extrajo, pero no un término ambiguo', () => {
    expect(motivos(controlarLectura({ respuesta: texto, menciones: [m('esan', 'ESAN', 1)], catalogo }))).toEqual(['alias_no_extraido:pbs']);
  });
  it('marca una marca extraída que no está en el texto', () => {
    const d = controlarLectura({
      respuesta: texto,
      menciones: [m('esan', 'ESAN', 1), m('pbs', 'Universidad del Pacífico', 2), m(null, 'Centrum', 3)],
      catalogo,
    });
    expect(motivos(d)).toEqual(['marca_no_en_texto:null']);
  });
  it('marca las menciones resueltas por un término ambiguo', () => {
    const d = controlarLectura({
      respuesta: 'Te conviene Win o Claro.',
      menciones: [m('win', 'Win', 1, 'alias_ambiguo'), m('claro', 'Claro', 2, 'alias_ambiguo')],
      catalogo,
    });
    expect(motivos(d)).toEqual(['alias_ambiguo:win', 'alias_ambiguo:claro']);
  });
  it('marca un salto de posición frente a la vuelta anterior', () => {
    const base = { respuesta: 'ESAN y la UP.', catalogo, menciones: [m('esan', 'ESAN', 1), m('pbs', 'UP', 2, 'alias')] };
    expect(motivos(controlarLectura({ ...base, anterior: new Map([['esan', 5]]) }))).toEqual(['salto_de_posicion:esan']);
    expect(controlarLectura({ ...base, anterior: new Map([['esan', 3]]) })).toEqual([]);
  });
});
