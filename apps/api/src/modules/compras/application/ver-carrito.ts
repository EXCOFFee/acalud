import type { CarritoView } from '../domain/carrito';
import type { CarritoRepository } from '../domain/ports/carrito.repository';
import { calcularCarrito } from '../domain/precio';

/** CU-010 · Ver carrito con precios, descuentos y totales calculados server-side. */
export class VerCarrito {
  constructor(private readonly repo: CarritoRepository) {}

  async ejecutar(cuentaId: string, contexto: string | null): Promise<CarritoView> {
    const lineas = await this.repo.verLineas(cuentaId, contexto);
    return calcularCarrito(lineas, contexto);
  }
}
