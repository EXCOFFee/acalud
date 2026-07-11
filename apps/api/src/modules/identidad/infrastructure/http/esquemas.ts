import { z } from 'zod';
import { LONGITUD_MAX_CONTRASENA, LONGITUD_MIN_CONTRASENA } from '../../domain/contrasena';

export const registroSchema = z.object({
  email: z.string().email(),
  contrasena: z.string().min(LONGITUD_MIN_CONTRASENA).max(LONGITUD_MAX_CONTRASENA),
  nombre: z.string().min(1),
  apellido: z.string().min(1),
});
export type RegistroInput = z.infer<typeof registroSchema>;

// El login valida presencia (la fortaleza se exige al registrar). Coherente con H-12/2.4.
export const loginSchema = z.object({
  email: z.string().email(),
  contrasena: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;
