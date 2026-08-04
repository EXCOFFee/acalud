import { CarritoNoCheckouteable, PagoIndisponible, SinPermisosInstitucionales } from '../domain/errores';
import type { Domicilio, LineaPedido, ModalidadEnvio, NuevoPedido } from '../domain/pedido';
import type { UnidadDeTrabajoCompras } from '../domain/ports/checkout.repository';
import type { PaymentProvider } from '../domain/ports/payment-provider.port';
import { calcularCarrito, redondear2 } from '../domain/precio';

export interface IniciarCheckoutInput {
  cuentaId: string;
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
const ENVIO_FAKE: Record<ModalidadEnvio, number> = { home_delivery: 3000, branch_pickup: 1500 };

/**
 * CU-12 (pasos 1-3) · Iniciar checkout. Congela el snapshot de precios server-side, crea el
 * Pedido `pendiente_pago` (idempotencia por carrito) y crea la preferencia de pago. El cliente
 * jamás manda precios.
 *
 * Las precondiciones de CU-12 están enumeradas de forma cerrada —sesión iniciada, carrito con
 * productos, envío calculado, stock disponible e integración de pago configurada— y NO incluyen
 * el correo verificado: la verificación no condiciona el acceso (la cuenta queda operativa desde
 * el registro, CU-01).
 */
export class IniciarCheckout {
  constructor(
    private readonly uow: UnidadDeTrabajoCompras,
    private readonly pagos: PaymentProvider,
  ) {}

  async ejecutar(input: IniciarCheckoutInput): Promise<CheckoutIniciado> {
    const creado = await this.uow.transaccion(async (repos) => {
      // CU-24 RN-001/A1/A3: solo el encargado institucional puede finalizar la compra B2B.
      if (input.contexto !== null && !(await repos.carrito.esEncargadoActivo(input.cuentaId, input.contexto))) {
        throw new SinPermisosInstitucionales();
      }

      // CU-24 RN-007: la factura va a nombre de la institución, no del encargado individual.
      const billingData =
        input.contexto !== null
          ? await repos.carrito.datosFacturacion(input.contexto).then((d) =>
              d ? { razon_social: d.razonSocial, cuit: d.cuit } : null,
            )
          : null;

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
        institution_id: input.contexto,
        carrito_id: carritoId,
        domicilio_snapshot: input.domicilio,
        envio_modalidad: input.modalidadEnvio,
        envio_costo: envioCosto,
        monto_total: montoTotal,
        lineas: lineasPedido,
        billing_data: billingData,
      };
      const pedido = await repos.pedidos.crear(nuevo); // lanza PedidoPendienteExistente (409) si ya hay uno
      await repos.auditoria.registrar({
        // RN-008/RNF-008 (CU-24): institution_id viaja en `datos` — audit_log no tiene columna
        // propia para eso (es de alcance transversal, D-27), igual que en el resto del proyecto.
        tipo: input.contexto !== null ? 'B2BOrderCreated' : 'PedidoCreado',
        sujetoId: pedido.id,
        datos: {
          numero: pedido.numero,
          monto_total: montoTotal,
          ...(input.contexto !== null ? { institution_id: input.contexto } : {}),
        },
      });
      return { pedidoId: pedido.id, numero: pedido.numero, montoTotal };
    });

    // Preferencia de pago FUERA de la tx (F2). Sin fallback: si el adapter falla → 503 (ADR-006).
    let pref;
    try {
      pref = await this.pagos.crearPreferencia({
        pedido_id: creado.pedidoId,
        monto_total: creado.montoTotal,
        descripcion: `Pedido ${creado.numero}`,
      });
    } catch {
      throw new PagoIndisponible();
    }
    // CU-12 (paso 14): guardar el preference_id es trazabilidad, no crítico para el pago — si
    // falla, no tumba el checkout (la preferencia ya existe en Mercado Pago de todos modos).
    await this.uow
      .transaccion((repos) => repos.pedidos.guardarPreferencia(creado.pedidoId, pref.preferencia_id))
      .catch(() => undefined);
    return { pedido_id: creado.pedidoId, init_point: pref.init_point };
  }
}
