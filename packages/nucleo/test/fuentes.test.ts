import { describe, expect, it } from 'vitest';
import { clasificarCita, dominioDe, dominiosMasCitados, fuenteDeFila } from '../src/fuentes';
import { catalogo } from './ayudas/catalogo';

const dominios = [
  { dominio: 'elcomercio.pe', categoria: 'Medio de prensa' as const },
  { dominio: 'comparabien.com.pe', categoria: 'Comparador' as const },
];
const c = (url: string) => clasificarCita(url, dominios, catalogo);

describe('fuentes', () => {
  it('extrae el dominio sin www ni m', () => {
    expect(dominioDe('https://www.elcomercio.pe/economia/x')).toBe('elcomercio.pe');
    expect(dominioDe('https://m.facebook.com/win')).toBe('facebook.com');
    expect(dominioDe('no es url')).toBeNull();
  });
  it('clasifica por catálogo, web de marca y redes', () => {
    expect(c('https://elcomercio.pe/a')).toMatchObject({ dominio: 'elcomercio.pe', categoria: 'Medio de prensa', marcaId: null, conocido: true });
    expect(c('https://planes.win.pe/x')).toMatchObject({ categoria: 'Web de marca', marcaId: 'win', conocido: true });
    expect(c('https://instagram.com/x')).toMatchObject({ categoria: 'Red social', conocido: true });
    expect(c('https://blogdesconocido.com/y')).toMatchObject({ categoria: 'Otra', conocido: false });
  });
  it('la fuente de la fila es la primera cita', () => {
    expect(fuenteDeFila([], 'win')).toBe('No cita fuentes');
    expect(fuenteDeFila([c('https://win.pe'), c('https://elcomercio.pe/a')], 'win')).toBe('Nuestra web');
    expect(fuenteDeFila([c('https://claro.com.pe')], 'win')).toBe('Otra');
    expect(fuenteDeFila([c('https://elcomercio.pe/a'), c('https://win.pe')], 'win')).toBe('Medio de prensa');
  });
  it('rankea los dominios más citados, una vez por respuesta', () => {
    const r = (citas: ReturnType<typeof c>[]) => ({
      id: 'r',
      vuelta: 1,
      preguntaCodigo: 'P1',
      tipo: 'descubrimiento' as const,
      motor: 'chatgpt',
      muestra: 1,
      origen: 'auto' as const,
      valida: true,
      menciones: [],
      citas,
    });
    const rs = [r([c('https://elcomercio.pe/a'), c('https://elcomercio.pe/b')]), r([c('https://elcomercio.pe/c'), c('https://instagram.com/x')])];
    expect(dominiosMasCitados(rs)).toEqual([
      { dominio: 'elcomercio.pe', categoria: 'Medio de prensa', respuestas: 2 },
      { dominio: 'instagram.com', categoria: 'Red social', respuestas: 1 },
    ]);
  });
});
