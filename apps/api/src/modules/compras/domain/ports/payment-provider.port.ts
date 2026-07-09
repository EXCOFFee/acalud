/**
 * Puerto `PaymentProvider` (ADR-006). El dominio de Compras habla con la pasarela de pago a
 * través de esta interfaz, nunca del SDK del proveedor. Adapter fijo: Mercado Pago (sandbox);
 * sin fallback por diseño (Visión §9). El dominio importa el puerto, jamás el adapter.
 */
export interface CrearPreferenciaInput {
  readonly pedido_id: string;
  readonly monto_total: number;
  readonly descripcion: string;
}

export interface PreferenciaDePago {
  readonly preferencia_id: string;
  readonly init_point: string;
}

export type EstadoPagoExterno = 'approved' | 'rejected' | 'pending';

export interface PagoExterno {
  readonly payment_id: string;
  readonly estado: EstadoPagoExterno;
  readonly monto: number;
}

export interface PaymentProvider {
  /** Crea la preferencia de pago referenciando el pedido (external_reference = pedido_id). */
  crearPreferencia(input: CrearPreferenciaInput): Promise<PreferenciaDePago>;
  /** Reconciliación server-to-server (3.2): estado autoritativo del pago por payment_id. */
  consultarPago(payment_id: string): Promise<PagoExterno>;
}

/** Token de inyección de dependencias (NestJS) del puerto. */
export const PAYMENT_PROVIDER = Symbol('PaymentProvider');
