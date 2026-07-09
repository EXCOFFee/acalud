import { Module } from '@nestjs/common';
import { PAYMENT_PROVIDER } from '../domain/ports/payment-provider.port';
import { crearPaymentProvider } from './payment-provider.factory';

@Module({
  providers: [{ provide: PAYMENT_PROVIDER, useFactory: () => crearPaymentProvider() }],
  exports: [PAYMENT_PROVIDER],
})
export class ComprasModule {}
