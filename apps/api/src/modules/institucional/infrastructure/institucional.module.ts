import { Module } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../platform/db/pg.module';
import { AsignarLicencias } from '../application/asignar-licencias';
import { RegistrarInstitucion } from '../application/registrar-institucion';
import { RevocarLicencias } from '../application/revocar-licencias';
import { VerDocentesAsignados } from '../application/ver-docentes-asignados';
import { VerInventario } from '../application/ver-inventario';
import {
  UOW_INSTITUCIONAL,
  type UnidadDeTrabajoInstitucional,
} from '../domain/ports/institucion.repository';
import { InstitucionesController } from './http/instituciones.controller';
import { UnidadDeTrabajoInstitucionalPg } from './persistencia/unidad-de-trabajo.pg';

/** BC Institucional (CU-23 …). Composición propia: no reutiliza la UoW de Identidad (ADR-002). */
@Module({
  controllers: [InstitucionesController],
  providers: [
    {
      provide: UOW_INSTITUCIONAL,
      useFactory: (pool: Pool): UnidadDeTrabajoInstitucional =>
        new UnidadDeTrabajoInstitucionalPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: RegistrarInstitucion,
      useFactory: (uow: UnidadDeTrabajoInstitucional): RegistrarInstitucion =>
        new RegistrarInstitucion(uow),
      inject: [UOW_INSTITUCIONAL],
    },
    {
      provide: VerInventario,
      useFactory: (uow: UnidadDeTrabajoInstitucional): VerInventario => new VerInventario(uow),
      inject: [UOW_INSTITUCIONAL],
    },
    {
      provide: AsignarLicencias,
      useFactory: (uow: UnidadDeTrabajoInstitucional): AsignarLicencias =>
        new AsignarLicencias(uow),
      inject: [UOW_INSTITUCIONAL],
    },
    {
      provide: RevocarLicencias,
      useFactory: (uow: UnidadDeTrabajoInstitucional): RevocarLicencias =>
        new RevocarLicencias(uow),
      inject: [UOW_INSTITUCIONAL],
    },
    {
      provide: VerDocentesAsignados,
      useFactory: (uow: UnidadDeTrabajoInstitucional): VerDocentesAsignados =>
        new VerDocentesAsignados(uow),
      inject: [UOW_INSTITUCIONAL],
    },
  ],
})
export class InstitucionalModule {}
