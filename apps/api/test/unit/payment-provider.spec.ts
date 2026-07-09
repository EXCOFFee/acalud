import { describe, expect, it } from 'vitest';
import { MercadoPagoFakeAdapter } from '../../src/modules/compras/infrastructure/adapters/mercado-pago-fake.adapter';
import { crearPaymentProvider } from '../../src/modules/compras/infrastructure/payment-provider.factory';

describe('PaymentProvider (puerto + fake, ADR-006)', () => {
  it('el fake cumple el contrato del puerto', async () => {
    const provider = new MercadoPagoFakeAdapter();

    const pref = await provider.crearPreferencia({
      pedido_id: 'ped-1',
      monto_total: 1000,
      descripcion: 'Compra',
    });
    expect(pref.preferencia_id).toContain('ped-1');
    expect(typeof pref.init_point).toBe('string');

    const pago = await provider.consultarPago('pay-1');
    expect(pago.payment_id).toBe('pay-1');
    expect(['approved', 'rejected', 'pending']).toContain(pago.estado);
    expect(typeof pago.monto).toBe('number');
  });

  it('la factory selecciona el adapter fijo (Mercado Pago)', () => {
    expect(crearPaymentProvider()).toBeInstanceOf(MercadoPagoFakeAdapter);
  });
});
