import { StockInsuficiente } from '../domain/errores';
import type { ResultadoPago } from '../domain/pedido';
import type { UnidadDeTrabajoCompras } from '../domain/ports/checkout.repository';
import type { PaymentProvider } from '../domain/ports/payment-provider.port';
import { redondear2 } from '../domain/precio';

/**
 * CU-012 (pasos 4-6) · Procesar el pago (webhook). El corazón transaccional del sistema.
 * Invariantes (3.2 L3):
 *  - Idempotencia por `payment_id` (UNIQUE): webhook duplicado = no-op (E1).
 *  - Transición con guard `WHERE status = pending`: claim del pedido antes de tocar stock.
 *  - Decremento de stock condicional atómico por línea; si alguna falla → rollback TOTAL → E2.
 *  - Todo (pago + transición + stock + carrito + outbox) en UNA transacción: commit/rollback total.
 *  - Conflicto de stock (E2): rollback + compensación `under_review` + alerta Admin (sin descuento parcial).
 *  - Monto contra snapshot: si no coincide → `under_review` (nunca aprobar en silencio).
 */
export class ProcesarPago {
  constructor(
    private readonly uow: UnidadDeTrabajoCompras,
    private readonly pagos: PaymentProvider,
  ) {}

  async ejecutar(paymentId: string): Promise<ResultadoPago> {
    // Reconciliación server-to-server: la fuente autoritativa del estado/monto es el proveedor.
    const pago = await this.pagos.consultarPago(paymentId);
    const pedidoId = pago.referencia_externa;

    try {
      return await this.uow.transaccion(async (repos) => {
        // Idempotencia del webhook (UNIQUE payment_id): si ya se procesó, no-op.
        const nuevo = await repos.pagos.registrar({
          paymentId,
          pedidoId,
          estadoMp: pago.estado,
          monto: pago.monto,
          payload: { payment_id: paymentId, estado: pago.estado, monto: pago.monto },
        });
        if (!nuevo) return 'already_processed';

        const pedido = await repos.pedidos.buscarParaPago(pedidoId);
        if (pedido === null) return 'order_not_found';

        // Rechazado: el pedido QUEDA en `pending`, reintentable (CU-12: un rechazo no mata la
        // orden). Stock intacto y el carrito NO se vacía, para que el docente pueda reintentar.
        if (pago.estado === 'rejected') {
          await repos.auditoria.registrar({ tipo: 'PagoRechazado', sujetoId: pedido.id });
          return 'rejected';
        }

        // Monto/estado que no coincide con el snapshot → en_revision (nunca aprobar en silencio).
        if (pago.estado !== 'approved' || redondear2(pago.monto) !== redondear2(pedido.monto_total)) {
          await repos.pedidos.transicionar(pedido.id, 'pending', 'under_review');
          await repos.auditoria.registrar({
            tipo: 'PagoEnRevision',
            sujetoId: pedido.id,
            datos: { motivo: 'monto', monto_notificado: pago.monto },
          });
          return 'under_review';
        }

        // Aprobado. 1) Claim del pedido con guard; si ya no está en `pending` → no tocar stock.
        const transicionado = await repos.pedidos.transicionar(pedido.id, 'pending', 'paid');
        if (!transicionado) return 'already_processed';

        // 2) Decremento condicional por línea; si alguna falla → throw → rollback TOTAL (E2).
        for (const l of pedido.lineas) {
          const ok = await repos.stock.decrementar(l.juego_id, l.cantidad);
          if (!ok) throw new StockInsuficiente();
          await repos.stock.movimientoVenta(l.juego_id, l.cantidad, pedido.id);
        }

        // 3) Vaciar carrito + email de confirmación + auditoría (todo en la misma tx).
        // El comprobante-PDF real (ReceiptProvider, BC Comprobantes) llega en la Etapa 3.
        if (pedido.carrito_id !== null) await repos.carrito.vaciar(pedido.carrito_id);
        await repos.outbox.encolar({
          tipo: 'confirmacion_compra',
          destinatario: pedido.email,
          payload: { numero: pedido.numero, total: pedido.monto_total },
        });
        await repos.auditoria.registrar({ tipo: 'PagoAprobado', sujetoId: pedido.id });
        await repos.auditoria.registrar({ tipo: 'StockDescontado', sujetoId: pedido.id });
        return 'paid';
      });
    } catch (error) {
      if (error instanceof StockInsuficiente) {
        // E2 · compensación: el pago se registra y el pedido va a en_revision (alerta Admin).
        // La tx anterior hizo rollback TOTAL: no quedó stock descontado ni parcial.
        await this.uow.transaccion(async (repos) => {
          await repos.pagos.registrar({
            paymentId,
            pedidoId,
            estadoMp: pago.estado,
            monto: pago.monto,
            payload: { payment_id: paymentId, conflicto_stock: true },
          });
          await repos.pedidos.transicionar(pedidoId, 'pending', 'under_review');
          await repos.auditoria.registrar({
            tipo: 'PedidoEnRevision',
            sujetoId: pedidoId,
            datos: { motivo: 'stock', alerta_admin: true },
          });
        });
        return 'under_review';
      }
      throw error;
    }
  }
}
