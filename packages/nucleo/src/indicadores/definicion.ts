import { z } from 'zod';
import { MEDIDAS } from '../metricas/medidas';

const MedidaSchema = z.enum(MEDIDAS);

/**
 * Un indicador es una definición de cuatro piezas (preguntas × motores × medida × periodo) que se
 * aplica igual a todas las marcas (§5.5.1). Cambiar una definición es publicar una versión nueva.
 */
export const DefinicionIndicadorSchema = z.object({
  id: z.string().min(1),
  version: z.number().int().positive(),
  nombre: z.string().min(1),
  alcance: z.discriminatedUnion('tipo', [
    z.object({ tipo: z.literal('programa') }),
    z.object({ tipo: z.literal('sector'), sectorId: z.string().min(1) }),
  ]),
  preguntas: z
    .object({
      codigos: z.array(z.string().min(1)).optional(),
      tipos: z.array(z.enum(['descubrimiento', 'comparativa', 'marca'])).optional(),
    })
    .refine((p) => (p.codigos?.length ?? 0) + (p.tipos?.length ?? 0) > 0, { message: 'Elige al menos una pregunta o un tipo' }),
  motores: z.union([z.literal('todos'), z.array(z.object({ codigo: z.string().min(1), peso: z.number().positive() })).min(1)]),
  medidas: z.tuple([MedidaSchema], MedidaSchema),
  periodo: z.discriminatedUnion('tipo', [
    z.object({ tipo: z.literal('vuelta') }),
    z.object({ tipo: z.literal('ultimas'), n: z.number().int().min(2).max(12) }),
  ]),
  desglosePorMotor: z.boolean(),
});

export type DefinicionIndicador = z.infer<typeof DefinicionIndicadorSchema>;

/** Las preguntas que nombran a la marca (P2, P5) solo sirven para medir a la marca cliente. */
export function soloCliente(def: DefinicionIndicador): boolean {
  const codigos = def.preguntas.codigos ?? [];
  const tipos = def.preguntas.tipos ?? [];
  return codigos.some((c) => c === 'P2' || c === 'P5') || tipos.some((t) => t === 'comparativa' || t === 'marca');
}
