import { Module } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../platform/db/pg.module';
import { ActualizarEncuesta } from '../application/actualizar-encuesta';
import { AlternarEstadoEncuesta } from '../application/alternar-estado-encuesta';
import { CrearEncuesta } from '../application/crear-encuesta';
import { EliminarEncuesta } from '../application/eliminar-encuesta';
import { ListarEncuestasAdmin } from '../application/listar-encuestas-admin';
import {
  UOW_COMUNIDAD_ADMIN,
  type UnidadDeTrabajoComunidadAdmin,
} from '../domain/ports/comunidad-admin.uow';
import { AdminEncuestasController } from './http/admin-encuestas.controller';
import { UnidadDeTrabajoComunidadAdminPg } from './persistencia/unidad-de-trabajo-admin.pg';
import { VerListadoEncuestas } from '../application/ver-listado-encuestas';
import { VerResultadosEncuesta } from '../application/ver-resultados-encuesta';
import { ENCUESTAS_REPOSITORY, type EncuestasRepository } from '../domain/ports/encuestas.repository';
import { EncuestasRepositoryPg } from './persistencia/encuestas.repository.pg';
import { EncuestasController } from './http/encuestas.controller';
import { VotarEncuesta } from '../application/votar-encuesta';
import { VOTOS_REPOSITORY, type VotosRepository } from '../domain/ports/votos.repository';
import { VotosRepositoryPg } from './persistencia/votos.repository.pg';
import { CrearPropuesta } from '../application/crear-propuesta';
import { VerMisPropuestas } from '../application/ver-mis-propuestas';
import { UOW_PROPUESTAS, type UnidadDeTrabajoPropuestas } from '../domain/ports/propuestas.uow';
import { UnidadDeTrabajoPropuestasPg } from './persistencia/unidad-de-trabajo-propuestas.pg';
import { PropuestasController } from './http/propuestas.controller';
import { ListarPropuestasAdmin } from '../application/listar-propuestas-admin';
import { VerDetallePropuestaAdmin } from '../application/ver-detalle-propuesta-admin';
import { ActualizarEstadoPropuesta } from '../application/actualizar-estado-propuesta';
import { AdminPropuestasController } from './http/admin-propuestas.controller';
import { VerCatalogoPedagogico } from '../application/ver-catalogo-pedagogico';
import {
  CATALOGO_PEDAGOGICO_REPOSITORY,
  type CatalogoPedagogicoRepository,
} from '../domain/ports/catalogo-pedagogico.repository';
import { CatalogoPedagogicoRepositoryPg } from './persistencia/catalogo-pedagogico.repository.pg';
import { CatalogoPedagogicoController } from './http/catalogo-pedagogico.controller';

/** BC6 · Comunidad (CU-14/15/16/20/21) — completo. */
@Module({
  controllers: [
    AdminEncuestasController,
    EncuestasController,
    PropuestasController,
    AdminPropuestasController,
    CatalogoPedagogicoController,
  ],
  providers: [
    {
      provide: UOW_COMUNIDAD_ADMIN,
      useFactory: (pool: Pool): UnidadDeTrabajoComunidadAdmin => new UnidadDeTrabajoComunidadAdminPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: ListarEncuestasAdmin,
      useFactory: (uow: UnidadDeTrabajoComunidadAdmin): ListarEncuestasAdmin => new ListarEncuestasAdmin(uow),
      inject: [UOW_COMUNIDAD_ADMIN],
    },
    {
      provide: CrearEncuesta,
      useFactory: (uow: UnidadDeTrabajoComunidadAdmin): CrearEncuesta => new CrearEncuesta(uow),
      inject: [UOW_COMUNIDAD_ADMIN],
    },
    {
      provide: ActualizarEncuesta,
      useFactory: (uow: UnidadDeTrabajoComunidadAdmin): ActualizarEncuesta => new ActualizarEncuesta(uow),
      inject: [UOW_COMUNIDAD_ADMIN],
    },
    {
      provide: AlternarEstadoEncuesta,
      useFactory: (uow: UnidadDeTrabajoComunidadAdmin): AlternarEstadoEncuesta => new AlternarEstadoEncuesta(uow),
      inject: [UOW_COMUNIDAD_ADMIN],
    },
    {
      provide: EliminarEncuesta,
      useFactory: (uow: UnidadDeTrabajoComunidadAdmin): EliminarEncuesta => new EliminarEncuesta(uow),
      inject: [UOW_COMUNIDAD_ADMIN],
    },
    {
      provide: ENCUESTAS_REPOSITORY,
      useFactory: (pool: Pool): EncuestasRepository => new EncuestasRepositoryPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: VerListadoEncuestas,
      useFactory: (repo: EncuestasRepository): VerListadoEncuestas => new VerListadoEncuestas(repo),
      inject: [ENCUESTAS_REPOSITORY],
    },
    {
      provide: VerResultadosEncuesta,
      useFactory: (repo: EncuestasRepository): VerResultadosEncuesta => new VerResultadosEncuesta(repo),
      inject: [ENCUESTAS_REPOSITORY],
    },
    {
      provide: VOTOS_REPOSITORY,
      useFactory: (pool: Pool): VotosRepository => new VotosRepositoryPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: VotarEncuesta,
      useFactory: (votos: VotosRepository, encuestas: EncuestasRepository): VotarEncuesta =>
        new VotarEncuesta(votos, encuestas),
      inject: [VOTOS_REPOSITORY, ENCUESTAS_REPOSITORY],
    },
    {
      provide: UOW_PROPUESTAS,
      useFactory: (pool: Pool): UnidadDeTrabajoPropuestas => new UnidadDeTrabajoPropuestasPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: CrearPropuesta,
      useFactory: (uow: UnidadDeTrabajoPropuestas): CrearPropuesta => new CrearPropuesta(uow),
      inject: [UOW_PROPUESTAS],
    },
    {
      provide: VerMisPropuestas,
      useFactory: (uow: UnidadDeTrabajoPropuestas): VerMisPropuestas => new VerMisPropuestas(uow),
      inject: [UOW_PROPUESTAS],
    },
    {
      provide: ListarPropuestasAdmin,
      useFactory: (uow: UnidadDeTrabajoPropuestas): ListarPropuestasAdmin => new ListarPropuestasAdmin(uow),
      inject: [UOW_PROPUESTAS],
    },
    {
      provide: VerDetallePropuestaAdmin,
      useFactory: (uow: UnidadDeTrabajoPropuestas): VerDetallePropuestaAdmin => new VerDetallePropuestaAdmin(uow),
      inject: [UOW_PROPUESTAS],
    },
    {
      provide: ActualizarEstadoPropuesta,
      useFactory: (uow: UnidadDeTrabajoPropuestas): ActualizarEstadoPropuesta => new ActualizarEstadoPropuesta(uow),
      inject: [UOW_PROPUESTAS],
    },
    {
      provide: CATALOGO_PEDAGOGICO_REPOSITORY,
      useFactory: (pool: Pool): CatalogoPedagogicoRepository => new CatalogoPedagogicoRepositoryPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: VerCatalogoPedagogico,
      useFactory: (repo: CatalogoPedagogicoRepository): VerCatalogoPedagogico => new VerCatalogoPedagogico(repo),
      inject: [CATALOGO_PEDAGOGICO_REPOSITORY],
    },
  ],
})
export class ComunidadModule {}
