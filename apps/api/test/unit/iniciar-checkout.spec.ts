import { describe, expect, it } from 'vitest';
import { CalcularEnvio } from '../../src/modules/compras/application/calcular-envio';
import { IniciarCheckout } from '../../src/modules/compras/application/iniciar-checkout';
import type { LineaConJuego } from '../../src/modules/compras/domain/carrito';
import {
  CarritoNoCheckouteable,
  ProveedorLogisticoNoDisponible,
} from '../../src/modules/compras/domain/errores';
import type { NuevoPedido } from '../../src/modules/compras/domain/pedido';
import type {
  ReposCheckout,
  UnidadDeTrabajoCompras,
} from '../../src/modules/compras/domain/ports/checkout.repository';
import type { EnvioRepository } from '../../src/modules/compras/domain/ports/envio.repository';
import type {
  CrearPreferenciaInput,
  PaymentProvider,
} from '../../src/modules/compras/domain/ports/payment-provider.port';
import type {
  CotizarInput,
  ShippingProvider,
} from '../../src/modules/compras/domain/ports/shipping-provider.port';

const linea = (juego_id: string, cantidad: number): LineaConJuego => ({
  juego_id,
  nombre: juego_id,
  cantidad,
  precio_lista: 1000,
  stock_actual: 100,
  tramos: [],
});

/**
 * UoW falsa: cada `transaccion` lee el carrito siguiente de la lista (así se simula que el
 * usuario lo cambió entre la cotización y la compra) y guarda el pedido creado.
 */
class UowFake implements UnidadDeTrabajoCompras {
  creado: NuevoPedido | null = null;
  private lecturas = 0;
  constructor(private readonly carritos: LineaConJuego[][]) {}

  async transaccion<T>(fn: (repos: ReposCheckout) => Promise<T>): Promise<T> {
    const repos = {
      carrito: {
        leer: async () => ({
          carritoId: 'cart-1',
          lineas: this.carritos[Math.min(this.lecturas++, this.carritos.length - 1)]!,
        }),
        vaciar: async () => undefined,
        esEncargadoActivo: async () => true,
        datosFacturacion: async () => null,
      },
      pedidos: {
        crear: async (datos: NuevoPedido) => {
          this.creado = datos;
          return { id: 'ped-1', numero: 'ACA-1' };
        },
        buscarParaPago: async () => null,
        transicionar: async () => true,
        guardarPreferencia: async () => undefined,
      },
      auditoria: { registrar: async () => undefined },
    } as unknown as ReposCheckout;
    return fn(repos);
  }
}

class PagosFake implements PaymentProvider {
  monto: number | null = null;
  async crearPreferencia(input: CrearPreferenciaInput) {
    this.monto = input.monto_total;
    return { preferencia_id: 'pref-1', init_point: 'https://pago.test/1' };
  }
  async consultarPago(): Promise<never> {
    throw new Error('no usado');
  }
}

/** Cotizador falso: 100 por kg iniciado; o siempre falla. */
class EnvioFake implements ShippingProvider {
  constructor(private readonly caido = false) {}
  async cotizar(input: CotizarInput) {
    if (this.caido) throw new Error('timeout');
    return { monto: Math.ceil(input.peso_gramos / 1000) * 100, origen: 'local_fallback' as const };
  }
  async consultarTracking(): Promise<never> {
    throw new Error('no usado');
  }
}

const pesos: EnvioRepository = {
  obtenerPesos: async (ids) => new Map(ids.map((id) => [id, 1500])),
};

function checkout(uow: UowFake, pagos = new PagosFake(), caido = false): IniciarCheckout {
  return new IniciarCheckout(uow, pagos, new CalcularEnvio(pesos, new EnvioFake(caido)));
}

const INPUT = {
  cuentaId: 'u1',
  contexto: null,
  modalidadEnvio: 'home_delivery' as const,
  codigoPostal: '1900',
  domicilio: { calle: 'A', numero: '1', codigo_postal: '1900', provincia: 'BA', localidad: 'LP' },
};

describe('IniciarCheckout · envío cobrado = envío cotizado (CU-11 ↔ CU-12)', () => {
  it('cobra la cotización de CalcularEnvio y la suma al total que va a Mercado Pago', async () => {
    const uow = new UowFake([[linea('j1', 2)]]); // 2 × 1,5 kg = 3 kg → 300
    const pagos = new PagosFake();
    await checkout(uow, pagos).ejecutar(INPUT);
    expect(uow.creado?.envio_costo).toBe(300);
    expect(uow.creado?.monto_total).toBe(2 * 1000 + 300);
    expect(pagos.monto).toBe(2300);
  });

  it('si el carrito cambió entre la cotización y la transacción, rechaza sin crear el pedido', async () => {
    const uow = new UowFake([[linea('j1', 1)], [linea('j1', 5)]]);
    await expect(checkout(uow).ejecutar(INPUT)).rejects.toBeInstanceOf(CarritoNoCheckouteable);
    expect(uow.creado).toBeNull();
  });

  it('el orden de las líneas no cuenta como cambio', async () => {
    const uow = new UowFake([
      [linea('j1', 1), linea('j2', 1)],
      [linea('j2', 1), linea('j1', 1)],
    ]);
    await checkout(uow).ejecutar(INPUT);
    expect(uow.creado).not.toBeNull();
  });

  it('cotizador caído → ProveedorLogisticoNoDisponible (503) y no se crea ningún pedido', async () => {
    const uow = new UowFake([[linea('j1', 1)]]);
    await expect(checkout(uow, new PagosFake(), true).ejecutar(INPUT)).rejects.toBeInstanceOf(
      ProveedorLogisticoNoDisponible,
    );
    expect(uow.creado).toBeNull();
  });

  it('carrito vacío → 422 antes de cotizar', async () => {
    const uow = new UowFake([[]]);
    await expect(checkout(uow, new PagosFake(), true).ejecutar(INPUT)).rejects.toBeInstanceOf(
      CarritoNoCheckouteable,
    );
  });
});
