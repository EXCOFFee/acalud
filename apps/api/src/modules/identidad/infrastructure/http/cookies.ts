export const COOKIE_SESION = 'acalud_sesion';

/** Lee una cookie del header `Cookie` sin dependencias externas. */
export function leerCookie(header: string | undefined, nombre: string): string | null {
  if (!header) return null;
  for (const parte of header.split(';')) {
    const igual = parte.indexOf('=');
    if (igual === -1) continue;
    const clave = parte.slice(0, igual).trim();
    if (clave === nombre) return decodeURIComponent(parte.slice(igual + 1).trim());
  }
  return null;
}
