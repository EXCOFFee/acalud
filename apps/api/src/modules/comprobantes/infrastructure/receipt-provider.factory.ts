import type { ReceiptProvider } from '../domain/ports/receipt-provider.port';
import { ReceiptFakeAdapter } from './adapters/receipt-fake.adapter';

/**
 * Selección del `ReceiptProvider` (ADR-006): `RECEIPT_ARCA_ENABLED=true` agrega el CAE de ARCA
 * (homologación) al PDF; cualquier otro valor deja solo el PDF interno.
 */
export function crearReceiptProvider(env: NodeJS.ProcessEnv = process.env): ReceiptProvider {
  return new ReceiptFakeAdapter(env.RECEIPT_ARCA_ENABLED === 'true');
}
