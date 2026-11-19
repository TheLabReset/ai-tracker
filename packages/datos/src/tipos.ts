export type RolMarca = 'lider' | 'responsable' | 'planning' | 'lector';

export type CodigoError =
  | 'correo_no_permitido'
  | 'credenciales'
  | 'sin_permiso'
  | 'colision_alias'
  | 'limite_competidores'
  | 'datos_invalidos'
  | 'conexion'
  | 'otro';

export class ErrorDatos extends Error {
  constructor(
    public codigo: CodigoError,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = 'ErrorDatos';
  }
}

export interface Perfil {
  id: string;
  correo: string;
  nombre: string;
  empresaId: 'reset' | 'wanted';
  esAdmin: boolean;
  membresias: Array<{ marcaId: string; rol: RolMarca }>;
}

export interface UsuarioListado {
  id: string;
  correo: string;
  nombre: string;
  empresaId: 'reset' | 'wanted';
  esAdmin: boolean;
  membresias: Array<{ marcaId: string; marcaNombre: string; rol: RolMarca }>;
}

export interface Sector {
  id: string;
  nombre: string;
  categoria: string;
}

export interface AliasGuardado {
  id: string;
  texto: string;
  ambiguo: boolean;
}

export interface Marca {
  id: string;
  sectorId: string;
  nombre: string;
  ambiguo: boolean;
  esCliente: boolean;
  empresaId: 'reset' | 'wanted' | null;
  dominios: string[];
  alias: AliasGuardado[];
}

export interface NuevaMarca {
  nombre: string;
  ambiguo: boolean;
  alias: Array<{ texto: string; ambiguo: boolean }>;
  dominios: string[];
}

export interface Datos {
  entrar(correo: string, clave: string): Promise<Perfil>;
  sesionActual(): Promise<Perfil | null>;
  salir(): Promise<void>;
  pedirRecuperacion(correo: string): Promise<void>;
  crearClave(clave: string): Promise<void>;
  listarDirectorio(): Promise<Array<{ id: string; nombre: string; correo: string }>>;
  listarUsuarios(): Promise<UsuarioListado[]>;
  cambiarAdmin(usuarioId: string, esAdmin: boolean): Promise<void>;
  asignarMembresia(usuarioId: string, marcaId: string, rol: RolMarca): Promise<void>;
  quitarMembresia(usuarioId: string, marcaId: string): Promise<void>;
  listarSectores(): Promise<Sector[]>;
  crearSector(s: { nombre: string; categoria: string }): Promise<Sector>;
  listarMarcas(sectorId: string): Promise<Marca[]>;
  crearMarca(sectorId: string, m: NuevaMarca): Promise<Marca>;
  agregarAlias(marcaId: string, a: { texto: string; ambiguo: boolean }): Promise<AliasGuardado>;
  quitarAlias(aliasId: string): Promise<void>;
}
