import { describe, expect, it } from 'vitest';
import { dividirListaMarcas, resolverMarca, sugerirAmbiguo, validarCatalogo } from '../src/marcas';
import { catalogo } from './ayudas/catalogo';

describe('marcas', () => {
  it('resuelve nombre y alias sin importar tildes, mayúsculas ni puntos', () => {
    expect(resolverMarca('U.P.', catalogo)).toEqual({ marcaId: 'pbs', via: 'alias' });
    expect(resolverMarca('universidad del pacifico', catalogo)).toEqual({ marcaId: 'pbs', via: 'alias' });
    expect(resolverMarca('Esan', catalogo)).toEqual({ marcaId: 'esan', via: 'nombre' });
    expect(resolverMarca('WIN', catalogo)).toEqual({ marcaId: 'win', via: 'alias_ambiguo' });
    expect(resolverMarca('Win Internet', catalogo)).toEqual({ marcaId: 'win', via: 'alias' });
    expect(resolverMarca('Centrum', catalogo)).toEqual({ marcaId: null, via: null });
  });
  it('separa la columna libre de la ficha en marcas', () => {
    expect(dividirListaMarcas('CENTRUM, ESAN y UP')).toEqual(['CENTRUM', 'ESAN', 'UP']);
    expect(dividirListaMarcas('CENTRUM,ESAN,UP y UPC ')).toEqual(['CENTRUM', 'ESAN', 'UP', 'UPC']);
    expect(dividirListaMarcas('Skechers / Adidas')).toEqual(['Skechers', 'Adidas']);
    expect(dividirListaMarcas('Rímac seguros')).toEqual(['Rímac seguros']);
    expect(dividirListaMarcas('No menciona a otras marcas')).toEqual([]);
    expect(dividirListaMarcas('-')).toEqual([]);
    expect(dividirListaMarcas(null)).toEqual([]);
  });
  it('sugiere marcar como ambiguas las palabras comunes', () => {
    for (const t of ['Win', 'Bata', 'Reset', 'PAD', 'San Fernando', 'UP']) expect(sugerirAmbiguo(t)).toBe(true);
    for (const t of ['Pacífico Business School', 'Interseguro']) expect(sugerirAmbiguo(t)).toBe(false);
  });
  it('detecta alias repetidos entre marcas', () => {
    const otra = { id: 'x', nombre: 'Universidad del Pacifico', ambiguo: false, alias: [], dominios: [] };
    expect(validarCatalogo([...catalogo, otra])).toEqual([{ clave: 'universidaddelpacifico', marcas: ['pbs', 'x'] }]);
    expect(validarCatalogo(catalogo)).toEqual([]);
  });
});
