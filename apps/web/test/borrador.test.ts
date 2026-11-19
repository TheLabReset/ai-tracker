import type { Perfil } from '@lab/datos';
import { describe, expect, it } from 'vitest';
import { aplicar, borradorInicial, erroresDelPaso, preguntasDelBorrador } from '../src/marcas/alta/borrador';

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

describe('preguntas del borrador', () => {
  const nombres = { marca: 'Bata', competidor: 'Footloose', categoria: 'calzado' };
  const base = () => ({ ...borradorInicial(perfil), categoriasExtra: ['zapatillas', 'Calzado'], preguntasPropias: [{ tipo: 'marca' as const, texto: '¿Dónde compro?' }] });
  it('arma la ficha, el extendido sin repetir la categoría principal y las propias', () => {
    const p = preguntasDelBorrador(base(), nombres);
    expect(p.map((x) => x.codigo)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P1·zapatillas', 'P3·zapatillas', 'P4·zapatillas', 'X1']);
    expect(p[1]).toEqual({ codigo: 'P2', tipo: 'comparativa', set: 'compat', categoria: null, texto: '¿Bata o Footloose? ¿Cuál me conviene?' });
    expect(p[5]).toMatchObject({ set: 'extendido', categoria: 'zapatillas' });
    expect(p[8]).toEqual({ codigo: 'X1', tipo: 'marca', set: 'propia', categoria: null, texto: '¿Dónde compro?' });
  });
  it('al elegir un sector existente quita la categoría extra repetida', () => {
    const n = aplicar(base(), { tipo: 'sectorExistente', id: 's1', categoria: 'calzado' });
    expect(n.categoriasExtra).toEqual(['zapatillas']);
  });
  it('agrega, alterna y limita competidores y ajusta el principal', () => {
    let b = borradorInicial(perfil);
    const nueva = (nombre: string) => ({ nombre, ambiguo: false, alias: [], dominios: [] });
    b = aplicar(b, { tipo: 'alternarCompetidor', id: 'm1' });
    b = aplicar(b, { tipo: 'agregarCompetidor', marca: nueva('A') });
    b = aplicar(b, { tipo: 'competidorPrincipal', indice: 1 });
    expect(b.competidorPrincipal).toBe(1);
    b = aplicar(b, { tipo: 'alternarCompetidor', id: 'm1' });
    expect(b.competidores).toHaveLength(1);
    expect(b.competidorPrincipal).toBe(0);
    for (const n of ['B', 'C', 'D', 'E', 'F']) b = aplicar(b, { tipo: 'agregarCompetidor', marca: nueva(n) });
    expect(b.competidores).toHaveLength(5);
  });
  it('quita los competidores del catálogo al cambiar de sector', () => {
    let b = aplicar(borradorInicial(perfil), { tipo: 'sectorExistente', id: 's1' });
    b = aplicar(b, { tipo: 'alternarCompetidor', id: 'm1' });
    b = aplicar(b, { tipo: 'agregarCompetidor', marca: { nombre: 'A', ambiguo: false, alias: [], dominios: [] } });
    b = aplicar(b, { tipo: 'sectorExistente', id: 's2' });
    expect(b.competidores).toEqual([{ nombre: 'A', ambiguo: false, alias: [], dominios: [] }]);
  });
  it('pide al menos un competidor en el paso 4', () => {
    expect(erroresDelPaso(borradorInicial(perfil), 4, ctx)).toEqual(['Elige al menos un competidor.']);
  });
});
