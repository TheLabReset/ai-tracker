import type { Accion, Borrador } from './borrador';

export interface PropsPaso {
  borrador: Borrador;
  despachar: (accion: Accion) => void;
}
