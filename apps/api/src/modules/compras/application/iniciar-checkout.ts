import {
  CarritoNoCheckouteable,
  CuentaNoVerificada,
  PagoIndisponible,
} from '../domain/errores';
import type { Domicilio, LineaPedido, ModalidadEnvio, NuevoPedido } from '../domain/pedido';
import type { UnidadDeTrabajoCompras } from '../domain/ports/checkout.repository';
import type { PaymentProvider } from '../domain/ports/payment-provider.port';
import { calcularCarrito, redondear2 } from '../domain/precio';

export interface IniciarCheckoutInput {
  cuentaId: string;
  verificada: boolean;
  contexto: string | null;
  modalidadEnvio: ModalidadEnvio;
  codigoPostal: string;
  domicilio: Domicilio;
}

export interface CheckoutIniciado {
  pedido_id: string;
  init_point: string;
}

// Envío fake determinista (Etapa 1). La cotización real (MiCorreo/tabla, CU-011) llega en Etapa 3.
const ENVIO_FAKE: Record<ModalidadEnvio, number> = { domicilio: 3000, sucursal: 1500 };

/**
 * CU-012 (pasos 1-3) · Iniciar checkout. Valida cuenta verificada (PA-06) y carrito disponible,
 * congela el snapshot de precios server-side, crea el Pedido `pendiente_pago` (idempotencia por
 * carrito) y crea la preferencia de pago. El cliente jamás manda precios.
 */
export class IniciarCheckout {
  constructor(
    private readonly uow: UnidadDeTrabajoCompras,
    private readonly pagos: PaymentProvider,
  ) {}

  async ejecutar(input: IniciarCheckoutInput): Promise<CheckoutIniciado> {
    if (!input.verificada) throw new CuentaNoVerificada(); // PA-06

    const creado = await this.uow.transaccion(async (repos) => {
      const { carritoId, lineas } = await repos.carrito.leer(input.cuentaId, input.contexto);
      if (lineas.length === 0) throw new CarritoNoCheckouteable('Tu carrito está vacío');

      const vista = calcularCarrito(lineas, input.contexto);
      if (vista.lineas.some((l) => !l.disponible)) {
        throw new CarritoNoCheckouteable('Alguna línea no tiene stock suficiente');
      }

      const envioCosto = ENVIO_FAKE[input.modalidadEnvio];
      const montoTotal = redondear2(vista.total + envioCosto);
      const lineasPedido: LineaPedido[] = vista.lineas.map((l) => ({
        juego_id: l.juego_id,
        nombre_snapshot: l.nombre,
        cantidad: l.cantidad,
        precio_unitario_snapshot: l.precio_unitario,
        descuento_pct_snapshot: l.descuento_pct,
      }));

      const nuevo: NuevoPedido = {
        cuenta_id: input.cuentaId,
        carrito_id: carritoId,
        domicilio_snapshot: input.domicilio,
        envio_modalidad: input.modalidadEnvio,
        envio_costo: envioCosto,
        monto_total: montoTotal,
        lineas: lineasPedido,
      };
      const pedido = await repos.pedidos.crear(nuevo); // lanza PedidoPendienteExistente (409) si ya hay uno
      await repos.auditoria.registrar({
        tipo: 'PedidoCreado',
        sujetoId: pedido.id,
        datos: { numero: pedido.numero, monto_total: montoTotal },
      });
      return { pedidoId: pedido.id, numero: pedido.numero, montoTotal };
    });

    // Preferencia de pago FUERA de la tx (F2). Sin fallback: si el adapter falla → 503 (ADR-006).
    try {
      const pref = await this.pagos.crearPreferencia({
        pedido_id: creado.pedidoId,
        monto_total: creado.montoTotal,
        descripcion: `Pedido ${creado.numero}`,
      });
      return { pedido_id: creado.pedidoId, init_point: pref.init_point };
    } catch {
      throw new PagoIndisponible();
    }
  }
}
