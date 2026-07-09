import { Module } from '@nestjs/common';
import { SHIPPING_PROVIDER } from '../domain/ports/shipping-provider.port';
import { crearShippingProvider } from './shipping-provider.factory';

@Module({
  providers: [{ provide: SHIPPING_PROVIDER, useFactory: () => crearShippingProvider() }],
  exports: [SHIPPING_PROVIDER],
})
export class LogisticaModule {}
