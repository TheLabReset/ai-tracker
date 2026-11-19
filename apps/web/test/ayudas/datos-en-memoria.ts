import { ErrorDatos, type Datos, type Marca, type Motor, type Perfil, type Sector } from '@lab/datos';
import { esCorreoPermitido } from '@lab/nucleo';

export interface UsuarioEnMemoria {
  correo: string;
  clave: string;
  admin: boolean;
}

export interface EstadoEnMemoria {
  sesion: string | null;
  usuarios: UsuarioEnMemoria[];
  motores: Motor[];
  sectores: Sector[];
  marcas: Marca[];
}

export interface Semilla {
  usuarios?: Array<{ correo: string; clave: string; admin?: boolean }>;
  motores?: Motor[];
  sectores?: Sector[];
  marcas?: Marca[];
}

const igual = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

const noImplementado = (nombre: string) => () => {
  throw new Error(`no implementado en memoria: ${nombre}`);
};

export function crearDatosEnMemoria(semilla: Semilla = {}): Datos & { estado: EstadoEnMemoria } {
  const estado: EstadoEnMemoria = {
    sesion: null,
    usuarios: (semilla.usuarios ?? []).map((u) => ({ correo: u.correo, clave: u.clave, admin: u.admin ?? false })),
    motores: semilla.motores ?? [],
    sectores: semilla.sectores ?? [],
    marcas: semilla.marcas ?? [],
  };

  const perfilDe = (correo: string): Perfil => {
    const usuario = estado.usuarios.find((u) => igual(u.correo, correo));
    return {
      id: correo.trim().toLowerCase(),
      correo: correo.trim().toLowerCase(),
      nombre: correo.split('@')[0] ?? correo,
      empresaId: /@wanted\.pe$/i.test(correo.trim()) ? 'wanted' : 'reset',
      esAdmin: usuario?.admin ?? false,
      membresias: [],
    };
  };

  return {
    estado,
    entrar: async (correo, clave) => {
      if (!esCorreoPermitido(correo)) throw new ErrorDatos('correo_no_permitido', 'Usa tu correo de Reset o Wanted.');
      const usuario = estado.usuarios.find((u) => igual(u.correo, correo));
      if (!usuario || usuario.clave !== clave) throw new ErrorDatos('credenciales', 'Correo o clave incorrectos.');
      estado.sesion = usuario.correo;
      return perfilDe(usuario.correo);
    },
    sesionActual: async () => (estado.sesion ? perfilDe(estado.sesion) : null),
    salir: async () => {
      estado.sesion = null;
    },
    pedirRecuperacion: async () => {},
    crearClave: async () => {},
    listarDirectorio: noImplementado('listarDirectorio'),
    listarUsuarios: noImplementado('listarUsuarios'),
    cambiarAdmin: noImplementado('cambiarAdmin'),
    asignarMembresia: noImplementado('asignarMembresia'),
    quitarMembresia: noImplementado('quitarMembresia'),
    listarSectores: noImplementado('listarSectores'),
    crearSector: noImplementado('crearSector'),
    listarMarcas: noImplementado('listarMarcas'),
    crearMarca: noImplementado('crearMarca'),
    agregarAlias: noImplementado('agregarAlias'),
    quitarAlias: noImplementado('quitarAlias'),
    listarMotores: noImplementado('listarMotores'),
    actualizarMotor: noImplementado('actualizarMotor'),
    historialMotor: noImplementado('historialMotor'),
    listarBitacora: noImplementado('listarBitacora'),
    listarPlantillas: noImplementado('listarPlantillas'),
    crearPlantilla: noImplementado('crearPlantilla'),
    crearProyecto: noImplementado('crearProyecto'),
    listarProyectos: noImplementado('listarProyectos'),
    obtenerProyecto: noImplementado('obtenerProyecto'),
    actualizarProyecto: noImplementado('actualizarProyecto'),
    cambiarCompetidores: noImplementado('cambiarCompetidores'),
    editarPregunta: noImplementado('editarPregunta'),
    agregarPregunta: noImplementado('agregarPregunta'),
    desactivarPregunta: noImplementado('desactivarPregunta'),
    cambiarEstado: noImplementado('cambiarEstado'),
  };
}
