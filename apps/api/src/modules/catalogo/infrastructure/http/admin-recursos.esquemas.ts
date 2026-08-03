import { z } from 'zod';

/** Cuerpo de POST/PUT /admin/resources[/:id] (CU-19 A9.4). */
export const recursoAdminSchema = z.object({
  titulo: z.string().trim().min(1, 'El título es obligatorio').max(200),
  tipo: z.enum(['pdf', 'link']), // RN-009
  url: z.string().trim().min(1, 'La URL es obligatoria'),
  licenciado: z.boolean(),
  producto_id: z.string().uuid().nullish(), // A9.4 / D-19: opcional
});

export type RecursoAdminBody = z.infer<typeof recursoAdminSchema>;
