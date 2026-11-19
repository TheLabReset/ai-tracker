import type { ClienteTracker } from './cliente';
import { comprobar, comprobarLista, conTraduccion } from './errores';
import { ErrorDatos, type AliasGuardado, type Datos, type Marca, type Sector } from './tipos';

type Catalogo = Pick<
  Datos,
  'listarSectores' | 'crearSector' | 'listarMarcas' | 'crearMarca' | 'agregarAlias' | 'quitarAlias'
>;

const aSector = (f: any): Sector => ({ id: f.id, nombre: f.nombre, categoria: f.categoria });
const aAlias = (f: any): AliasGuardado => ({ id: f.id, texto: f.texto, ambiguo: f.ambiguo });
const aMarca = (f: any): Marca => ({
  id: f.id,
  sectorId: f.sector_id,
  nombre: f.nombre,
  ambiguo: f.ambiguo,
  esCliente: f.es_cliente,
  empresaId: f.empresa_id,
  dominios: f.dominios,
  alias: [...(f.alias ?? [])].sort((a: any, b: any) => (a.texto < b.texto ? -1 : a.texto > b.texto ? 1 : 0)).map(aAlias),
});

export function crearCatalogo(cliente: ClienteTracker): Catalogo {
  return {
    listarSectores: () =>
      conTraduccion(async () => comprobarLista(await cliente.from('sectores').select('*').order('nombre')).map(aSector)),

    crearSector: (s) =>
      conTraduccion(async () =>
        aSector(comprobar(await cliente.from('sectores').insert({ nombre: s.nombre, categoria: s.categoria }).select().single())),
      ),

    listarMarcas: (sectorId) =>
      conTraduccion(async () =>
        comprobarLista(await cliente.from('marcas').select('*, alias(*)').eq('sector_id', sectorId).order('nombre')).map(aMarca),
      ),

    crearMarca: (sectorId, m) =>
      conTraduccion(async () => {
        const id = comprobar(await cliente.rpc('crear_marca', { sector: sectorId, datos: m }));
        return aMarca(comprobar(await cliente.from('marcas').select('*, alias(*)').eq('id', id).single()));
      }),

    agregarAlias: (marcaId, a) =>
      conTraduccion(async () =>
        aAlias(
          comprobar(await cliente.from('alias').insert({ marca_id: marcaId, texto: a.texto, ambiguo: a.ambiguo }).select().single()),
        ),
      ),

    quitarAlias: (aliasId) =>
      conTraduccion(async () => {
        const borrados = comprobarLista(await cliente.from('alias').delete().eq('id', aliasId).select());
        if (borrados.length > 0) return;
        if (!comprobar(await cliente.rpc('es_admin'))) throw new ErrorDatos('sin_permiso', 'Solo un admin puede hacer esto.');
      }),
  };
}
