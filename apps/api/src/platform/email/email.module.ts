import { Module } from '@nestjs/common';
import { EMAIL_PROVIDER } from './email-provider.port';
import { crearEmailProvider } from './email-provider.factory';

@Module({
  providers: [{ provide: EMAIL_PROVIDER, useFactory: () => crearEmailProvider() }],
  exports: [EMAIL_PROVIDER],
})
export class EmailModule {}
