import type { ClienteTracker } from './cliente';
import { comprobar, comprobarLista, conTraduccion } from './errores';
import { ErrorDatos, type Datos, type UsuarioListado } from './tipos';

type Usuarios = Pick<
  Datos,
  'listarDirectorio' | 'listarUsuarios' | 'cambiarAdmin' | 'asignarMembresia' | 'quitarMembresia'
>;

const sinPermiso = () => new ErrorDatos('sin_permiso', 'Solo un admin puede hacer esto.');

export function crearUsuarios(cliente: ClienteTracker, sesionActual: Datos['sesionActual']): Usuarios {
  return {
    listarDirectorio: () =>
      conTraduccion(async () => {
        const filas = comprobarLista(await cliente.from('usuarios').select('id, nombre, correo').order('nombre'));
        return filas as Array<{ id: string; nombre: string; correo: string }>;
      }),

    listarUsuarios: () =>
      conTraduccion(async () => {
        if (!(await sesionActual())?.esAdmin) throw sinPermiso();
        const usuarios = comprobarLista(await cliente.from('usuarios').select('*').order('nombre'));
        const membresias = comprobarLista(await cliente.from('membresias').select('*, marcas(nombre)'));
        return usuarios.map(
          (u: any): UsuarioListado => ({
            id: u.id,
            correo: u.correo,
            nombre: u.nombre,
            empresaId: u.empresa_id,
            esAdmin: u.es_admin,
            membresias: membresias
              .filter((m: any) => m.usuario_id === u.id)
              .map((m: any) => ({ marcaId: m.marca_id, marcaNombre: m.marcas?.nombre ?? m.marca_id, rol: m.rol })),
          }),
        );
      }),

    cambiarAdmin: (usuarioId, esAdmin) =>
      conTraduccion(async () => {
        comprobar(await cliente.rpc('cambiar_admin', { usuario: usuarioId, valor: esAdmin }));
      }),

    asignarMembresia: (usuarioId, marcaId, rol) =>
      conTraduccion(async () => {
        const filas = comprobarLista(
          await cliente
            .from('membresias')
            .upsert({ usuario_id: usuarioId, marca_id: marcaId, rol }, { onConflict: 'usuario_id,marca_id' })
            .select(),
        );
        if (filas.length === 0) throw sinPermiso();
      }),

    quitarMembresia: (usuarioId, marcaId) =>
      conTraduccion(async () => {
        const filtro = { usuario_id: usuarioId, marca_id: marcaId };
        const borradas = comprobarLista(await cliente.from('membresias').delete().match(filtro).select());
        if (borradas.length > 0) return;
        if (!comprobar(await cliente.rpc('es_admin'))) throw sinPermiso();
      }),
  };
}
