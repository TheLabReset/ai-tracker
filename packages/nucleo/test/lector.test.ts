import { describe, expect, it } from 'vitest';
import { LecturaSchema, type Lectura } from '../src/lector/esquema';
import { INSTRUCCIONES_FORMATO, construirMensajesLector } from '../src/lector/mensajes';
import { interpretarLectura } from '../src/lector/interpretar';
import { catalogo } from './ayudas/catalogo';

const marca = (nombre: string, orden: number, o: Partial<Lectura['marcas'][number]> = {}) => ({
  nombre,
  orden,
  lugarEnLista: null,
  recomendada: true,
  sentimiento: 'Neutral' as const,
  fragmento: '',
  ...o,
});

describe('esquema de lectura', () => {
  it('valida la salida del lector', () => {
    expect(() => LecturaSchema.parse({ formato: 'prosa', sinRespuesta: false, marcas: [marca('ESAN', 1)] })).not.toThrow();
    expect(() => LecturaSchema.parse({ formato: 'prosa', sinRespuesta: false, marcas: [marca('ESAN', 0)] })).toThrow();
    expect(() =>
      LecturaSchema.parse({ formato: 'prosa', sinRespuesta: false, marcas: [{ ...marca('ESAN', 1), sentimiento: 'Positivo' }] }),
    ).toThrow();
  });
});

describe('mensajes del lector', () => {
  const base = {
    criterio: { version: 'v1', texto: 'CRITERIO DE PRUEBA' },
    pregunta: '¿Qué marca de educación ejecutiva me recomiendas en Perú?',
    respuesta: 'Te recomiendo la UP.',
    catalogo: [
      { nombre: 'ESAN', alias: [] },
      { nombre: 'Pacífico Business School', alias: ['UP', 'Universidad del Pacífico'] },
    ],
  };
  it('no depende del orden del catálogo (nadie va primero)', () => {
    const invertido = { ...base, catalogo: [...base.catalogo].reverse().map((m) => ({ ...m, alias: [...m.alias].reverse() })) };
    expect(construirMensajesLector(base)).toEqual(construirMensajesLector(invertido));
  });
  it('arma criterio + formato y no menciona cliente ni agencia', () => {
    const m = construirMensajesLector(base);
    expect(m.sistema.startsWith('CRITERIO DE PRUEBA')).toBe(true);
    expect(m.sistema).toContain(INSTRUCCIONES_FORMATO);
    for (const campo of ['formato', 'sinRespuesta', 'marcas', 'orden', 'lugarEnLista', 'recomendada', 'sentimiento', 'fragmento'])
      expect(INSTRUCCIONES_FORMATO).toContain(campo);
    expect(m.sistema + m.usuario).not.toMatch(/cliente|agencia|reset|the lab/i);
    expect(JSON.parse(m.usuario)).toEqual({
      pregunta: base.pregunta,
      respuesta: base.respuesta,
      marcas_conocidas: [
        { nombre: 'ESAN', alias: [] },
        { nombre: 'Pacífico Business School', alias: ['Universidad del Pacífico', 'UP'] },
      ],
    });
  });
});

describe('interpretarLectura', () => {
  it('normaliza, une alias de la misma marca y numera solo recomendadas', () => {
    const m = interpretarLectura(
      {
        formato: 'prosa',
        sinRespuesta: false,
        marcas: [
          marca('ESAN', 1, { sentimiento: 'Bien' }),
          marca('UP', 2),
          marca('Centrum', 3, { recomendada: false }),
          marca('Universidad del Pacífico', 4),
        ],
      },
      catalogo,
    );
    expect(m.map((x) => [x.marcaId, x.posicion, x.textoDetectado])).toEqual([
      ['esan', 1, 'ESAN'],
      ['pbs', 2, 'UP'],
      [null, null, 'Centrum'],
    ]);
  });
  it('en una lista manda el número de la lista', () => {
    const m = interpretarLectura(
      { formato: 'lista', sinRespuesta: false, marcas: [marca('UP', 1, { lugarEnLista: 2 }), marca('ESAN', 2, { lugarEnLista: 1 })] },
      catalogo,
    );
    expect(m.map((x) => [x.marcaId, x.posicion])).toEqual([
      ['pbs', 2],
      ['esan', 1],
    ]);
  });
  it('una marca desconocida también ocupa su lugar', () => {
    const m = interpretarLectura({ formato: 'prosa', sinRespuesta: false, marcas: [marca('Centrum', 1), marca('ESAN', 2)] }, catalogo);
    expect(m.map((x) => [x.marcaId, x.posicion])).toEqual([
      [null, 1],
      ['esan', 2],
    ]);
  });
  it('sin respuesta no hay menciones', () => {
    expect(interpretarLectura({ formato: 'prosa', sinRespuesta: true, marcas: [] }, catalogo)).toEqual([]);
  });
});
