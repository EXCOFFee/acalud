import type {
  ComprobanteEmitido,
  EmitirComprobanteInput,
  ReceiptProvider,
} from '../../domain/ports/receipt-provider.port';

/**
 * Adapter FAKE de ReceiptProvider (ADR-006). Emite siempre el PDF interno; si ARCA está
 * activo, agrega un CAE ficticio. Los adapters reales (PdfInterno + ArcaHomologacion SOAP)
 * llegan en la Etapa 3.
 */
export class ReceiptFakeAdapter implements ReceiptProvider {
  constructor(private readonly arcaActivo: boolean) {}

  async emitir(input: EmitirComprobanteInput): Promise<ComprobanteEmitido> {
    return {
      tipo: this.arcaActivo ? 'arca' : 'pdf',
      pdf_ref: `fake-pdf-${input.pedido_id}`,
      cae: this.arcaActivo ? `fake-cae-${input.pedido_id}` : null,
    };
  }
}
