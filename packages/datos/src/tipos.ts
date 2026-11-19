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
}
