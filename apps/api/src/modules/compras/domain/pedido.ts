/**
 * Estados de la orden (CU-12, CU-13). Seis valores: un pago rechazado NO crea un estado propio
 * —deja el pedido en `pending`, reintentable— y `cancelled` queda para la cancelación explícita.
 */
export type EstadoPedido =
  | 'pending'
  | 'paid'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'under_review';

export type ModalidadEnvio = 'home_delivery' | 'branch_pickup';

export interface Domicilio {
  calle: string;
  numero: string;
  codigo_postal: string;
  provincia: string;
  localidad: string;
}

/** Línea del pedido ya congelada (snapshot inmutable, CU-012). */
export interface LineaPedido {
  juego_id: string;
  nombre_snapshot: string;
  cantidad: number;
  precio_unitario_snapshot: number;
  descuento_pct_snapshot: number;
}

/** CU-24 RN-007: facturación a nombre de la institución, no del encargado individual. */
export interface DatosFacturacion {
  razon_social: string;
  cuit: string;
}

/** Datos para crear el pedido pendiente_pago con su snapshot (server-side). */
export interface NuevoPedido {
  cuenta_id: string;
  /** CU-24: institution_id si es una compra institucional (order_type='b2b'); null = personal. */
  institution_id: string | null;
  carrito_id: string;
  domicilio_snapshot: Domicilio;
  envio_modalidad: ModalidadEnvio;
  envio_costo: number;
  monto_total: number;
  lineas: LineaPedido[];
  /** CU-24 RN-007: null en compras personales (order_type='b2c'). */
  billing_data: DatosFacturacion | null;
}

/** Pedido cargado con lo necesario para procesar el pago (CU-012 paso 5). */
export interface PedidoParaPago {
  id: string;
  numero: string;
  estado: EstadoPedido;
  monto_total: number;
  carrito_id: string | null;
  email: string;
  /** CU-24: institution_id si es una compra institucional (order_type='b2b'); null = personal. */
  institution_id: string | null;
  lineas: { juego_id: string; cantidad: number }[];
}

/** Resultado de procesar una notificación de pago. Cruza la API en la respuesta del webhook. */
export type ResultadoPago =
  | 'paid'
  | 'rejected'
  | 'under_review'
  | 'already_processed'
  | 'order_not_found';
