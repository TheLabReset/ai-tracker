import type { MarcaCatalogo, Respuesta } from '../dominio';
import { medir, type Medida } from '../metricas/medidas';
import { soloCliente, type DefinicionIndicador } from './definicion';

export interface ValorIndicador {
  indicadorId: string;
  version: number;
  marcaId: string;
  vuelta: number;
  /** null = todos los motores juntos. */
  motor: string | null;
  medida: Medida;
  valor: number | null;
  exitos: number;
  respuestas: number;
}

export type ResultadoIndicador = { aplica: true; valores: ValorIndicador[] } | { aplica: false; motivo: 'solo_cliente' };

/**
 * Calcula un indicador para una marca, vuelta por vuelta, con la misma definición para cualquier
 * marca del sector (§5.5.1). Para marcas que no son cliente solo usa respuestas automáticas.
 */
export function calcularIndicador(
  def: DefinicionIndicador,
  respuestas: Respuesta[],
  marca: { id: string; esCliente: boolean },
  catalogo: MarcaCatalogo[],
): ResultadoIndicador {
  if (soloCliente(def) && !marca.esCliente) return { aplica: false, motivo: 'solo_cliente' };

  const pesosMotor = def.motores === 'todos' ? undefined : Object.fromEntries(def.motores.map((m) => [m.codigo, m.peso]));
  const entra = (r: Respuesta) =>
    (def.preguntas.codigos?.includes(r.preguntaCodigo) ?? false) || (def.preguntas.tipos?.includes(r.tipo) ?? false);
  const filtradas = respuestas.filter(
    (r) => entra(r) && (pesosMotor === undefined || r.motor in pesosMotor) && (marca.esCliente || r.origen === 'auto'),
  );

  const vueltas = [...new Set(filtradas.map((r) => r.vuelta))].sort((a, b) => a - b);
  const valores: ValorIndicador[] = [];
  vueltas.forEach((vuelta, i) => {
    const ventana = new Set(def.periodo.tipo === 'vuelta' ? [vuelta] : vueltas.slice(Math.max(0, i - def.periodo.n + 1), i + 1));
    const enVentana = filtradas.filter((r) => ventana.has(r.vuelta));
    const motores = def.desglosePorMotor ? [...new Set(enVentana.map((r) => r.motor))].sort() : [];
    for (const motor of [null, ...motores]) {
      const sub = motor === null ? enVentana : enVentana.filter((r) => r.motor === motor);
      for (const medida of def.medidas) {
        const res = medir(medida, sub, marca.id, { esCliente: marca.esCliente, catalogo, pesosMotor });
        valores.push({ indicadorId: def.id, version: def.version, marcaId: marca.id, vuelta, motor, medida, ...res });
      }
    }
  });
  return { aplica: true, valores };
}
