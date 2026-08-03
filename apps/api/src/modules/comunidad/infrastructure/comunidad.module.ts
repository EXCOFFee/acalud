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

/** BC6 · Comunidad (CU-14/15/16/20/21). Por ahora, solo el ABM admin de encuestas (CU-20). */
@Module({
  controllers: [AdminEncuestasController],
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
  ],
})
export class ComunidadModule {}
