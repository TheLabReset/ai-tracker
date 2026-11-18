import { fechaDeCelda, semanaDelControl } from '../calendario';
import { CODIGOS_COMPAT, IAS_FICHA, type ValorCelda } from '../dominio';
import { canonizar, type ColumnaLista } from '../valores';
import { ULTIMA_FILA_DEL_PANEL, type FichaCruda, type FilaCruda } from './leer';

export type TipoAnomalia =
  | 'valor_fuera_de_lista'
  | 'fila_incompleta'
  | 'vuelta_sin_numero'
  | 'formula_rota'
  | 'puesto_con_no'
  | 'vuelta_distinta_de_semana'
  | 'cobertura_incompleta'
  | 'fuera_del_panel';

export type ColumnaRegistro = 'vuelta' | 'pregunta' | 'ia' | 'nombra' | 'puesto' | 'sentimiento' | 'fuente' | 'puntos' | 'estado';

export interface Correccion {
  /** `${fila}:${columna}` */
  id: string;
  fila: number;
  columna: ColumnaRegistro;
  de: ValorCelda;
  a: string | number | null;
}

export interface Anomalia {
  tipo: TipoAnomalia;
  fila: number | null;
  vuelta: number | null;
  columna: ColumnaRegistro | null;
  valor: ValorCelda;
  detalle: string;
  correccion: Correccion | null;
}

const COLUMNAS_LISTA: ColumnaLista[] = ['pregunta', 'ia', 'nombra', 'puesto', 'sentimiento', 'fuente'];

const vacia = (v: ValorCelda): boolean => v === null || v === '';
const esError = (v: ValorCelda): v is { error: string } => typeof v === 'object' && v !== null;
const igual = (v: ValorCelda, esperado: string): boolean =>
  typeof v === 'string' && v.toLocaleLowerCase('es') === esperado.toLocaleLowerCase('es');

function vueltaNumerica(v: ValorCelda): number | null {
  return typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null;
}

/**
 * El texto de la columna K ("Estado de la fila") calculado sobre los valores crudos, como la
 * fórmula de la ficha. null = la fila está completa o la ficha la considera vacía.
 */
export function estadoDeFila(f: FilaCruda): string | null {
  if ([f.vuelta, f.pregunta, f.ia, f.nombra].every(vacia)) return null;
  if (vacia(f.vuelta) || vacia(f.pregunta) || vacia(f.ia)) return 'Falta vuelta, pregunta o IA';
  if (vacia(f.nombra)) return 'Falta ¿nos nombra?';
  if (igual(f.nombra, 'Sí') && vacia(f.puesto)) return 'Falta el puesto';
  if (vacia(f.fuente)) return 'Falta la fuente';
  return null;
}

function correccion(fila: number, columna: ColumnaRegistro, de: ValorCelda, a: string | number | null): Correccion {
  return { id: `${fila}:${columna}`, fila, columna, de, a };
}

function proponerVuelta(f: FilaCruda, filas: FilaCruda[]): number | null {
  const fecha = fechaDeCelda(f.fecha);
  const numeradas = filas.filter((x) => vueltaNumerica(x.vuelta) !== null);
  if (fecha !== null) {
    const mismaFecha = new Set(numeradas.filter((x) => fechaDeCelda(x.fecha) === fecha).map((x) => x.vuelta as number));
    if (mismaFecha.size === 1) return [...mismaFecha][0]!;
  }
  if (numeradas.length === 0 || fecha === null) return null;
  const fechas = numeradas.map((x) => fechaDeCelda(x.fecha)).filter((x): x is string => x !== null);
  const ultimaFecha = fechas.sort().at(-1);
  if (ultimaFecha === undefined || fecha <= ultimaFecha) return null;
  return Math.max(...numeradas.map((x) => x.vuelta as number)) + 1;
}

/**
 * Informe de calidad de una ficha (§5.6, "Limpieza asistida"): cada problema con una corrección
 * propuesta cuando la hay. No corrige nada; las correcciones se aplican solo si se aceptan.
 */
export function diagnosticarFicha(ficha: FichaCruda): Anomalia[] {
  const { filas } = ficha;
  const anomalias: Anomalia[] = [];

  for (const f of filas) {
    let vuelta = vueltaNumerica(f.vuelta);

    if (vacia(f.vuelta)) {
      const propuesta = proponerVuelta(f, filas);
      vuelta = propuesta;
      anomalias.push({
        tipo: 'vuelta_sin_numero',
        fila: f.fila,
        vuelta: propuesta,
        columna: 'vuelta',
        valor: f.vuelta,
        detalle: propuesta === null ? 'La fila no tiene número de vuelta' : `La fila no tiene número de vuelta; se propone la ${propuesta}`,
        correccion: propuesta === null ? null : correccion(f.fila, 'vuelta', f.vuelta, propuesta),
      });
    } else if (vuelta === null) {
      const texto = typeof f.vuelta === 'string' ? f.vuelta.trim() : '';
      const numero = /^\d+$/.test(texto) && Number(texto) > 0 ? Number(texto) : null;
      vuelta = numero;
      anomalias.push({
        tipo: 'valor_fuera_de_lista',
        fila: f.fila,
        vuelta: numero,
        columna: 'vuelta',
        valor: f.vuelta,
        detalle: numero === null ? 'La vuelta no es un número' : 'La vuelta está escrita como texto',
        correccion: correccion(f.fila, 'vuelta', f.vuelta, numero),
      });
    }

    for (const columna of COLUMNAS_LISTA) {
      const v = f[columna];
      if (vacia(v)) continue;
      const canon = canonizar(columna, v);
      if (canon.exacto) continue;
      anomalias.push({
        tipo: 'valor_fuera_de_lista',
        fila: f.fila,
        vuelta,
        columna,
        valor: v,
        detalle: canon.valor === null ? 'Valor fuera de la lista; se propone dejarlo vacío' : `Valor fuera de la lista; se propone "${canon.valor}"`,
        correccion: correccion(f.fila, columna, v, canon.valor),
      });
    }

    if (canonizar('nombra', f.nombra).valor === 'No' && !vacia(f.puesto)) {
      anomalias.push({
        tipo: 'puesto_con_no',
        fila: f.fila,
        vuelta,
        columna: 'puesto',
        valor: f.puesto,
        detalle: 'La fila dice que no nos nombra, pero tiene puesto',
        correccion: correccion(f.fila, 'puesto', f.puesto, null),
      });
    }

    const rota = esError(f.puntos) ? 'puntos' : esError(f.estado) ? 'estado' : null;
    if (rota) {
      anomalias.push({
        tipo: 'formula_rota',
        fila: f.fila,
        vuelta,
        columna: rota,
        valor: f[rota],
        detalle: 'Fórmula rota; se recalcula al importar',
        correccion: null,
      });
    }

    if (f.fila > ULTIMA_FILA_DEL_PANEL) {
      anomalias.push({
        tipo: 'fuera_del_panel',
        fila: f.fila,
        vuelta,
        columna: null,
        valor: null,
        detalle: `La fila está después de la ${ULTIMA_FILA_DEL_PANEL}: se importa, pero el Panel de la ficha no la cuenta`,
        correccion: null,
      });
    }

    const estado = estadoDeFila(f);
    if (estado) {
      anomalias.push({ tipo: 'fila_incompleta', fila: f.fila, vuelta, columna: null, valor: null, detalle: estado, correccion: null });
    }
  }

  const porVuelta = new Map<number, FilaCruda[]>();
  for (const f of filas) {
    const v = vueltaNumerica(f.vuelta);
    if (v !== null) porVuelta.set(v, [...(porVuelta.get(v) ?? []), f]);
  }
  const vueltas = [...porVuelta.keys()].sort((a, b) => a - b);

  for (const v of vueltas) {
    const fechas = porVuelta
      .get(v)!
      .map((f) => fechaDeCelda(f.fecha))
      .filter((x): x is string => x !== null)
      .sort();
    const fecha = fechas[0];
    if (fecha === undefined) continue;
    const semana = semanaDelControl(fecha);
    if (semana !== v) {
      anomalias.push({
        tipo: 'vuelta_distinta_de_semana',
        fila: null,
        vuelta: v,
        columna: null,
        valor: null,
        detalle: `La vuelta ${v} es del ${fecha}, que cae en la semana ${semana} del control`,
        correccion: null,
      });
    }
  }

  for (const v of vueltas) {
    const presentes = new Set(
      porVuelta.get(v)!.map((f) => `${canonizar('pregunta', f.pregunta).valor}|${canonizar('ia', f.ia).valor}`),
    );
    const faltantes = IAS_FICHA.map((ia) => ({ ia, preguntas: CODIGOS_COMPAT.filter((p) => !presentes.has(`${p}|${ia}`)) })).filter(
      (x) => x.preguntas.length > 0,
    );
    if (faltantes.length > 0) {
      anomalias.push({
        tipo: 'cobertura_incompleta',
        fila: null,
        vuelta: v,
        columna: null,
        valor: null,
        detalle: `Faltan respuestas: ${faltantes.map((x) => `${x.ia} (${x.preguntas.join(', ')})`).join('; ')}`,
        correccion: null,
      });
    }
  }

  return anomalias;
}

function mismoValor(a: ValorCelda, b: ValorCelda): boolean {
  if (esError(a) || esError(b)) return esError(a) && esError(b) && a.error === b.error;
  return a === b;
}

/**
 * Aplica solo las correcciones aceptadas, sobre una copia de las filas. Una corrección se aplica
 * solo si la celda todavía tiene el valor que se propuso corregir (`de`): si la ficha cambió
 * después de aceptarla, la corrección queda sin efecto en vez de pisar el dato nuevo.
 */
export function aplicarCorrecciones(filas: FilaCruda[], aceptadas: Correccion[]): FilaCruda[] {
  const porFila = new Map<number, Correccion[]>();
  for (const c of aceptadas) porFila.set(c.fila, [...(porFila.get(c.fila) ?? []), c]);
  return filas.map((f) => {
    const copia: FilaCruda = { ...f };
    for (const c of porFila.get(f.fila) ?? []) if (mismoValor(f[c.columna], c.de)) copia[c.columna] = c.a;
    return copia;
  });
}
