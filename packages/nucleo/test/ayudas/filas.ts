import type { FichaCruda, FilaCruda } from '../../src/ficha/leer';
import { panelComoExcel } from '../../src/ficha/panel';
import { armarSetCompat } from '../../src/preguntas';
import { DATOS_PAD } from './ficha-sintetica';

/** Una fila de Registro completa y limpia; `o` reemplaza las columnas que haga falta. */
export function fila(n: number, o: Partial<Omit<FilaCruda, 'fila'>> = {}): FilaCruda {
  return {
    fila: n,
    fecha: 46293,
    vuelta: 1,
    pregunta: 'P1',
    ia: 'ChatGPT',
    nombra: 'Sí',
    puesto: '1º',
    sentimiento: 'Bien',
    fuente: 'Nuestra web',
    marcasPrimero: '',
    puntos: 3,
    estado: 'Completa',
    ...o,
  };
}

/** Una ficha con los datos de PAD en mayúsculas (como la real), preguntas armadas y un Panel vacío. */
export function fichaDe(filas: FilaCruda[]): FichaCruda {
  const set = armarSetCompat(DATOS_PAD);
  const preguntas = Object.fromEntries(set.map((p) => [p.codigo, p.texto])) as FichaCruda['preguntas'];
  return { datos: { ...DATOS_PAD }, preguntas, filas, panel: panelComoExcel([]) };
}
