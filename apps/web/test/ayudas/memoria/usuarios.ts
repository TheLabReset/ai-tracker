import { ErrorDatos, type Datos, type RolMarca, type UsuarioListado } from '@lab/datos';
import { empresaDeCorreo } from '@lab/nucleo';
import { duplicado, generico, idDe, porTexto, sinPermiso, type Contexto } from './contexto';

type Usuarios = Pick<
  Datos,
  'listarDirectorio' | 'listarUsuarios' | 'cambiarAdmin' | 'asignarMembresia' | 'quitarMembresia'
>;

const ROLES: RolMarca[] = ['lider', 'responsable', 'planning', 'lector'];

export function crearUsuarios(ctx: Contexto): Usuarios {
  const { estado } = ctx;
  const perfiles = () => estado.usuarios.map((u) => ctx.perfilDe(u)).sort((a, b) => porTexto(a.nombre, b.nombre));

  return {
    listarDirectorio: () => ctx.leer(() => perfiles().map((p) => ({ id: p.id, nombre: p.nombre, correo: p.correo }))),

    listarUsuarios: () =>
      ctx.leer((yo) => {
        if (!yo.admin) throw sinPermiso();
        return perfiles().map(
          (p): UsuarioListado => ({
            id: p.id,
            correo: p.correo,
            nombre: p.nombre,
            empresaId: p.empresaId,
            esAdmin: p.esAdmin,
            membresias: estado.membresias
              .filter((m) => m.usuarioId === p.id)
              .map((m) => ({
                marcaId: m.marcaId,
                marcaNombre: estado.marcas.find((x) => x.id === m.marcaId)?.nombre ?? m.marcaId,
                rol: m.rol,
              })),
          }),
        );
      }),

    cambiarAdmin: (usuarioId, esAdmin) =>
      ctx.escribir((yo) => {
        if (!yo.admin) throw new ErrorDatos('sin_permiso', 'Solo un admin puede cambiar esto.');
        const usuario = estado.usuarios.find((u) => idDe(u) === usuarioId);
        if (!usuario) throw new ErrorDatos('datos_invalidos', 'No encontramos a esa persona.');
        const fila = () => ({ id: idDe(usuario), correo: idDe(usuario), empresa_id: empresaDeCorreo(usuario.correo), es_admin: usuario.admin });
        const antes = fila();
        usuario.admin = esAdmin;
        if (!esAdmin) estado.admins = estado.admins.filter((a) => a !== idDe(usuario));
        ctx.registrarSiCambia('usuarios', idDe(usuario), antes, fila());
      }),

    asignarMembresia: (usuarioId, marcaId, rol) =>
      ctx.escribir((yo) => {
        if (!yo.admin) throw sinPermiso();
        const existe = estado.usuarios.some((u) => idDe(u) === usuarioId) && estado.marcas.some((m) => m.id === marcaId);
        if (!existe || !ROLES.includes(rol)) throw generico();
        ponerMembresia(ctx, usuarioId, marcaId, rol, true);
      }),

    quitarMembresia: (usuarioId, marcaId) =>
      ctx.escribir((yo) => {
        if (!yo.admin) throw sinPermiso();
        const i = estado.membresias.findIndex((m) => m.usuarioId === usuarioId && m.marcaId === marcaId);
        if (i < 0) return;
        const [borrada] = estado.membresias.splice(i, 1);
        ctx.registrar('membresias', `${usuarioId}/${marcaId}`, 'borrar', borrada, null);
      }),
  };
}

export function ponerMembresia(ctx: Contexto, usuarioId: string, marcaId: string, rol: RolMarca, actualizar: boolean) {
  const { estado } = ctx;
  const existente = estado.membresias.find((m) => m.usuarioId === usuarioId && m.marcaId === marcaId);
  const clave = `${usuarioId}/${marcaId}`;
  if (!existente) {
    const nueva = { usuarioId, marcaId, rol };
    estado.membresias.push(nueva);
    ctx.registrar('membresias', clave, 'insertar', null, nueva);
    return;
  }
  if (!actualizar) throw duplicado();
  const antes = { ...existente };
  existente.rol = rol;
  ctx.registrarSiCambia('membresias', clave, antes, existente);
}
