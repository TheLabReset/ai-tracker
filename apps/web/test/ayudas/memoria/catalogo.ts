import { ErrorDatos, type AliasGuardado, type Datos, type Marca, type NuevaMarca, type Sector } from '@lab/datos';
import { claveMarca } from '@lab/nucleo';
import { generico, invalido, porTexto, sinPermisoCatalogo, sinPermiso, type Contexto } from './contexto';

type Catalogo = Pick<
  Datos,
  'listarSectores' | 'crearSector' | 'listarMarcas' | 'crearMarca' | 'agregarAlias' | 'quitarAlias'
>;

export const conAliasOrdenados = (m: Marca): Marca => ({
  ...m,
  alias: [...m.alias].sort((a, b) => (a.texto < b.texto ? -1 : a.texto > b.texto ? 1 : 0)),
});

function exigirColisionLibre(ctx: Contexto, sectorId: string, texto: string, propiaId: string | null) {
  const clave = claveMarca(texto);
  const otras = ctx.estado.marcas.filter((m) => m.sectorId === sectorId && m.id !== propiaId);
  const otra =
    otras.find((m) => claveMarca(m.nombre) === clave) ?? otras.find((m) => m.alias.some((a) => claveMarca(a.texto) === clave));
  if (otra) throw new ErrorDatos('colision_alias', `«${texto}» ya es de ${otra.nombre}`);
}

export function insertarSector(ctx: Contexto, s: { nombre: string; categoria: string }): Sector {
  if (s.nombre.trim() === '') throw generico();
  if (ctx.estado.sectores.some((x) => x.nombre === s.nombre)) throw invalido('Ya existe un sector con ese nombre.');
  const sector = { id: ctx.nuevoId(), nombre: s.nombre, categoria: s.categoria };
  ctx.estado.sectores.push(sector);
  ctx.registrar('sectores', sector.id, 'insertar', null, sector);
  return sector;
}

export function insertarAlias(ctx: Contexto, marcaId: string, a: { texto: string; ambiguo: boolean }): AliasGuardado {
  const marca = ctx.estado.marcas.find((m) => m.id === marcaId);
  if (!marca || a.texto.trim() === '') throw generico();
  exigirColisionLibre(ctx, marca.sectorId, a.texto, marca.id);
  const alias = { id: ctx.nuevoId(), texto: a.texto, ambiguo: a.ambiguo };
  marca.alias.push(alias);
  ctx.registrar('alias', alias.id, 'insertar', null, { ...alias, marcaId });
  return alias;
}

export function insertarMarca(ctx: Contexto, sectorId: string, m: NuevaMarca, cliente?: { empresaId: 'reset' | 'wanted' }): Marca {
  if (!ctx.estado.sectores.some((s) => s.id === sectorId) || m.nombre.trim() === '') throw generico();
  exigirColisionLibre(ctx, sectorId, m.nombre, null);
  const marca: Marca = {
    id: ctx.nuevoId(),
    sectorId,
    nombre: m.nombre,
    ambiguo: m.ambiguo ?? false,
    esCliente: Boolean(cliente),
    empresaId: cliente?.empresaId ?? null,
    dominios: [...(m.dominios ?? [])],
    alias: [],
  };
  ctx.estado.marcas.push(marca);
  ctx.registrar('marcas', marca.id, 'insertar', null, marca);
  for (const a of m.alias ?? []) insertarAlias(ctx, marca.id, a);
  return marca;
}

export function reutilizarMarca(ctx: Contexto, marca: Marca, d: { empresaId: 'reset' | 'wanted'; ambiguo: boolean; dominios: string[] }) {
  exigirColisionLibre(ctx, marca.sectorId, marca.nombre, marca.id);
  const antes = structuredClone(marca);
  marca.esCliente = true;
  marca.empresaId = d.empresaId;
  marca.ambiguo = marca.ambiguo || (d.ambiguo ?? false);
  marca.dominios = [...new Set([...marca.dominios, ...(d.dominios ?? [])])];
  ctx.registrarSiCambia('marcas', marca.id, antes, marca);
}

export function crearCatalogo(ctx: Contexto): Catalogo {
  const { estado } = ctx;
  return {
    listarSectores: () => ctx.leer(() => [...estado.sectores].sort((a, b) => porTexto(a.nombre, b.nombre))),

    crearSector: (s) =>
      ctx.escribir((yo) => {
        if (!ctx.puedeAmpliar(yo)) throw sinPermisoCatalogo();
        return insertarSector(ctx, s);
      }),

    listarMarcas: (sectorId) =>
      ctx.leer(() =>
        estado.marcas
          .filter((m) => m.sectorId === sectorId)
          .map(conAliasOrdenados)
          .sort((a, b) => porTexto(a.nombre, b.nombre)),
      ),

    crearMarca: (sectorId, m) =>
      ctx.escribir((yo) => {
        if (!ctx.puedeAmpliar(yo)) throw sinPermisoCatalogo();
        return conAliasOrdenados(insertarMarca(ctx, sectorId, m));
      }),

    agregarAlias: (marcaId, a) =>
      ctx.escribir((yo) => {
        if (!ctx.puedeAmpliar(yo)) throw sinPermisoCatalogo();
        return insertarAlias(ctx, marcaId, a);
      }),

    quitarAlias: (aliasId) =>
      ctx.escribir((yo) => {
        if (!yo.admin) throw sinPermiso();
        const marca = estado.marcas.find((m) => m.alias.some((a) => a.id === aliasId));
        if (!marca) return;
        const alias = marca.alias.find((a) => a.id === aliasId)!;
        marca.alias = marca.alias.filter((a) => a.id !== aliasId);
        ctx.registrar('alias', aliasId, 'borrar', { ...alias, marcaId: marca.id }, null);
      }),
  };
}
