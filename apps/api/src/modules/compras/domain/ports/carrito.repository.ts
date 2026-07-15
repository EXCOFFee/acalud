import type { LineaConJuego } from '../carrito';

/** Puerto de persistencia del carrito (BC Compras). El carrito es por (cuenta, contexto). */
export interface CarritoRepository {
  /** Líneas del carrito de (cuenta, contexto) con los datos de juego para el cálculo. */
  verLineas(cuentaId: string, contexto: string | null): Promise<LineaConJuego[]>;
  /** Upsert de la cantidad de una línea (crea el carrito si no existía). */
  ponerLinea(
    cuentaId: string,
    contexto: string | null,
    juegoId: string,
    cantidad: number,
  ): Promise<void>;
  /** Quita una línea del carrito (idempotente). */
  quitarLinea(cuentaId: string, contexto: string | null, juegoId: string): Promise<void>;
  /** ¿El juego existe y está publicado? (no se agregan juegos no publicados). */
  juegoPublicado(juegoId: string): Promise<boolean>;
}

export const CARRITO_REPOSITORY = Symbol('CarritoRepository');
