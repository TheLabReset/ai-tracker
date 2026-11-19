import type { Datos } from '@lab/datos';
import { sinPermiso, type Contexto } from './contexto';

const LIMITE_POR_DEFECTO = 100;
const LIMITE_MAXIMO = 500;

export function crearBitacora(ctx: Contexto): Pick<Datos, 'listarBitacora'> {
  return {
    listarBitacora: (o = {}) =>
      ctx.leer((yo) => {
        if (!yo.admin) throw sinPermiso();
        const pedido = Number.isFinite(o.limite) ? Math.trunc(o.limite!) : LIMITE_POR_DEFECTO;
        const limite = Math.min(Math.max(pedido, 1), LIMITE_MAXIMO);
        return ctx.estado.bitacora
          .filter((e) => !o.entidad || e.entidad === o.entidad)
          .reverse()
          .slice(0, limite);
      }),
  };
}
