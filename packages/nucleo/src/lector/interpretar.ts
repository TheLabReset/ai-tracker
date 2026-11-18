import type { MarcaCatalogo, Mencion } from '../dominio';
import { resolverMarca } from '../marcas';
import { claveMarca } from '../texto';
import type { Lectura } from './esquema';

interface Grupo {
  mencion: Mencion;
  lugarEnLista: number | null;
}

/** Convierte la lectura en menciones normalizadas con su posición. */
export function interpretarLectura(lectura: Lectura, catalogo: MarcaCatalogo[]): Mencion[] {
  const grupos = new Map<string, Grupo>();
  for (const leida of [...lectura.marcas].sort((a, b) => a.orden - b.orden)) {
    const { marcaId, via } = resolverMarca(leida.nombre, catalogo);
    const clave = marcaId ?? `d:${claveMarca(leida.nombre)}`;
    const lugar = leida.recomendada ? leida.lugarEnLista : null;
    const grupo = grupos.get(clave);
    if (!grupo) {
      grupos.set(clave, {
        lugarEnLista: lugar,
        mencion: {
          marcaId,
          textoDetectado: leida.nombre,
          orden: leida.orden,
          posicion: null,
          recomendada: leida.recomendada,
          sentimiento: leida.sentimiento,
          fragmento: leida.fragmento,
          via,
        },
      });
      continue;
    }
    grupo.mencion.recomendada ||= leida.recomendada;
    if (lugar !== null) grupo.lugarEnLista = grupo.lugarEnLista === null ? lugar : Math.min(grupo.lugarEnLista, lugar);
  }

  const todos = [...grupos.values()];
  const porLista = lectura.formato !== 'prosa';
  todos
    .filter((g) => g.mencion.recomendada)
    .sort((a, b) =>
      porLista
        ? (a.lugarEnLista ?? Infinity) - (b.lugarEnLista ?? Infinity) || a.mencion.orden - b.mencion.orden
        : a.mencion.orden - b.mencion.orden,
    )
    .forEach((g, i) => {
      g.mencion.posicion = i + 1;
    });
  return todos.map((g) => g.mencion).sort((a, b) => a.orden - b.orden);
}
