import { z } from 'zod';
import { SENTIMIENTOS } from '../dominio';

/** Salida JSON del modelo lector, validada antes de usarla (§5.4, paso 1). */
export const LecturaSchema = z.object({
  formato: z.enum(['lista', 'prosa', 'mixta']),
  sinRespuesta: z.boolean(),
  marcas: z.array(
    z.object({
      nombre: z.string().min(1),
      orden: z.number().int().positive(),
      lugarEnLista: z.number().int().positive().nullable(),
      recomendada: z.boolean(),
      sentimiento: z.enum(SENTIMIENTOS),
      fragmento: z.string(),
    }),
  ),
});

export type Lectura = z.infer<typeof LecturaSchema>;
export type MarcaLeida = Lectura['marcas'][number];
