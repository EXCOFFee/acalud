import { Global, Inject, Module, type OnModuleDestroy, type Provider } from '@nestjs/common';
import { Pool } from 'pg';
import { sslDesde } from './ssl';

/** Token de inyección del pool de PostgreSQL (acceso exclusivo desde el backend, ADR-003). */
export const PG_POOL = Symbol('PG_POOL');

const poolProvider: Provider = {
  provide: PG_POOL,
  useFactory: (): Pool =>
    new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      ssl: sslDesde(process.env.DATABASE_URL),
    }),
};

/**
 * Provee un `pg.Pool` único y global. La connection string llega por `DATABASE_URL`
 * (pooler de Supabase en producción; contenedor de Testcontainers en los tests).
 */
@Global()
@Module({
  providers: [poolProvider],
  exports: [PG_POOL],
})
export class PgModule implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
