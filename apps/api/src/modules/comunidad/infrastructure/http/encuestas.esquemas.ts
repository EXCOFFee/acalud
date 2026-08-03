import { z } from 'zod';

/** Query de GET /polls (CU-16 A6 / CU-14 A8): filtro opcional por estado y nivel educativo. */
export const listadoEncuestasQuerySchema = z.object({
  status: z.enum(['active', 'closed']).optional(),
  level_id: z.string().uuid().optional(),
});
export type ListadoEncuestasQuery = z.infer<typeof listadoEncuestasQuerySchema>;
