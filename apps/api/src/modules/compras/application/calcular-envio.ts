import { ProveedorLogisticoNoDisponible } from '../domain/errores';
import type { EnvioRepository } from '../domain/ports/envio.repository';
import type { CotizacionEnvio, ModalidadEnvio, ShippingProvider } from '../domain/ports/shipping-provider.port';

export interface ItemEnvio {
  productoId: string;
  cantidad: number;
}

export interface OpcionEnvio {
  modalidad: ModalidadEnvio;
  nombreServicio: string;
  costo: number;
  plazoEstimadoDias: number;
  trackingDisponible: boolean;
}

// A5: si el producto no tiene `weight_grams` cargado, se usa este valor (peso promedio de un
// juego de mesa) en su lugar — el flujo continúa con normalidad, nunca bloquea la cotización.
const PESO_PREDETERMINADO_GRAMOS = 500;

// El proveedor no devuelve una lista abierta de servicios (A7): las dos modalidades son un
// dominio cerrado ya establecido por CU-12 (`ModalidadEnvio`), así que se cotiza cada una.
const MODALIDADES: ModalidadEnvio[] = ['home_delivery', 'branch_pickup'];
const NOMBRE_SERVICIO: Record<ModalidadEnvio, string> = {
  home_delivery: 'Envío a domicilio',
  branch_pickup: 'Retiro en sucursal',
};
// Plazo de entrega: dato de presentación (RNF-002), no lo devuelve el `ShippingProvider` fake.
const PLAZO_ESTIMADO_DIAS: Record<ModalidadEnvio, number> = {
  home_delivery: 5,
  branch_pickup: 2,
};

/**
 * CU-11 · Calcular costo de envío. Cotiza en tiempo real contra el `ShippingProvider` (RN-001),
 * en función del código postal y el peso total del carrito (RN-002), para las dos modalidades
 * disponibles, y las devuelve ordenadas de menor a mayor costo (A7). Sin autenticación (A8: un
 * usuario anónimo puede cotizar) y sin depender de un carrito persistido: el cliente manda los
 * ítems tal como los tiene en ese momento (server-side o `localStorage`).
 *
 * Simplificaciones documentadas: A3 (código postal sin cobertura) es inalcanzable hoy — ningún
 * adapter (MiCorreo fake ni tabla local) modela zonas sin cobertura, siempre cotizan. RN-006
 * (precargar el código postal del perfil) no se implementa: `GET /me` no expone el domicilio del
 * usuario todavía, y agregarlo excede el alcance de este caso de uso.
 */
export class CalcularEnvio {
  constructor(
    private readonly repo: EnvioRepository,
    private readonly shipping: ShippingProvider,
  ) {}

  async ejecutar(codigoPostal: string, items: ItemEnvio[]): Promise<OpcionEnvio[]> {
    const pesos = await this.repo.obtenerPesos(items.map((i) => i.productoId));
    const pesoTotalGramos = items.reduce(
      (acc, i) => acc + (pesos.get(i.productoId) ?? PESO_PREDETERMINADO_GRAMOS) * i.cantidad,
      0,
    );

    let cotizaciones: CotizacionEnvio[];
    try {
      cotizaciones = await Promise.all(
        MODALIDADES.map((modalidad) =>
          this.shipping.cotizar({ peso_gramos: pesoTotalGramos, codigo_postal: codigoPostal, modalidad }),
        ),
      );
    } catch {
      throw new ProveedorLogisticoNoDisponible(
        'El servicio de envíos no está disponible temporalmente. Intentá nuevamente más tarde.',
      );
    }

    return MODALIDADES.map((modalidad, i) => ({
      modalidad,
      nombreServicio: NOMBRE_SERVICIO[modalidad],
      costo: cotizaciones[i]!.monto,
      plazoEstimadoDias: PLAZO_ESTIMADO_DIAS[modalidad],
      trackingDisponible: cotizaciones[i]!.origen === 'micorreo',
    })).sort((a, b) => a.costo - b.costo);
  }
}
