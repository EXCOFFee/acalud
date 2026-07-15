import { Global, Module } from '@nestjs/common';
import { AuthGuard } from './auth.guard';

/**
 * Autenticación transversal (platform). Global para que cualquier bounded context use
 * `@UseGuards(AuthGuard)` sin importar el interior de otro módulo (ADR-002).
 */
@Global()
@Module({
  providers: [AuthGuard],
  exports: [AuthGuard],
})
export class AuthModule {}
