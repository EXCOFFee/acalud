import type { CarritoView } from '../domain/carrito';
import { JuegoNoDisponible } from '../domain/errores';
import type { CarritoRepository } from '../domain/ports/carrito.repository';
import { calcularCarrito } from '../domain/precio';

/**
 * CU-010 · Fijar la cantidad de una línea (upsert). El cliente manda solo (juego_id, cantidad);
 * el precio se calcula server-side. Juego inexistente/no publicado → no se agrega.
 */
export class PonerLinea {
  constructor(private readonly repo: CarritoRepository) {}

  async ejecutar(
    cuentaId: string,
    contexto: string | null,
    juegoId: string,
    cantidad: number,
  ): Promise<CarritoView> {
    if (!(await this.repo.juegoPublicado(juegoId))) throw new JuegoNoDisponible();
    await this.repo.ponerLinea(cuentaId, contexto, juegoId, cantidad);
    return calcularCarrito(await this.repo.verLineas(cuentaId, contexto), contexto);
  }
}
