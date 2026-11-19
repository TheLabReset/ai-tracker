import type { Cadencia, Pesos, TipoPregunta } from '@lab/nucleo';

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

export interface Motor {
  id: string;
  codigo: string;
  nombre: string;
  proveedor: string;
  modelo: string | null;
  busquedaWeb: boolean;
  costoEstimado: number | null;
  activo: boolean;
  vigenteDesde: string;
}

export interface CambioMotor {
  modelo: string | null;
  busquedaWeb: boolean;
  vigenteHasta: string;
}

export interface Plantilla {
  id: string;
  codigo: string;
  sectorId: string | null;
  tipo: TipoPregunta;
  texto: string;
}

export type EstadoProyecto = 'activo' | 'pausado' | 'archivado';
export type SetPregunta = 'compat' | 'extendido' | 'propia';

export interface PreguntaProyecto {
  id: string;
  codigo: string;
  tipo: TipoPregunta;
  set: SetPregunta;
  categoria: string | null;
  texto: string;
  version: number;
}

export interface Proyecto {
  id: string;
  marca: Marca;
  sector: Sector;
  categoriasExtra: string[];
  competidores: Marca[];
  competidorPrincipalId: string | null;
  motores: Motor[];
  preguntas: PreguntaProyecto[];
  cadencia: Cadencia;
  diaSemana: number;
  hora: string;
  muestras: number;
  pesos: Pesos;
  topeGastoMensual: number | null;
  estado: EstadoProyecto;
}

export interface ResumenProyecto {
  id: string;
  marcaNombre: string;
  sectorNombre: string;
  estado: EstadoProyecto;
  miRol: RolMarca | 'admin';
}

export interface DatosAlta {
  marca: NuevaMarca & { empresaId: 'reset' | 'wanted' };
  sector: { id: string } | { nombre: string; categoria: string };
  categoriasExtra: string[];
  competidores: Array<{ id: string } | NuevaMarca>;
  competidorPrincipal: number;
  preguntas: Array<{ codigo: string; tipo: TipoPregunta; set: SetPregunta; categoria: string | null; texto: string }>;
  motorIds: string[];
  cadencia: Cadencia;
  diaSemana: number;
  hora: string;
  muestras: number;
  topeGastoMensual: number | null;
  liderId?: string;
  responsableId?: string;
}

export type CambiosProyecto = Partial<
  Pick<Proyecto, 'cadencia' | 'diaSemana' | 'hora' | 'muestras' | 'pesos' | 'topeGastoMensual' | 'categoriasExtra' | 'competidorPrincipalId'>
> & { motorIds?: string[] };

export interface NuevaPregunta {
  tipo: TipoPregunta;
  texto: string;
  categoria: string | null;
}

export interface EntradaBitacora {
  fecha: string;
  usuarioCorreo: string | null;
  entidad: string;
  entidadId: string;
  accion: 'insertar' | 'actualizar' | 'borrar';
  antes: unknown;
  despues: unknown;
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
  listarMotores(): Promise<Motor[]>;
  actualizarMotor(
    id: string,
    cambios: Partial<Pick<Motor, 'modelo' | 'busquedaWeb' | 'costoEstimado' | 'activo'>>,
  ): Promise<Motor>;
  historialMotor(id: string): Promise<CambioMotor[]>;
  listarBitacora(o?: { entidad?: string; limite?: number }): Promise<EntradaBitacora[]>;
  listarPlantillas(sectorId?: string): Promise<Plantilla[]>;
  crearPlantilla(p: { codigo: string; sectorId: string; tipo: TipoPregunta; texto: string }): Promise<Plantilla>;
  crearProyecto(d: DatosAlta): Promise<string>;
  listarProyectos(): Promise<ResumenProyecto[]>;
  obtenerProyecto(id: string): Promise<Proyecto>;
  actualizarProyecto(id: string, c: CambiosProyecto): Promise<void>;
  cambiarCompetidores(id: string, marcaIds: string[]): Promise<void>;
  editarPregunta(preguntaId: string, texto: string): Promise<PreguntaProyecto>;
  agregarPregunta(proyectoId: string, p: NuevaPregunta): Promise<PreguntaProyecto>;
  desactivarPregunta(preguntaId: string): Promise<void>;
  cambiarEstado(id: string, estado: EstadoProyecto): Promise<void>;
}
