import { Module } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../platform/db/pg.module';
import { ListarJuegos } from '../application/listar-juegos';
import { VerJuego } from '../application/ver-juego';
import { CATALOGO_REPOSITORY, type CatalogoRepository } from '../domain/ports/catalogo.repository';
import { DEMOS_REPOSITORY, type DemosRepository } from '../domain/ports/demos.repository';
import { ProbarDemoPublica } from '../application/probar-demo-publica';
import { ProbarDemoRegistrada } from '../application/probar-demo-registrada';
import { CatalogoController } from './http/catalogo.controller';
import { CatalogoRepositoryPg } from './persistencia/catalogo.repository.pg';
import { DemosRepositoryPg } from './persistencia/demos.repository.pg';

/**
 * BC2 · Catálogo (read-only, CU-006). Cablea el puerto de lectura con su adapter PG; los casos
 * de uso son clases framework-agnósticas instanciadas por `useFactory` (ADR-002).
 */
@Module({
  controllers: [CatalogoController],
  providers: [
    {
      provide: CATALOGO_REPOSITORY,
      useFactory: (pool: Pool): CatalogoRepository => new CatalogoRepositoryPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: ListarJuegos,
      useFactory: (repo: CatalogoRepository): ListarJuegos => new ListarJuegos(repo),
      inject: [CATALOGO_REPOSITORY],
    },
    {
      provide: VerJuego,
      useFactory: (repo: CatalogoRepository): VerJuego => new VerJuego(repo),
      inject: [CATALOGO_REPOSITORY],
    },
    {
      provide: DEMOS_REPOSITORY,
      useFactory: (pool: Pool): DemosRepository => new DemosRepositoryPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: ProbarDemoPublica,
      useFactory: (repo: DemosRepository): ProbarDemoPublica => new ProbarDemoPublica(repo),
      inject: [DEMOS_REPOSITORY],
    },
    {
      provide: ProbarDemoRegistrada,
      useFactory: (repo: DemosRepository): ProbarDemoRegistrada => new ProbarDemoRegistrada(repo),
      inject: [DEMOS_REPOSITORY],
    },
  ],
})
export class CatalogoModule {}
