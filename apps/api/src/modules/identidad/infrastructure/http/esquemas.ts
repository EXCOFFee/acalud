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

export const verificacionSchema = z.object({
  token: z.string().min(1),
});
export type VerificacionInput = z.infer<typeof verificacionSchema>;

export const recuperacionSchema = z.object({
  email: z.string().email(),
});
export type RecuperacionInput = z.infer<typeof recuperacionSchema>;

// El campo se llama `contrasena_nueva` por contrato (2.4 openapi). La fortaleza real (filtrada)
// se valida en el caso de uso; acá solo la longitud PA-01.
export const restablecerSchema = z.object({
  token: z.string().min(1),
  contrasena_nueva: z.string().min(LONGITUD_MIN_CONTRASENA).max(LONGITUD_MAX_CONTRASENA),
});
export type RestablecerInput = z.infer<typeof restablecerSchema>;
