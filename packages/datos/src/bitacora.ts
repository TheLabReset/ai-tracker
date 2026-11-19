import type { ClienteTracker } from './cliente';
import { comprobar, comprobarLista, conTraduccion, sinPermiso } from './errores';
import type { Datos } from './tipos';

type Bitacora = Pick<Datos, 'listarBitacora'>;

const LIMITE_POR_DEFECTO = 100;
const LIMITE_MAXIMO = 500;
const LOTE_USUARIOS = 50;

export function crearBitacora(cliente: ClienteTracker): Bitacora {
  return {
    listarBitacora: (o = {}) =>
      conTraduccion(async () => {
        if (!comprobar(await cliente.rpc('es_admin'))) throw sinPermiso();
        const limite = Math.min(Math.max(Math.trunc(o.limite ?? LIMITE_POR_DEFECTO), 1), LIMITE_MAXIMO);
        let consulta = cliente.from('bitacora').select('*').order('fecha', { ascending: false }).order('id', { ascending: false });
        if (o.entidad) consulta = consulta.eq('entidad', o.entidad);
        const filas = comprobarLista(await consulta.limit(limite));
        const ids = [...new Set(filas.map((f: any) => f.usuario_id).filter(Boolean))];
        const correos = new Map<string, string>();
        for (let i = 0; i < ids.length; i += LOTE_USUARIOS) {
          const lote = ids.slice(i, i + LOTE_USUARIOS);
          for (const u of comprobarLista(await cliente.from('usuarios').select('id, correo').in('id', lote))) {
            correos.set((u as any).id, (u as any).correo);
          }
        }
        return filas.map((f: any) => ({
          fecha: new Date(f.fecha).toISOString(),
          usuarioCorreo: f.usuario_id ? (correos.get(f.usuario_id) ?? null) : null,
          entidad: f.entidad,
          entidadId: f.entidad_id,
          accion: f.accion,
          antes: f.antes,
          despues: f.despues,
        }));
      }),
  };
}
