import type { EstadoPedido } from './api';

/** CU-05 RN-003: color identificativo por estado. `marca` (verde pino) para "enviado" — la
 *  paleta no define un azul propio, y reusar el color de marca para "en tránsito" es coherente
 *  con el resto del sistema de diseño en vez de introducir un tono nuevo. */
export const ESTADO_PEDIDO: Record<EstadoPedido, { etiqueta: string; variante: 'default' | 'ok' | 'off' | 'marca' }> = {
  pending: { etiqueta: 'Pendiente de pago', variante: 'default' },
  under_review: { etiqueta: 'En revisión', variante: 'default' },
  paid: { etiqueta: 'Pagado', variante: 'ok' },
  shipped: { etiqueta: 'Enviado', variante: 'marca' },
  delivered: { etiqueta: 'Entregado', variante: 'ok' },
  cancelled: { etiqueta: 'Cancelado', variante: 'off' },
};

/** CU-05 RN-004: el tracking solo se muestra si el pedido ya salió. */
export function tieneTrackingVisible(estado: EstadoPedido): boolean {
  return estado === 'shipped' || estado === 'delivered';
}

export function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}
