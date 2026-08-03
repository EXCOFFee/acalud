import { z } from 'zod';

/** Cuerpo de POST/PUT /admin/polls[/:id] (CU-20 p6-p14: 2 a 10 opciones, sin vacías ni duplicadas). */
export const encuestaAdminSchema = z.object({
  pregunta: z.string().trim().min(1, 'La pregunta de la encuesta es obligatoria'), // A4
  nivel_educativo_id: z.string().uuid().nullish(),
  opciones: z
    .array(z.string().trim().min(1, 'Todas las opciones deben tener texto')) // A6
    .min(2, 'Debés agregar al menos 2 opciones de respuesta') // A5
    .max(10)
    .refine((opts) => new Set(opts.map((o) => o.toLowerCase())).size === opts.length, {
      message: 'Todas las opciones deben tener texto y no pueden duplicarse', // A6
    }),
});

export type EncuestaAdminBody = z.infer<typeof encuestaAdminSchema>;
