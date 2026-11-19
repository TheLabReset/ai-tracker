import {
  ErrorDatos,
  type CambioMotor,
  type EntradaBitacora,
  type EstadoProyecto,
  type Marca,
  type Motor,
  type Perfil,
  type Plantilla,
  type PreguntaProyecto,
  type RolMarca,
  type Sector,
} from '@lab/datos';
import { empresaDeCorreo, esCorreoPermitido, type Cadencia, type Pesos } from '@lab/nucleo';

export interface UsuarioEnMemoria {
  id: string;
  correo: string;
  clave: string;
  admin: boolean;
}

export interface MembresiaEnMemoria {
  usuarioId: string;
  marcaId: string;
  rol: RolMarca;
}

export interface CambioMotorEnMemoria extends CambioMotor {
  motorId: string;
}

export interface ProyectoEnMemoria {
  id: string;
  marcaId: string;
  sectorId: string;
  categoriasExtra: string[];
  competidorIds: string[];
  competidorPrincipalId: string | null;
  motorIds: string[];
  cadencia: Cadencia;
  diaSemana: number;
  hora: string;
  muestras: number;
  pesos: Pesos;
  topeGastoMensual: number | null;
  estado: EstadoProyecto;
  creadoPor: string;
}

export interface PreguntaEnMemoria extends PreguntaProyecto {
  proyectoId: string;
  activa: boolean;
  reemplazaA: string | null;
}

export interface EstadoEnMemoria {
  sesion: string | null;
  usuarios: UsuarioEnMemoria[];
  admins: string[];
  membresias: MembresiaEnMemoria[];
  motores: Motor[];
  historialMotores: CambioMotorEnMemoria[];
  sectores: Sector[];
  marcas: Marca[];
  plantillas: Plantilla[];
  proyectos: ProyectoEnMemoria[];
  preguntas: PreguntaEnMemoria[];
  bitacora: EntradaBitacora[];
  recuperaciones: string[];
  clavesNuevas: string[];
}

export const INICIO = '2026-11-18T00:00:00.000Z';

export const igual = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
export const porTexto = (a: string, b: string) => a.localeCompare(b, 'es');
export const idDe = (u: UsuarioEnMemoria) => u.id;
export const correoDe = (u: UsuarioEnMemoria) => u.correo.trim().toLowerCase();
export const esUuid = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

export const sinSesion = () => new ErrorDatos('sin_permiso', 'Tu sesión terminó. Vuelve a entrar.');
export const sinPermiso = () => new ErrorDatos('sin_permiso', 'Solo un admin puede hacer esto.');
export const sinPermisoCatalogo = () => new ErrorDatos('sin_permiso', 'No tienes permiso para hacer esto.');
export const sinEdicion = () => new ErrorDatos('sin_permiso', 'No tienes permiso para editar este proyecto.');
export const invalido = (mensaje: string) => new ErrorDatos('datos_invalidos', mensaje);
export const generico = () => invalido('Los datos no son válidos.');
export const duplicado = () => invalido('Ese dato ya existe.');

function initcap(texto: string): string {
  return texto.toLowerCase().replace(/[a-z0-9áéíóúñü]+/g, (p) => p[0]!.toUpperCase() + p.slice(1));
}

export function crearContexto(estado: EstadoEnMemoria) {
  let tick = 0;
  const ahora = () => new Date(Date.parse(INICIO) + ++tick * 1000).toISOString();
  const nuevoId = () => crypto.randomUUID();

  const yo = (): UsuarioEnMemoria => {
    if (!estado.sesion) throw sinSesion();
    const existente = estado.usuarios.find((u) => igual(u.correo, estado.sesion!));
    if (existente) return existente;
    if (!esCorreoPermitido(estado.sesion)) throw sinSesion();
    const correo = estado.sesion.trim().toLowerCase();
    const nuevo = { id: nuevoId(), correo, clave: nuevoId(), admin: estado.admins.includes(correo) };
    estado.usuarios.push(nuevo);
    return nuevo;
  };

  const membresiasDe = (u: UsuarioEnMemoria) => estado.membresias.filter((m) => m.usuarioId === idDe(u));
  const esLider = (u: UsuarioEnMemoria) => membresiasDe(u).some((m) => m.rol === 'lider');
  const puedeAmpliar = (u: UsuarioEnMemoria) => u.admin || esLider(u);
  const puedeVer = (u: UsuarioEnMemoria, marcaId: string) => u.admin || membresiasDe(u).some((m) => m.marcaId === marcaId);
  const puedeEditar = (u: UsuarioEnMemoria, marcaId: string) =>
    u.admin || membresiasDe(u).some((m) => m.marcaId === marcaId && m.rol === 'lider');

  const perfilDe = (u: UsuarioEnMemoria): Perfil => ({
    id: idDe(u),
    correo: correoDe(u),
    nombre: initcap((correoDe(u).split('@')[0] ?? '').replace(/\./g, ' ')),
    empresaId: empresaDeCorreo(u.correo) ?? 'reset',
    esAdmin: u.admin,
    membresias: membresiasDe(u)
      .map((m) => ({ marcaId: m.marcaId, rol: m.rol }))
      .sort((a, b) => (a.marcaId < b.marcaId ? -1 : a.marcaId > b.marcaId ? 1 : 0)),
  });

  const registrar = (entidad: string, entidadId: string, accion: EntradaBitacora['accion'], antes: unknown, despues: unknown) => {
    estado.bitacora.push({
      fecha: ahora(),
      usuarioCorreo: estado.sesion ? estado.sesion.trim().toLowerCase() : null,
      entidad,
      entidadId,
      accion,
      antes: structuredClone(antes),
      despues: structuredClone(despues),
    });
  };

  const registrarSiCambia = (entidad: string, entidadId: string, antes: unknown, despues: unknown) => {
    if (JSON.stringify(antes) !== JSON.stringify(despues)) registrar(entidad, entidadId, 'actualizar', antes, despues);
  };

  const leer = async <T>(fn: (u: UsuarioEnMemoria) => T): Promise<T> => structuredClone(fn(yo()));

  const escribir = async <T>(fn: (u: UsuarioEnMemoria) => T): Promise<T> => {
    const u = yo();
    const { sesion: _sesion, ...copia } = structuredClone(estado);
    try {
      return structuredClone(fn(u));
    } catch (e) {
      Object.assign(estado, copia);
      throw e;
    }
  };

  return {
    estado,
    ahora,
    nuevoId,
    yo,
    membresiasDe,
    esLider,
    puedeAmpliar,
    puedeVer,
    puedeEditar,
    perfilDe,
    registrar,
    registrarSiCambia,
    leer,
    escribir,
  };
}

export type Contexto = ReturnType<typeof crearContexto>;
