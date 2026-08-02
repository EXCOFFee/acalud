import { z } from 'zod';

/** Cuerpo de POST/PUT /admin/categories[/:id] (CU-19 A7.4: solo pide el nombre). */
export const categoriaAdminSchema = z.object({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(100),
});

export type CategoriaAdminBody = z.infer<typeof categoriaAdminSchema>;
