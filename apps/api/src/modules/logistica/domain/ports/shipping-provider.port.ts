/**
 * Puerto `ShippingProvider` (ADR-006). Cotización y tracking de envíos. Adapters:
 * MiCorreo (ambiente test) con fallback a Tabla local, seleccionables por `SHIPPING_ADAPTER`.
 */
export type ModalidadEnvio = 'domicilio' | 'sucursal';
export type OrigenCotizacion = 'micorreo' | 'tabla_local';

export interface CotizarInput {
  readonly peso_gramos: number;
  readonly codigo_postal: string;
  readonly modalidad: ModalidadEnvio;
}

export interface CotizacionEnvio {
  readonly monto: number;
  readonly origen: OrigenCotizacion;
}

export interface EventoTracking {
  readonly fecha: string; // ISO 8601
  readonly descripcion: string;
}

export interface ShippingProvider {
  cotizar(input: CotizarInput): Promise<CotizacionEnvio>;
  consultarTracking(numero_tracking: string): Promise<EventoTracking[]>;
}

export const SHIPPING_PROVIDER = Symbol('ShippingProvider');
