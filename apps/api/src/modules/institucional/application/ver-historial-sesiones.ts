import type { UnidadDeTrabajoInstitucional } from '../domain/ports/institucion.repository';
import type { DetalleSesion, FiltroSesiones, HistorialSesion, ResultadoPaginado } from '../domain/ports/sesiones.repository';
import { DocenteNoVinculado, SesionNoEncontrada } from '../domain/errores';

/**
 * CU-30 · Ver mis sesiones cargadas (docente).
 *
 * El repositorio recibe el `usuarioId` (no el id de la membresía) y resuelve con un JOIN a
 * `institutional_teachers` cuáles son las sesiones propias. Así no depende de que el usuario
 * tenga una sola membresía activa (hoy CU-23 A1 lo garantiza, pero la consulta no lo asume).
 */
export class VerHistorialSesiones {
  constructor(private readonly uow: UnidadDeTrabajoInstitucional) {}

  async ejecutar(usuarioId: string, filtro: FiltroSesiones): Promise<ResultadoPaginado<HistorialSesion>> {
    return await this.uow.transaccion(async (repos) => {
      // Sin vinculación institucional no hay sesiones posibles: 422, no una lista vacía engañosa.
      if (!(await repos.instituciones.estaVinculado(usuarioId))) throw new DocenteNoVinculado();
      return await repos.sesiones.listar(usuarioId, filtro);
    });
  }

  /** CU-30 A9: detalle completo de una sesión propia. */
  async detalle(usuarioId: string, sesionId: string): Promise<DetalleSesion> {
    return await this.uow.transaccion(async (repos) => {
      const detalle = await repos.sesiones.detalle(usuarioId, sesionId);
      if (detalle === null) throw new SesionNoEncontrada();
      return detalle;
    });
  }
}
