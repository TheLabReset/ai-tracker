import type { Mencion, Respuesta } from '../../src/dominio';

export function mencion(marcaId: string | null, posicion: number | null, o: Partial<Mencion> = {}): Mencion {
  return {
    marcaId,
    textoDetectado: marcaId ?? 'desconocida',
    orden: posicion ?? 99,
    posicion,
    recomendada: posicion !== null,
    sentimiento: 'Neutral',
    fragmento: '',
    via: 'nombre',
    ...o,
  };
}

export function respuesta(o: Partial<Respuesta>): Respuesta {
  return {
    id: 'r',
    vuelta: 1,
    preguntaCodigo: 'P1',
    tipo: 'descubrimiento',
    motor: 'chatgpt',
    muestra: 1,
    origen: 'auto',
    valida: true,
    menciones: [],
    citas: [],
    ...o,
  };
}
