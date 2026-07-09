import { describe, expect, it } from 'vitest';
import { MiCorreoFakeAdapter } from '../../src/modules/logistica/infrastructure/adapters/micorreo-fake.adapter';
import { TarifaLocalFakeAdapter } from '../../src/modules/logistica/infrastructure/adapters/tarifa-local-fake.adapter';
import { crearShippingProvider } from '../../src/modules/logistica/infrastructure/shipping-provider.factory';

describe('ShippingProvider (puerto + fakes, ADR-006)', () => {
  it('MiCorreo fake cotiza determinista con origen "micorreo"', async () => {
    const p = new MiCorreoFakeAdapter();
    const entrada = { peso_gramos: 2500, codigo_postal: '1900', modalidad: 'domicilio' as const };
    const c1 = await p.cotizar(entrada);
    const c2 = await p.cotizar(entrada);
    expect(c1.origen).toBe('micorreo');
    expect(c1.monto).toBeGreaterThan(0);
    expect(c2.monto).toBe(c1.monto); // determinista (CU-011)
    expect(await p.consultarTracking('CA123AR')).not.toHaveLength(0);
  });

  it('Tabla local fake cotiza con origen "tabla_local" y sin tracking', async () => {
    const p = new TarifaLocalFakeAdapter();
    const c = await p.cotizar({ peso_gramos: 1000, codigo_postal: '1900', modalidad: 'sucursal' });
    expect(c.origen).toBe('tabla_local');
    expect(await p.consultarTracking('X')).toEqual([]);
  });

  it('la factory selecciona por SHIPPING_ADAPTER', () => {
    expect(crearShippingProvider({ SHIPPING_ADAPTER: 'micorreo' })).toBeInstanceOf(
      MiCorreoFakeAdapter,
    );
    expect(crearShippingProvider({ SHIPPING_ADAPTER: 'tabla' })).toBeInstanceOf(
      TarifaLocalFakeAdapter,
    );
    expect(crearShippingProvider({})).toBeInstanceOf(TarifaLocalFakeAdapter); // default
  });
});
