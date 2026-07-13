import { Module } from '@nestjs/common';
import { PgModule } from './platform/db/pg.module';
import { HealthModule } from './platform/health/health.module';
import { EmailModule } from './platform/email/email.module';
import { OutboxModule } from './platform/outbox/outbox.module';
import { IdentidadModule } from './modules/identidad/infrastructure/identidad.module';
import { CatalogoModule } from './modules/catalogo/infrastructure/catalogo.module';
import { ComprasModule } from './modules/compras/infrastructure/compras.module';
import { LogisticaModule } from './modules/logistica/infrastructure/logistica.module';
import { ComprobantesModule } from './modules/comprobantes/infrastructure/comprobantes.module';

/**
 * Módulo raíz del monolito modular (ADR-002). Composición: PgModule (conexión global) +
 * cada bounded context (2.3 §2). En la Etapa 1 entra Identidad (auth con transporte dual);
 * los puertos de integración (Compras/Logística/Comprobantes/Email) siguen con adapters fake.
 */
@Module({
  imports: [
    PgModule,
    HealthModule,
    EmailModule,
    OutboxModule,
    IdentidadModule,
    CatalogoModule,
    ComprasModule,
    LogisticaModule,
    ComprobantesModule,
  ],
})
export class AppModule {}
