import { z } from 'zod';

/** Cuerpo del upsert de línea: el cliente manda SOLO la cantidad, jamás precios (CU-010). */
export const cantidadSchema = z.object({
  cantidad: z.number().int().min(1).max(99),
});
export type CantidadInput = z.infer<typeof cantidadSchema>;

/** `contexto` = institucion_id (compra institucional) o ausente = personal. */
export const contextoQuerySchema = z.object({
  contexto: z.string().uuid().optional(),
});
export type ContextoQuery = z.infer<typeof contextoQuerySchema>;
