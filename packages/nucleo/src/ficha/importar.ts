import { fechaDeCelda, semanaDelControl } from '../calendario';
import {
  FUENTES,
  IAS_FICHA,
  MOTOR_DE_IA,
  NOS_NOMBRA,
  PUESTOS,
  SENTIMIENTOS,
  TIPO_DE_PREGUNTA_COMPAT,
  CODIGOS_COMPAT,
  type CodigoCompat,
  type IaFicha,
  type MarcaCatalogo,
  type Mencion,
  type RegistroCliente,
  type Respuesta,
  type ValorCelda,
} from '../dominio';
import { dividirListaMarcas, resolverMarca } from '../marcas';
import { aTitulo, claveMarca, esTodoMayusculas } from '../texto';
import { aplicarCorrecciones, diagnosticarFicha, estadoDeFila, type Correccion, type TipoAnomalia } from './diagnostico';
import type { FichaCruda } from './leer';

export interface OpcionesImportacion {
  marcaClienteId: string;
  competidorPrincipalId?: string;
  catalogo: MarcaCatalogo[];
  aceptadas: Correccion[];
}

export interface ResultadoImportacion {
  /** Propuesta de mayúsculas normales; la persona la corrige en la vista previa. */
  datos: { categoria: string; marca: string; competidor: string };
  /** fecha y semana son null solo si ninguna fila de la vuelta tiene una fecha legible. */
  vueltas: Array<{ numero: number; fecha: string | null; semana: number | null }>;
  respuestas: Respuesta[];
  filasMarcadas: Array<{ fila: number; motivos: TipoAnomalia[] }>;
  excluidas: Array<{ fila: number; motivo: string }>;
  descubiertas: Array<{ texto: string; ocurrencias: number }>;
  competidoresSugeridos: Array<{ marcaId: string | null; texto: string; ocurrencias: number }>;
}

const MARCABLES: ReadonlySet<TipoAnomalia> = new Set(['fila_incompleta', 'valor_fuera_de_lista', 'puesto_con_no', 'vuelta_sin_numero']);
const colacion = new Intl.Collator('es');

function exacto<T extends string>(lista: readonly T[], v: ValorCelda): T | null {
  return typeof v === 'string' && (lista as readonly string[]).includes(v) ? (v as T) : null;
}

function proponerDatos(d: FichaCruda['datos']): FichaCruda['datos'] {
  const enMayusculas = [d.categoria, d.marca, d.competidor].every(esTodoMayusculas);
  if (!enMayusculas) return { categoria: d.categoria.trim(), marca: d.marca.trim(), competidor: d.competidor.trim() };
  return { categoria: d.categoria.trim().toLocaleLowerCase('es'), marca: aTitulo(d.marca), competidor: aTitulo(d.competidor) };
}

/** Convierte la ficha en respuestas importadas con las correcciones aceptadas. */
export function importarFicha(ficha: FichaCruda, op: OpcionesImportacion): ResultadoImportacion {
  const filas = aplicarCorrecciones(ficha.filas, op.aceptadas);

  const pendientes = diagnosticarFicha({ ...ficha, filas }).filter((a) => a.fila !== null && MARCABLES.has(a.tipo));
  const motivosPorFila = new Map<number, TipoAnomalia[]>();
  for (const a of pendientes) {
    const motivos = motivosPorFila.get(a.fila!) ?? [];
    if (!motivos.includes(a.tipo)) motivos.push(a.tipo);
    motivosPorFila.set(a.fila!, motivos);
  }

  const respuestas: Respuesta[] = [];
  const excluidas: ResultadoImportacion['excluidas'] = [];
  const fechasPorVuelta = new Map<number, Array<string | null>>();
  const clienteClave = claveMarca(ficha.datos.marca);
  const conteo = new Map<string, { marcaId: string | null; ocurrencias: number; grafias: Map<string, number> }>();

  for (const f of filas) {
    const menciones: Mencion[] = dividirListaMarcas(f.marcasPrimero).map((nombre, i) => {
      const r = resolverMarca(nombre, op.catalogo);
      return { marcaId: r.marcaId, textoDetectado: nombre, orden: i + 1, posicion: null, recomendada: true, sentimiento: 'Neutral', fragmento: '', via: r.via };
    });
    for (const m of menciones) {
      if (m.marcaId === op.marcaClienteId || (m.marcaId === null && claveMarca(m.textoDetectado) === clienteClave)) continue;
      const clave = m.marcaId ?? `d:${claveMarca(m.textoDetectado)}`;
      const g = conteo.get(clave) ?? { marcaId: m.marcaId, ocurrencias: 0, grafias: new Map<string, number>() };
      g.ocurrencias += 1;
      g.grafias.set(m.textoDetectado, (g.grafias.get(m.textoDetectado) ?? 0) + 1);
      conteo.set(clave, g);
    }

    const vuelta = typeof f.vuelta === 'number' && Number.isInteger(f.vuelta) && f.vuelta > 0 ? f.vuelta : null;
    const pregunta = exacto<CodigoCompat>(CODIGOS_COMPAT, f.pregunta);
    const ia = exacto<IaFicha>(IAS_FICHA, f.ia);
    if (vuelta === null || pregunta === null || ia === null) {
      excluidas.push({ fila: f.fila, motivo: estadoDeFila(f) ?? 'Vuelta, pregunta o IA fuera de la lista' });
      continue;
    }

    const registroCliente: RegistroCliente = {
      nombra: exacto(NOS_NOMBRA, f.nombra),
      puesto: exacto(PUESTOS, f.puesto),
      sentimiento: exacto(SENTIMIENTOS, f.sentimiento),
      fuente: exacto(FUENTES, f.fuente),
    };
    const tipo = TIPO_DE_PREGUNTA_COMPAT[pregunta];
    respuestas.push({
      id: `fila-${f.fila}`,
      vuelta,
      preguntaCodigo: pregunta,
      tipo,
      motor: MOTOR_DE_IA[ia],
      muestra: 1,
      origen: 'importada',
      valida: registroCliente.nombra !== null,
      ...(tipo === 'comparativa' && op.competidorPrincipalId ? { competidorId: op.competidorPrincipalId } : {}),
      filaOrigen: f.fila,
      menciones,
      citas: [],
      registroCliente,
    });
    fechasPorVuelta.set(vuelta, [...(fechasPorVuelta.get(vuelta) ?? []), fechaDeCelda(f.fecha)]);
  }

  const vueltas = [...fechasPorVuelta.entries()]
    .sort(([a], [b]) => a - b)
    .map(([numero, fechas]) => {
      const fecha = fechas.filter((x): x is string => x !== null).sort()[0] ?? null;
      return { numero, fecha, semana: fecha === null ? null : semanaDelControl(fecha) };
    });

  const grupos = [...conteo.values()]
    .map((g) => {
      const masFrecuente = [...g.grafias.entries()].sort((a, b) => b[1] - a[1] || colacion.compare(a[0], b[0]))[0]![0];
      const texto = g.marcaId === null ? masFrecuente : (op.catalogo.find((c) => c.id === g.marcaId)?.nombre ?? masFrecuente);
      return { marcaId: g.marcaId, texto, ocurrencias: g.ocurrencias };
    })
    .sort((a, b) => b.ocurrencias - a.ocurrencias || colacion.compare(a.texto, b.texto));

  return {
    datos: proponerDatos(ficha.datos),
    vueltas,
    respuestas,
    filasMarcadas: [...motivosPorFila.entries()].sort(([a], [b]) => a - b).map(([fila, motivos]) => ({ fila, motivos })),
    excluidas,
    descubiertas: grupos.filter((g) => g.marcaId === null).map(({ texto, ocurrencias }) => ({ texto, ocurrencias })),
    competidoresSugeridos: grupos.slice(0, 5),
  };
}
