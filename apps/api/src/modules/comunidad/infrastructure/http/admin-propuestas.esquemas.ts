import { z } from 'zod';

/** Query de GET /admin/proposals (CU-21 A7 estado, A8 orden, A9 búsqueda). */
export const listadoPropuestasAdminQuerySchema = z.object({
  status: z.enum(['pending', 'reviewed', 'approved', 'rejected']).optional(),
  search: z.string().trim().min(1).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});
export type ListadoPropuestasAdminQuery = z.infer<typeof listadoPropuestasAdminQuerySchema>;

/** Cuerpo de PUT /admin/proposals/:id (CU-21 p17-p19). */
export const actualizarPropuestaSchema = z.object({
  estado: z.enum(['pending', 'reviewed', 'approved', 'rejected']),
  feedback: z.string().trim().max(2000).nullish(),
});
export type ActualizarPropuestaBody = z.infer<typeof actualizarPropuestaSchema>;
