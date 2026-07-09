import { describe, expect, it } from 'vitest';
import { ReceiptFakeAdapter } from '../../src/modules/comprobantes/infrastructure/adapters/receipt-fake.adapter';
import { crearReceiptProvider } from '../../src/modules/comprobantes/infrastructure/receipt-provider.factory';

describe('ReceiptProvider (puerto + fake, ADR-006)', () => {
  it('sin ARCA: emite solo PDF interno (cae null)', async () => {
    const c = await new ReceiptFakeAdapter(false).emitir({ pedido_id: 'ped-1', monto_total: 1000 });
    expect(c.tipo).toBe('pdf');
    expect(c.pdf_ref).toContain('ped-1');
    expect(c.cae).toBeNull();
  });

  it('con ARCA: PDF + CAE', async () => {
    const c = await new ReceiptFakeAdapter(true).emitir({ pedido_id: 'ped-1', monto_total: 1000 });
    expect(c.tipo).toBe('arca');
    expect(c.cae).not.toBeNull();
  });

  it('la factory respeta RECEIPT_ARCA_ENABLED', async () => {
    const conArca = crearReceiptProvider({ RECEIPT_ARCA_ENABLED: 'true' });
    const sinArca = crearReceiptProvider({ RECEIPT_ARCA_ENABLED: 'false' });
    expect((await conArca.emitir({ pedido_id: 'x', monto_total: 1 })).cae).not.toBeNull();
    expect((await sinArca.emitir({ pedido_id: 'x', monto_total: 1 })).cae).toBeNull();
  });
});
