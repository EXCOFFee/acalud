import type { CarritoView } from '../domain/carrito';
import { SinPermisosInstitucionales } from '../domain/errores';
import type { CarritoRepository } from '../domain/ports/carrito.repository';
import { calcularCarrito } from '../domain/precio';

/** CU-010 · Ver carrito con precios, descuentos y totales calculados server-side. */
export class VerCarrito {
  constructor(private readonly repo: CarritoRepository) {}

  async ejecutar(cuentaId: string, contexto: string | null): Promise<CarritoView> {
    // CU-24 RN-001/A1/A3: solo el encargado institucional opera el carrito de su institución.
    if (contexto !== null && !(await this.repo.esEncargadoActivo(cuentaId, contexto))) {
      throw new SinPermisosInstitucionales();
    }
    const lineas = await this.repo.verLineas(cuentaId, contexto);
    return calcularCarrito(lineas, contexto);
  }
}
