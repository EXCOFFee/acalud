/**
 * Política de bloqueo por fuerza bruta (CU-02 A2.6/A3.1-A3.2 y RN-007): al superar tres
 * intentos fallidos para el mismo email, el ingreso queda bloqueado quince minutos.
 *
 * El estado NO se guarda en la fila del usuario: se calcula contando los intentos fallidos
 * recientes en `login_attempts` (decisión Δ3). Además de responder al esquema, el registro es
 * auditable —informa desde qué dirección y con qué frecuencia se intentó—, en línea con
 * RNF-SIS-016.
 */
export const UMBRAL_INTENTOS_FALLIDOS = 3;
export const VENTANA_BLOQUEO_MS = 15 * 60 * 1000;

export type ResultadoIntento = 'success' | 'failed';

/** Instante desde el cual cuentan los intentos fallidos para el bloqueo. */
export function ventanaDesde(ahora: Date): Date {
  return new Date(ahora.getTime() - VENTANA_BLOQUEO_MS);
}

/** ¿La cantidad de fallos recientes alcanza el umbral que bloquea el ingreso? */
export function estaBloqueadoPorIntentos(fallosRecientes: number): boolean {
  return fallosRecientes >= UMBRAL_INTENTOS_FALLIDOS;
}
