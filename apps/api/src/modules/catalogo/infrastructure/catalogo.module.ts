import { Module } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../platform/db/pg.module';
import { ListarJuegos } from '../application/listar-juegos';
import { VerJuego } from '../application/ver-juego';
import { CATALOGO_REPOSITORY, type CatalogoRepository } from '../domain/ports/catalogo.repository';
import { CatalogoController } from './http/catalogo.controller';
import { CatalogoRepositoryPg } from './persistencia/catalogo.repository.pg';

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
  ],
})
export class CatalogoModule {}
