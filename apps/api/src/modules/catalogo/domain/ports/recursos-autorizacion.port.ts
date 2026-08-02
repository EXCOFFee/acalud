export interface RecursosAutorizacionPort {
  /**
   * CU-09: Verifica si el usuario tiene derecho a acceder al producto.
   * Chequea si el usuario lo compró directamente (status paid, shipped, delivered)
   * o si su institución lo tiene asignado y el usuario es docente activo en esa institución.
   */
  tieneDerechoAlJuego(usuarioId: string, productoId: string): Promise<boolean>;
}

export const RECURSOS_AUTORIZACION_PORT = Symbol('RecursosAutorizacionPort');
