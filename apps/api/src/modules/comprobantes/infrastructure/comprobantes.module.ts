import { Module } from '@nestjs/common';
import { RECEIPT_PROVIDER } from '../domain/ports/receipt-provider.port';
import { crearReceiptProvider } from './receipt-provider.factory';

@Module({
  providers: [{ provide: RECEIPT_PROVIDER, useFactory: () => crearReceiptProvider() }],
  exports: [RECEIPT_PROVIDER],
})
export class ComprobantesModule {}
