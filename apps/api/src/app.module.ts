import { Module } from '@nestjs/common';
import { HealthModule } from './platform/health/health.module';

/**
 * Módulo raíz del monolito modular (ADR-002).
 * Cada bounded context (2.3 §2) se registra como su propio módulo Nest bajo `src/modules/`;
 * en la Etapa 0 solo existe el esqueleto de carpetas + el módulo de salud (platform/).
 */
@Module({
  imports: [HealthModule],
})
export class AppModule {}
