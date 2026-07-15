import type { CarritoView } from '../domain/carrito';
import type { CarritoRepository } from '../domain/ports/carrito.repository';
import { calcularCarrito } from '../domain/precio';

/** CU-010 · Quitar una línea del carrito (idempotente) y devolver el carrito recalculado. */
export class QuitarLinea {
  constructor(private readonly repo: CarritoRepository) {}

  async ejecutar(cuentaId: string, contexto: string | null, juegoId: string): Promise<CarritoView> {
    await this.repo.quitarLinea(cuentaId, contexto, juegoId);
    return calcularCarrito(await this.repo.verLineas(cuentaId, contexto), contexto);
  }
}
