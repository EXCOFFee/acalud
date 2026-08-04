import { Module } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../platform/db/pg.module';
import { AsignarLicencias } from '../application/asignar-licencias';
import { ExportarReporte } from '../application/exportar-reporte';
import { RegistrarInstitucion } from '../application/registrar-institucion';
import { RevocarLicencias } from '../application/revocar-licencias';
import { VerDashboardPedagogico } from '../application/ver-dashboard-pedagogico';
import { VerDocentesAsignados } from '../application/ver-docentes-asignados';
import { VerInventario } from '../application/ver-inventario';
import { VerReporteInstitucional } from '../application/ver-reporte-institucional';
import { VerDetalleReporteJuego } from '../application/ver-detalle-reporte-juego';
import { VerDetalleReporteDocente } from '../application/ver-detalle-reporte-docente';
import { VerMiInstitucion } from '../application/ver-mi-institucion';
import {
  UOW_INSTITUCIONAL,
  type UnidadDeTrabajoInstitucional,
} from '../domain/ports/institucion.repository';
import { InstitucionesController } from './http/instituciones.controller';
import { UnidadDeTrabajoInstitucionalPg } from './persistencia/unidad-de-trabajo.pg';

import { DocentesController } from './http/docentes.controller';
import { CargarSesionJuego } from '../application/cargar-sesion-juego';
import { VerHistorialSesiones } from '../application/ver-historial-sesiones';
import { VerMisJuegosAsignados } from '../application/ver-mis-juegos-asignados';

/** BC Institucional (CU-23 … CU-33). Composición propia: no reutiliza la UoW de Identidad (ADR-002). */
@Module({
  controllers: [InstitucionesController, DocentesController],
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
    {
      provide: CargarSesionJuego,
      useFactory: (uow: UnidadDeTrabajoInstitucional): CargarSesionJuego =>
        new CargarSesionJuego(uow),
      inject: [UOW_INSTITUCIONAL],
    },
    {
      provide: VerHistorialSesiones,
      useFactory: (uow: UnidadDeTrabajoInstitucional): VerHistorialSesiones =>
        new VerHistorialSesiones(uow),
      inject: [UOW_INSTITUCIONAL],
    },
    {
      provide: VerReporteInstitucional,
      useFactory: (uow: UnidadDeTrabajoInstitucional): VerReporteInstitucional =>
        new VerReporteInstitucional(uow),
      inject: [UOW_INSTITUCIONAL],
    },
    {
      provide: VerDetalleReporteJuego,
      useFactory: (uow: UnidadDeTrabajoInstitucional): VerDetalleReporteJuego =>
        new VerDetalleReporteJuego(uow),
      inject: [UOW_INSTITUCIONAL],
    },
    {
      provide: VerDetalleReporteDocente,
      useFactory: (uow: UnidadDeTrabajoInstitucional): VerDetalleReporteDocente =>
        new VerDetalleReporteDocente(uow),
      inject: [UOW_INSTITUCIONAL],
    },
    {
      provide: ExportarReporte,
      useFactory: (uow: UnidadDeTrabajoInstitucional): ExportarReporte =>
        new ExportarReporte(uow),
      inject: [UOW_INSTITUCIONAL],
    },
    {
      provide: VerDashboardPedagogico,
      useFactory: (uow: UnidadDeTrabajoInstitucional): VerDashboardPedagogico =>
        new VerDashboardPedagogico(uow),
      inject: [UOW_INSTITUCIONAL],
    },
    {
      provide: VerMiInstitucion,
      useFactory: (uow: UnidadDeTrabajoInstitucional): VerMiInstitucion => new VerMiInstitucion(uow),
      inject: [UOW_INSTITUCIONAL],
    },
    {
      provide: VerMisJuegosAsignados,
      useFactory: (uow: UnidadDeTrabajoInstitucional): VerMisJuegosAsignados =>
        new VerMisJuegosAsignados(uow),
      inject: [UOW_INSTITUCIONAL],
    },
  ],
})
export class InstitucionalModule {}

