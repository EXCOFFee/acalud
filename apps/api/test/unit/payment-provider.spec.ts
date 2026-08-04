import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MercadoPagoFakeAdapter } from '../../src/modules/compras/infrastructure/adapters/mercado-pago-fake.adapter';
import { MercadoPagoAdapter } from '../../src/modules/compras/infrastructure/adapters/mercado-pago.adapter';
import { crearPaymentProvider } from '../../src/modules/compras/infrastructure/payment-provider.factory';

function respuesta(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

describe('MercadoPagoFakeAdapter (fixture de tests, ADR-006)', () => {
  it('cumple el contrato del puerto', async () => {
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
});

describe('payment-provider.factory (ADR-006: selección fija)', () => {
  it('siempre devuelve el adapter real, con o sin credenciales configuradas', () => {
    expect(crearPaymentProvider({})).toBeInstanceOf(MercadoPagoAdapter);
    expect(crearPaymentProvider({ MP_ACCESS_TOKEN: 'TEST-123' })).toBeInstanceOf(MercadoPagoAdapter);
  });
});

describe('MercadoPagoAdapter (Checkout Pro real, ADR-006)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  function crear(): MercadoPagoAdapter {
    return new MercadoPagoAdapter({
      accessToken: 'TEST-token',
      webBaseUrl: 'https://acalud.example',
      notificationUrl: 'https://acalud-api.example/api/v1/webhooks/mercadopago',
    });
  }

  it('crearPreferencia arma el body de Checkout Pro y devuelve init_point', async () => {
    fetchMock.mockResolvedValueOnce(respuesta({ id: 'pref-1', init_point: 'https://mp.example/checkout/pref-1' }));

    const adapter = crear();
    const pref = await adapter.crearPreferencia({
      pedido_id: 'ped-1',
      monto_total: 1500,
      descripcion: 'Pedido ACA-1',
    });

    expect(pref).toEqual({ preferencia_id: 'pref-1', init_point: 'https://mp.example/checkout/pref-1' });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.mercadopago.com/checkout/preferences');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer TEST-token' });
    const body = JSON.parse(init.body as string);
    expect(body.external_reference).toBe('ped-1');
    expect(body.items).toEqual([{ title: 'Pedido ACA-1', quantity: 1, unit_price: 1500 }]);
    expect(body.notification_url).toBe('https://acalud-api.example/api/v1/webhooks/mercadopago');
    expect(body.back_urls.success).toBe('https://acalud.example/checkout/resultado?pedido_id=ped-1');
  });

  it('crearPreferencia lanza si Mercado Pago responde error', async () => {
    fetchMock.mockResolvedValueOnce(respuesta({ message: 'invalid token' }, false, 401));
    await expect(
      crear().crearPreferencia({ pedido_id: 'ped-1', monto_total: 100, descripcion: 'x' }),
    ).rejects.toThrow(/401/);
  });

  it('consultarPago mapea el estado y el monto autoritativos de Mercado Pago', async () => {
    fetchMock.mockResolvedValueOnce(
      respuesta({ status: 'approved', transaction_amount: 1500, external_reference: 'ped-1' }),
    );
    const pago = await crear().consultarPago('pay-1');
    expect(pago).toEqual({ payment_id: 'pay-1', estado: 'approved', monto: 1500, referencia_externa: 'ped-1' });
  });

  it('consultarPago lanza si el payment_id no existe en Mercado Pago', async () => {
    fetchMock.mockResolvedValueOnce(respuesta({ message: 'not found' }, false, 404));
    await expect(crear().consultarPago('inexistente')).rejects.toThrow(/404/);
  });
});
