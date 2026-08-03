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

export function fechaHoraCorta(iso: string): string {
  return new Date(iso).toLocaleString('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** CU-13 RNF-004: color identificativo por estado de tracking. Cubre los valores del adapter
 *  fake (MiCorreo) y da un fallback razonable para cualquier otro valor futuro. */
const ESTADO_TRACKING: Record<string, { etiqueta: string; variante: 'default' | 'ok' | 'off' | 'marca' }> = {
  admitted: { etiqueta: 'Admitido', variante: 'default' },
  in_transit: { etiqueta: 'En tránsito', variante: 'marca' },
  out_for_delivery: { etiqueta: 'En reparto', variante: 'marca' },
  delivered: { etiqueta: 'Entregado', variante: 'ok' },
  exception: { etiqueta: 'Incidencia', variante: 'off' },
};

export function etiquetaEstadoTracking(estado: string): { etiqueta: string; variante: 'default' | 'ok' | 'off' | 'marca' } {
  return ESTADO_TRACKING[estado] ?? { etiqueta: estado, variante: 'default' };
}
