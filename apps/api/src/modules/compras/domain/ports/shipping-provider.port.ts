/**
 * Puerto `ShippingProvider` (ADR-006). Cotización (CU-011) y tracking (CU-013) de envíos.
 * Vive en `compras` —igual que `PaymentProvider`— porque ninguna otra capa lo consume todavía
 * y la regla de fronteras (ADR-002) prohíbe que un módulo importe el interior de otro: un
 * módulo `logistica` separado sólo tendría sentido el día que otro BC además de compras lo use.
 * Adapters: MiCorreo (ambiente test) con fallback a Tabla local, por `SHIPPING_ADAPTER`.
 */
export type ModalidadEnvio = 'home_delivery' | 'branch_pickup';
export type OrigenCotizacion = 'micorreo' | 'local_fallback';

export interface CotizarInput {
  readonly peso_gramos: number;
  readonly codigo_postal: string;
  readonly modalidad: ModalidadEnvio;
}

export interface CotizacionEnvio {
  readonly monto: number;
  readonly origen: OrigenCotizacion;
}

/** Un evento de la cronología de envío (CU-13 §4). Los tres campos tienen columna en `order_tracking_events`. */
export interface EventoTracking {
  readonly fecha: string | null; // ISO 8601
  readonly estado: string;
  readonly ubicacion: string | null;
  readonly descripcion: string;
}

/**
 * CU-13 §4: lo que devuelve el proveedor por consulta. `fechaEstimadaEntrega`, `direccionEntrega`
 * y `ultimaActualizacion` NO tienen columna en `order_tracking_events` (el CU los pide, el
 * esquema no los modela) — son datos de paso de la respuesta, no se persisten; se recalculan en
 * cada consulta real al proveedor.
 */
export interface ResultadoTracking {
  readonly estadoActual: string;
  readonly eventos: EventoTracking[];
  readonly fechaEstimadaEntrega: string | null; // ISO 8601
  readonly direccionEntrega: string | null;
  readonly ultimaActualizacion: string; // ISO 8601
}

export interface ShippingProvider {
  cotizar(input: CotizarInput): Promise<CotizacionEnvio>;
  /** CU-13. Lanza si el proveedor no responde o rechaza la consulta (A2/A3). */
  consultarTracking(numero_tracking: string): Promise<ResultadoTracking>;
}

export const SHIPPING_PROVIDER = Symbol('ShippingProvider');
