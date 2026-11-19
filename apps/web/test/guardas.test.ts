import type { Perfil } from '@lab/datos';
import { describe, expect, it } from 'vitest';
import { puedeCrearMarcas, puedeEditarMarca } from '../src/app/guardas';

const perfil = (p: Partial<Perfil>): Perfil => ({ id: '1', correo: 'a@reset.com.pe', nombre: 'A', empresaId: 'reset', esAdmin: false, membresias: [], ...p });

describe('puedeCrearMarcas', () => {
  it('el admin puede', () => expect(puedeCrearMarcas(perfil({ esAdmin: true }))).toBe(true));
  it('un líder puede', () => expect(puedeCrearMarcas(perfil({ membresias: [{ marcaId: 'm', rol: 'lider' }] }))).toBe(true));
  it('un responsable no puede', () => expect(puedeCrearMarcas(perfil({ membresias: [{ marcaId: 'm', rol: 'responsable' }] }))).toBe(false));
  it('sin membresías no puede', () => expect(puedeCrearMarcas(perfil({}))).toBe(false));
});

describe('puedeEditarMarca', () => {
  it('el admin puede', () => expect(puedeEditarMarca(perfil({ esAdmin: true }), 'm')).toBe(true));
  it('el líder de esa marca puede', () => expect(puedeEditarMarca(perfil({ membresias: [{ marcaId: 'm', rol: 'lider' }] }), 'm')).toBe(true));
  it('el líder de otra marca no puede', () => expect(puedeEditarMarca(perfil({ membresias: [{ marcaId: 'otra', rol: 'lider' }] }), 'm')).toBe(false));
  it('un responsable no puede', () => expect(puedeEditarMarca(perfil({ membresias: [{ marcaId: 'm', rol: 'responsable' }] }), 'm')).toBe(false));
});
