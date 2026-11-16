import { z } from 'zod';

/**
 * Esquema para registrar una sesión pedagógica (CU-29).
 * Incluye validaciones alineadas con RN-002 a RN-005.
 */
export const cargarSesionSchema = z.object({
  producto_id: z.string().uuid(),
  // RN-002: La fecha de uso no puede ser futura. Se evalúa dinámicamente con refine para evitar que new Date() se fije al cargar el módulo.
  fecha_uso: z.coerce.date().refine((val) => val <= new Date(), { message: 'La fecha de uso no puede ser futura' }),
  grupo: z.string().min(1),
  // RN-003: Cantidad de estudiantes y duración mayores a 0
  cantidad_estudiantes: z.number().int().min(1, 'Debe haber al menos 1 estudiante'),
  duracion_minutos: z.number().int().min(1, 'La duración debe ser mayor a 0 minutos'),
  // RN-005: Satisfacción del docente (1 a 5)
  satisfaccion_docente: z.number().int().min(1).max(5),
  // RN-004: Aprendizajes clave de al menos 20 caracteres
  aprendizajes_clave: z.string().min(20, 'El resumen de aprendizajes debe tener al menos 20 caracteres'),
  dificultades: z.string().nullable().optional(),
  reutilizaria: z.boolean()
});

export type CargarSesionBody = z.infer<typeof cargarSesionSchema>;

/**
 * Query de GET /docentes/me/sesiones-juego (CU-30). Mismo criterio que el resto de los listados
 * (ej. FiltroHistorialSchema de compras): enteros validados, `limite` con tope (sin él se podía
 * pedir cualquier cantidad de filas de una vez) y `producto_id` uuid (antes llegaba crudo a
 * PostgreSQL y un valor inválido terminaba en 500).
 */
export const listadoSesionesQuerySchema = z.object({
  producto_id: z.string().uuid().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListadoSesionesQuery = z.infer<typeof listadoSesionesQuerySchema>;
