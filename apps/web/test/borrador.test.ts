import type { Perfil } from '@lab/datos';
import { describe, expect, it } from 'vitest';
import { aplicar, borradorInicial, erroresDelPaso } from '../src/marcas/alta/borrador';

const perfil: Perfil = { id: 'u1', correo: 'ana@wanted.pe', nombre: 'Ana', empresaId: 'wanted', esAdmin: false, membresias: [] };
const ctx = { sectores: [{ id: 's1', nombre: 'Calzado', categoria: 'calzado' }] };

describe('borrador del alta', () => {
  it('parte de los valores por defecto y la empresa del correo', () => {
    const b = borradorInicial(perfil);
    expect(b.marca.empresaId).toBe('wanted');
    expect(b).toMatchObject({ sector: null, cadencia: 'semanal', diaSemana: 3, hora: '07:00', muestras: 3, topeGastoMensual: null, motorIds: [] });
  });
  it('cambia el nombre sin tocar el resto', () => {
    const b = borradorInicial(perfil);
    const n = aplicar(b, { tipo: 'nombre', valor: { texto: 'Bata', ambiguo: true } });
    expect(n.marca).toMatchObject({ nombre: 'Bata', ambiguo: true, empresaId: 'wanted' });
    expect(b.marca.nombre).toBe('');
  });
  it('elige un sector existente o uno nuevo', () => {
    const b = borradorInicial(perfil);
    expect(aplicar(b, { tipo: 'sectorExistente', id: 's1' }).sector).toEqual({ id: 's1' });
    expect(aplicar(b, { tipo: 'sectorNuevo', nombre: 'Moda', categoria: 'ropa' }).sector).toEqual({ nombre: 'Moda', categoria: 'ropa' });
  });
  it('lee las categorías más específicas de una lista con comas', () => {
    const b = borradorInicial(perfil);
    const n = aplicar(b, { tipo: 'categoriasExtra', texto: ' pollo, Pollo ,embutidos,, calzado ', principal: 'calzado' });
    expect(n.categoriasExtra).toEqual(['pollo', 'embutidos']);
  });
  it('al cambiar la categoría del sector nuevo quita la repetida', () => {
    let b = aplicar(borradorInicial(perfil), { tipo: 'categoriasExtra', texto: 'pollo, ropa', principal: null });
    b = aplicar(b, { tipo: 'sectorNuevo', nombre: 'Moda', categoria: 'Ropa' });
    expect(b.categoriasExtra).toEqual(['pollo']);
  });
  it('guarda dominios, empresa, líder y responsable', () => {
    let b = borradorInicial(perfil);
    b = aplicar(b, { tipo: 'dominios', valor: ['a.pe'] });
    b = aplicar(b, { tipo: 'empresa', valor: 'reset' });
    b = aplicar(b, { tipo: 'lider', id: 'u2' });
    b = aplicar(b, { tipo: 'responsable', id: undefined });
    expect(b.marca).toMatchObject({ dominios: ['a.pe'], empresaId: 'reset' });
    expect(b.liderId).toBe('u2');
    expect(b.responsableId).toBeUndefined();
  });
});

describe('erroresDelPaso', () => {
  it('paso 1 pide nombre', () => {
    const b = borradorInicial(perfil);
    expect(erroresDelPaso(b, 1, ctx)).toEqual(['Escribe el nombre de la marca.']);
    expect(erroresDelPaso(aplicar(b, { tipo: 'nombre', valor: { texto: ' Bata ', ambiguo: false } }), 1, ctx)).toEqual([]);
  });
  it('paso 2 pide sector y revisa el nuevo', () => {
    const b = borradorInicial(perfil);
    expect(erroresDelPaso(b, 2, ctx)).toEqual(['Elige un sector.']);
    expect(erroresDelPaso(aplicar(b, { tipo: 'sectorExistente', id: 's1' }), 2, ctx)).toEqual([]);
    expect(erroresDelPaso(aplicar(b, { tipo: 'sectorNuevo', nombre: '', categoria: '' }), 2, ctx)).toEqual(['Escribe el nombre del sector.', 'Escribe la categoría.']);
    expect(erroresDelPaso(aplicar(b, { tipo: 'sectorNuevo', nombre: 'CALZADO', categoria: 'x' }), 2, ctx)).toEqual(['Ya existe un sector con ese nombre.']);
  });
  it('los pasos 3 a 7 no bloquean todavía', () => {
    expect(erroresDelPaso(borradorInicial(perfil), 5, ctx)).toEqual([]);
  });
});
