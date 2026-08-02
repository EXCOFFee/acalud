import type { Pool } from 'pg';
import type {
  ReposInstitucional,
  UnidadDeTrabajoInstitucional,
} from '../../domain/ports/institucion.repository';
import {
  AsignacionRepositoryPg,
  NotificacionesInstitucionalPg,
  OutboxInstitucionalPg,
} from './asignacion.repository.pg';
import { DocentesRepositoryPg } from './docentes.repository.pg';
import { AuditoriaInstitucionalPg, InstitucionRepositoryPg } from './institucion.repository.pg';
import { InventarioRepositoryPg } from './inventario.repository.pg';

/**
 * Unit of Work del BC Institucional. Propia del módulo por la regla de fronteras (ADR-002):
 * compartir una con Identidad obligaría a cada contexto a conocer el interior del otro.
 */
export class UnidadDeTrabajoInstitucionalPg implements UnidadDeTrabajoInstitucional {
  constructor(private readonly pool: Pool) {}

  async transaccion<T>(fn: (repos: ReposInstitucional) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const resultado = await fn({
        instituciones: new InstitucionRepositoryPg(client),
        inventario: new InventarioRepositoryPg(client),
        asignaciones: new AsignacionRepositoryPg(client),
        docentes: new DocentesRepositoryPg(client),
        notificaciones: new NotificacionesInstitucionalPg(client),
        outbox: new OutboxInstitucionalPg(client),
        auditoria: new AuditoriaInstitucionalPg(client),
      });
      await client.query('COMMIT');
      return resultado;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
