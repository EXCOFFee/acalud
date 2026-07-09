/**
 * Puerto `ReceiptProvider` (ADR-006). Emisión del comprobante de una compra. Compuesto:
 * el PDF interno se emite siempre; ARCA (homologación) agrega el CAE si está activo
 * (`RECEIPT_ARCA_ENABLED`). Fallback total: si ARCA falla, el PDF cubre.
 */
export type TipoComprobante = 'pdf' | 'arca';

export interface EmitirComprobanteInput {
  readonly pedido_id: string;
  readonly monto_total: number;
}

export interface ComprobanteEmitido {
  readonly tipo: TipoComprobante;
  readonly pdf_ref: string; // el PDF interno siempre existe
  readonly cae: string | null; // CAE solo si ARCA está activo
}

export interface ReceiptProvider {
  emitir(input: EmitirComprobanteInput): Promise<ComprobanteEmitido>;
}

export const RECEIPT_PROVIDER = Symbol('ReceiptProvider');
