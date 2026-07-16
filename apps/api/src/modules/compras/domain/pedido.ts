export type EstadoPedido =
  | 'pendiente_pago'
  | 'pagado'
  | 'rechazado'
  | 'expirado'
  | 'en_preparacion'
  | 'despachado'
  | 'entregado'
  | 'cancelado'
  | 'en_revision';

export type ModalidadEnvio = 'domicilio' | 'sucursal';

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

/** Datos para crear el pedido pendiente_pago con su snapshot (server-side). */
export interface NuevoPedido {
  cuenta_id: string;
  carrito_id: string;
  domicilio_snapshot: Domicilio;
  envio_modalidad: ModalidadEnvio;
  envio_costo: number;
  monto_total: number;
  lineas: LineaPedido[];
}

/** Pedido cargado con lo necesario para procesar el pago (CU-012 paso 5). */
export interface PedidoParaPago {
  id: string;
  numero: string;
  estado: EstadoPedido;
  monto_total: number;
  carrito_id: string | null;
  email: string;
  lineas: { juego_id: string; cantidad: number }[];
}

export type ResultadoPago =
  | 'pagado'
  | 'rechazado'
  | 'en_revision'
  | 'ya_procesado'
  | 'sin_pedido';
