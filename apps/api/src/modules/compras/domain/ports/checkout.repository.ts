import type { LineaConJuego } from '../carrito';
import type { EstadoPedido, NuevoPedido, PedidoParaPago } from '../pedido';

export interface PedidoRepositorio {
  /** Crea el pedido pendiente_pago + líneas snapshot. Lanza si ya hay uno pendiente por carrito. */
  crear(datos: NuevoPedido): Promise<{ id: string; numero: string }>;
  buscarParaPago(pedidoId: string): Promise<PedidoParaPago | null>;
  /** Transición con guard `WHERE estado = origen`; false si no aplicó (0 filas). */
  transicionar(pedidoId: string, origen: EstadoPedido, destino: EstadoPedido): Promise<boolean>;
}

export interface StockRepositorio {
  /** Decremento condicional atómico (`WHERE stock >= n`); false si no alcanza (Lost Update). */
  decrementar(juegoId: string, cantidad: number): Promise<boolean>;
  /** Asienta el movimiento de kardex (append-only) de una venta. */
  movimientoVenta(juegoId: string, cantidad: number, referencia: string): Promise<void>;
}

export interface PagoRepositorio {
  /** Registra el pago; false si el `payment_id` ya existía (idempotencia del webhook, UNIQUE). */
  registrar(datos: {
    paymentId: string;
    pedidoId: string;
    estadoMp: string;
    monto: number;
    payload: Record<string, unknown>;
  }): Promise<boolean>;
}

export interface CarritoCheckout {
  /** Carrito de (cuenta, contexto) con sus líneas + datos de juego para el snapshot. */
  leer(
    cuentaId: string,
    contexto: string | null,
  ): Promise<{ carritoId: string; lineas: LineaConJuego[] }>;
  vaciar(carritoId: string): Promise<void>;
}

export interface OutboxCheckout {
  encolar(email: {
    tipo: string;
    destinatario: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
}

export interface AuditoriaCheckout {
  registrar(evento: {
    tipo: string;
    sujetoId: string;
    datos?: Record<string, unknown>;
  }): Promise<void>;
}

/** Repos ligados a una transacción (UoW de Compras, ADR-002). */
export interface ReposCheckout {
  pedidos: PedidoRepositorio;
  stock: StockRepositorio;
  pagos: PagoRepositorio;
  carrito: CarritoCheckout;
  outbox: OutboxCheckout;
  auditoria: AuditoriaCheckout;
}

export interface UnidadDeTrabajoCompras {
  transaccion<T>(fn: (repos: ReposCheckout) => Promise<T>): Promise<T>;
}

export const UNIDAD_DE_TRABAJO_COMPRAS = Symbol('UnidadDeTrabajoCompras');
