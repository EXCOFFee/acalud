/** Política de contraseña (PA-01): 12–128 caracteres, sin reglas de composición. */
export const LONGITUD_MIN_CONTRASENA = 12;
export const LONGITUD_MAX_CONTRASENA = 128;

export function longitudContrasenaValida(contrasena: string): boolean {
  return (
    contrasena.length >= LONGITUD_MIN_CONTRASENA && contrasena.length <= LONGITUD_MAX_CONTRASENA
  );
}
