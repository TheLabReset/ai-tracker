import { CODIGOS_COMPAT, FUENTES, IAS_FICHA, NOS_NOMBRA, PUESTOS, SENTIMIENTOS, type ValorCelda } from './dominio';
import { claveMarca } from './texto';

export type ColumnaLista = 'pregunta' | 'ia' | 'nombra' | 'puesto' | 'sentimiento' | 'fuente';

const LISTAS: Record<ColumnaLista, readonly string[]> = {
  pregunta: CODIGOS_COMPAT,
  ia: IAS_FICHA,
  nombra: NOS_NOMBRA,
  puesto: PUESTOS,
  sentimiento: SENTIMIENTOS,
  fuente: FUENTES,
};

const SINONIMOS_FUENTE: Record<string, string> = {
  nocita: 'No cita fuentes',
  sinfuente: 'No cita fuentes',
  sinfuentes: 'No cita fuentes',
};

const PUESTO_NUMERICO = /^\s*([123])\s*(º|°|o|ro|do|er|\.)?\s*$/i;

/** Lleva un valor de la ficha a su forma canónica. */
export function canonizar(columna: ColumnaLista, valor: ValorCelda): { valor: string | null; exacto: boolean } {
  if (valor === null || valor === '') return { valor: null, exacto: true };
  const lista = LISTAS[columna];
  if (typeof valor === 'string' && lista.includes(valor)) return { valor, exacto: true };

  if (columna === 'puesto') {
    if (typeof valor === 'number' && [1, 2, 3].includes(valor)) return { valor: `${valor}º`, exacto: false };
    const m = typeof valor === 'string' ? PUESTO_NUMERICO.exec(valor) : null;
    if (m) return { valor: `${m[1]}º`, exacto: false };
  }
  if (typeof valor !== 'string' && typeof valor !== 'number') return { valor: null, exacto: false };

  const clave = claveMarca(String(valor));
  if (clave === '') return { valor: null, exacto: false };
  const igual = lista.find((opcion) => claveMarca(opcion) === clave);
  if (igual) return { valor: igual, exacto: false };
  if (columna === 'fuente' && SINONIMOS_FUENTE[clave]) return { valor: SINONIMOS_FUENTE[clave], exacto: false };
  return { valor: null, exacto: false };
}
