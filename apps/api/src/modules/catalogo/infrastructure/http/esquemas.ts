import { z } from 'zod';

/** Query del listado de catálogo (2.4): q + area opcionales; paginación con defaults acotados. */
export const listadoQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  area: z.string().trim().min(1).optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  tamanio: z.coerce.number().int().min(1).max(60).default(20),
});
export type ListadoQuery = z.infer<typeof listadoQuerySchema>;
