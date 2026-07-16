import { StockInsuficiente } from '../domain/errores';
import type { ResultadoPago } from '../domain/pedido';
import type { UnidadDeTrabajoCompras } from '../domain/ports/checkout.repository';
import type { PaymentProvider } from '../domain/ports/payment-provider.port';
import { redondear2 } from '../domain/precio';

/**
 * CU-012 (pasos 4-6) · Procesar el pago (webhook). El corazón transaccional del sistema.
 * Invariantes (3.2 L3):
 *  - Idempotencia por `payment_id` (UNIQUE): webhook duplicado = no-op (E1).
 *  - Transición con guard `WHERE estado = pendiente_pago`: claim del pedido antes de tocar stock.
 *  - Decremento de stock condicional atómico por línea; si alguna falla → rollback TOTAL → E2.
 *  - Todo (pago + transición + stock + carrito + outbox) en UNA transacción: commit/rollback total.
 *  - Conflicto de stock (E2): rollback + compensación `en_revision` + alerta Admin (sin descuento parcial).
 *  - Monto contra snapshot: si no coincide → `en_revision` (nunca aprobar en silencio).
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
        if (!nuevo) return 'ya_procesado';

        const pedido = await repos.pedidos.buscarParaPago(pedidoId);
        if (pedido === null) return 'sin_pedido';

        // Rechazado (ALT-001): pedido → rechazado; stock intacto; el carrito NO se vacía.
        if (pago.estado === 'rejected') {
          await repos.pedidos.transicionar(pedido.id, 'pendiente_pago', 'rechazado');
          await repos.auditoria.registrar({ tipo: 'PagoRechazado', sujetoId: pedido.id });
          return 'rechazado';
        }

        // Monto/estado que no coincide con el snapshot → en_revision (nunca aprobar en silencio).
        if (pago.estado !== 'approved' || redondear2(pago.monto) !== redondear2(pedido.monto_total)) {
          await repos.pedidos.transicionar(pedido.id, 'pendiente_pago', 'en_revision');
          await repos.auditoria.registrar({
            tipo: 'PagoEnRevision',
            sujetoId: pedido.id,
            datos: { motivo: 'monto', monto_notificado: pago.monto },
          });
          return 'en_revision';
        }

        // Aprobado. 1) Claim del pedido con guard; si ya no está pendiente_pago → no tocar stock.
        const transicionado = await repos.pedidos.transicionar(pedido.id, 'pendiente_pago', 'pagado');
        if (!transicionado) return 'ya_procesado';

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
        return 'pagado';
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
          await repos.pedidos.transicionar(pedidoId, 'pendiente_pago', 'en_revision');
          await repos.auditoria.registrar({
            tipo: 'PedidoEnRevision',
            sujetoId: pedidoId,
            datos: { motivo: 'stock', alerta_admin: true },
          });
        });
        return 'en_revision';
      }
      throw error;
    }
  }
}
