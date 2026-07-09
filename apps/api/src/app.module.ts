import { Module } from '@nestjs/common';
import { HealthModule } from './platform/health/health.module';
import { EmailModule } from './platform/email/email.module';
import { ComprasModule } from './modules/compras/infrastructure/compras.module';
import { LogisticaModule } from './modules/logistica/infrastructure/logistica.module';
import { ComprobantesModule } from './modules/comprobantes/infrastructure/comprobantes.module';

/**
 * Módulo raíz del monolito modular (ADR-002). Composición: cada bounded context (2.3 §2)
 * registra su propio módulo Nest. En la Etapa 0 se cablean los puertos de integración con
 * sus adapters FAKE (ADR-006) para destrabar el esqueleto E2E de la Etapa 1.
 */
@Module({
  imports: [HealthModule, EmailModule, ComprasModule, LogisticaModule, ComprobantesModule],
})
export class AppModule {}
