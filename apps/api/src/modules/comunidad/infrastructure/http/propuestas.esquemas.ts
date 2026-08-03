import { z } from 'zod';

/** Cuerpo de POST /proposals (CU-15 p4-p10). */
export const crearPropuestaSchema = z.object({
  titulo: z.string().trim().min(1, 'Completa todos los campos obligatorios (Título y Descripción)'), // A1
  descripcion: z
    .string()
    .trim()
    .min(50, 'La descripción debe tener al menos 50 caracteres para asegurar calidad. Detallá mejor tu propuesta'), // A2/RN-002
  materia_id: z.string().uuid().nullish(),
  nivel_educativo_id: z.string().uuid().nullish(),
});
export type CrearPropuestaBody = z.infer<typeof crearPropuestaSchema>;
