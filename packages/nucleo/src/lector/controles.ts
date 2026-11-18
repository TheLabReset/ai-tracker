import type { MarcaCatalogo, Mencion } from '../dominio';
import { contieneTermino } from '../texto';

export type MotivoDuda = 'alias_no_extraido' | 'marca_no_en_texto' | 'alias_ambiguo' | 'salto_de_posicion';

export interface Duda {
  motivo: MotivoDuda;
  marcaId: string | null;
  detalle: string;
}

/** Controles de confianza deterministas; cada duda manda la respuesta a revisión. */
export function controlarLectura(p: {
  respuesta: string;
  menciones: Mencion[];
  catalogo: MarcaCatalogo[];
  anterior?: Map<string, number | null>;
  umbralSalto?: number;
}): Duda[] {
  const dudas: Duda[] = [];
  const extraidas = new Set(p.menciones.map((m) => m.marcaId).filter((id): id is string => id !== null));

  for (const marca of p.catalogo) {
    if (extraidas.has(marca.id)) continue;
    const terminos = [
      ...(marca.ambiguo ? [] : [marca.nombre]),
      ...marca.alias.filter((a) => !a.ambiguo).map((a) => a.texto),
    ];
    const encontrado = terminos.find((t) => contieneTermino(p.respuesta, t));
    if (encontrado) {
      dudas.push({ motivo: 'alias_no_extraido', marcaId: marca.id, detalle: `"${encontrado}" aparece en el texto y no se extrajo` });
    }
  }

  for (const m of p.menciones) {
    if (!contieneTermino(p.respuesta, m.textoDetectado)) {
      dudas.push({ motivo: 'marca_no_en_texto', marcaId: m.marcaId, detalle: `"${m.textoDetectado}" no aparece en el texto` });
    }
  }

  for (const m of p.menciones) {
    if (m.via === 'alias_ambiguo') {
      dudas.push({ motivo: 'alias_ambiguo', marcaId: m.marcaId, detalle: `"${m.textoDetectado}" es una palabra común` });
    }
  }

  if (p.anterior) {
    const umbral = p.umbralSalto ?? 3;
    for (const m of p.menciones) {
      if (m.marcaId === null || m.posicion === null) continue;
      const previa = p.anterior.get(m.marcaId);
      if (typeof previa === 'number' && Math.abs(m.posicion - previa) >= umbral) {
        dudas.push({ motivo: 'salto_de_posicion', marcaId: m.marcaId, detalle: `pasó del ${previa}.º al ${m.posicion}.º lugar` });
      }
    }
  }
  return dudas;
}
