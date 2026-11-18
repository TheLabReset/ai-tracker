export interface EntradaLector {
  criterio: { version: string; texto: string };
  pregunta: string;
  respuesta: string;
  catalogo: Array<{ nombre: string; alias: string[] }>;
}

/** Instrucciones fijas de formato. No nombran a ninguna marca en particular (§5.2.1, "Lector separado y ciego"). */
export const INSTRUCCIONES_FORMATO = `Formato de salida. Responde solo con un objeto JSON, sin texto adicional, con estos campos:
- "formato": "lista", "prosa" o "mixta", según cómo está escrita la respuesta analizada.
- "sinRespuesta": true si la IA se negó a responder o dijo que no sabe; si no, false.
- "marcas": todas las marcas mencionadas en la respuesta, sin excepción y tratándolas a todas por igual. Por cada una:
  - "nombre": el nombre tal como aparece en el texto.
  - "orden": 1 para la primera marca que aparece, 2 para la siguiente, y así.
  - "lugarEnLista": el número que tiene en una lista numerada, o null si no está en una.
  - "recomendada": true si la respuesta la recomienda; false si solo la menciona.
  - "sentimiento": "Bien", "Neutral" o "Mal", según cómo habla de ella.
  - "fragmento": la frase de la respuesta donde aparece, copiada tal cual.
Las marcas conocidas solo ayudan a reconocer nombres y alias: incluye también las marcas que no estén en esa lista.`;

const colacion = new Intl.Collator('es');

/** Mensajes para el lector, con el catálogo en orden alfabético. */
export function construirMensajesLector(e: EntradaLector): { sistema: string; usuario: string } {
  const marcas_conocidas = e.catalogo
    .map((m) => ({ nombre: m.nombre, alias: [...m.alias].sort(colacion.compare) }))
    .sort((a, b) => colacion.compare(a.nombre, b.nombre));
  return {
    sistema: `${e.criterio.texto}\n\n${INSTRUCCIONES_FORMATO}`,
    usuario: JSON.stringify({ pregunta: e.pregunta, respuesta: e.respuesta, marcas_conocidas }),
  };
}
