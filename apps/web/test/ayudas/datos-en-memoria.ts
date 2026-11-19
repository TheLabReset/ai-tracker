import type { Datos, Marca, Motor, Sector } from '@lab/datos';
import { crearBitacora } from './memoria/bitacora';
import { crearCatalogo } from './memoria/catalogo';
import { crearContexto, type EstadoEnMemoria } from './memoria/contexto';
import { crearEdicion } from './memoria/edicion';
import { crearMotores, motoresIniciales } from './memoria/motores';
import { crearPlantillas, plantillasGlobales } from './memoria/plantillas';
import { crearProyectos } from './memoria/proyectos';
import { crearSesion } from './memoria/sesion';
import { crearUsuarios } from './memoria/usuarios';

export type { EstadoEnMemoria, UsuarioEnMemoria } from './memoria/contexto';
export { motoresIniciales };

export function idDeUsuario(datos: { estado: EstadoEnMemoria }, correo: string): string {
  const u = datos.estado.usuarios.find((x) => x.correo.trim().toLowerCase() === correo.trim().toLowerCase());
  if (!u) throw new Error(`no hay usuario ${correo}`);
  return u.id;
}

export interface Semilla {
  usuarios?: Array<{ correo: string; clave: string; admin?: boolean }>;
  motores?: Motor[];
  sectores?: Sector[];
  marcas?: Marca[];
}

export function crearDatosEnMemoria(semilla: Semilla = {}): Datos & { estado: EstadoEnMemoria } {
  const usuarios = (semilla.usuarios ?? []).map((u) => ({ id: crypto.randomUUID(), correo: u.correo.trim().toLowerCase(), clave: u.clave, admin: u.admin ?? false }));
  const estado: EstadoEnMemoria = {
    sesion: null,
    usuarios,
    admins: usuarios.filter((u) => u.admin).map((u) => u.correo),
    membresias: [],
    motores: structuredClone(semilla.motores ?? motoresIniciales()),
    historialMotores: [],
    sectores: structuredClone(semilla.sectores ?? []),
    marcas: structuredClone(semilla.marcas ?? []),
    plantillas: plantillasGlobales(),
    proyectos: [],
    preguntas: [],
    bitacora: [],
    recuperaciones: [],
    clavesNuevas: [],
    intentosDeEntrada: 0,
  };
  const ctx = crearContexto(estado);
  return {
    estado,
    ...crearSesion(ctx),
    ...crearUsuarios(ctx),
    ...crearCatalogo(ctx),
    ...crearMotores(ctx),
    ...crearPlantillas(ctx),
    ...crearProyectos(ctx),
    ...crearEdicion(ctx),
    ...crearBitacora(ctx),
  };
}

export function sectorConMarcas(
  nombre: string,
  marcas: Array<string | { nombre: string; alias?: string[] }>,
  categoria = nombre.toLowerCase(),
): { sectores: Sector[]; marcas: Marca[] } {
  const sector: Sector = { id: crypto.randomUUID(), nombre, categoria };
  return {
    sectores: [sector],
    marcas: marcas.map((m) => {
      const { nombre: n, alias = [] } = typeof m === 'string' ? { nombre: m } : m;
      return {
        id: crypto.randomUUID(),
        sectorId: sector.id,
        nombre: n,
        ambiguo: false,
        esCliente: false,
        empresaId: null,
        dominios: [],
        alias: [...alias].sort().map((texto) => ({ id: crypto.randomUUID(), texto, ambiguo: false })),
      };
    }),
  };
}
