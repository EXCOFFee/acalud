import { z } from 'zod';

/** Query de GET /editorial-partners (CU-17 A7). */
export const listadoEditorialesQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
});
export type ListadoEditorialesQuery = z.infer<typeof listadoEditorialesQuerySchema>;
