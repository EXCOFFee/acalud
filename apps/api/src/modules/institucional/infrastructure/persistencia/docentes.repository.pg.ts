import type { PoolClient } from 'pg';
import type {
  AsignacionDeDocente,
  DetalleAsignacion,
  DetalleDocente,
  DocenteConAsignaciones,
  DocentesRepository,
  FiltroDocentes,
  ResumenDocentes,
} from '../../domain/ports/docentes.repository';

const COLUMNA_ORDEN: Record<NonNullable<FiltroDocentes['orden']>, string> = {
  total_licencias: 'total_licencias',
  nombre: 'u.full_name',
};

export class DocentesRepositoryPg implements DocentesRepository {
  constructor(private readonly client: PoolClient) {}

  async listar(institucionId: string, filtro: FiltroDocentes): Promise<DocenteConAsignaciones[]> {
    const params: unknown[] = [institucionId];
    let condicionProducto = '';
    if (filtro.productoId !== undefined) {
      params.push(filtro.productoId);
      condicionProducto = `AND EXISTS (
        SELECT 1 FROM institutional_assignments a2
         WHERE a2.institutional_teacher_id = it.id AND a2.product_id = $${params.length}
           AND a2.status = 'active'
      )`;
    }
    let condicionBusqueda = '';
    if (filtro.buscar !== undefined && filtro.buscar.trim() !== '') {
      params.push(`%${filtro.buscar.trim()}%`);
      condicionBusqueda = `AND u.full_name ILIKE $${params.length}`;
    }
    const columna = COLUMNA_ORDEN[filtro.orden ?? 'nombre'];
    const direccion = filtro.direccion === 'desc' ? 'DESC' : 'ASC';

    // RN-002: TODOS los docentes vinculados activos, también sin asignaciones (LEFT JOIN).
    const r = await this.client.query<{
      user_id: string;
      full_name: string;
      email: string;
      total_licencias: number;
      ultima_asignacion_en: Date | null;
    }>(
      `SELECT u.id AS user_id, u.full_name, u.email,
              COALESCE(SUM(a.quantity_assigned) FILTER (WHERE a.status = 'active'), 0)::int AS total_licencias,
              MAX(a.assigned_at) AS ultima_asignacion_en
         FROM institutional_teachers it
         JOIN users u ON u.id = it.user_id
         LEFT JOIN institutional_assignments a ON a.institutional_teacher_id = it.id
        WHERE it.institution_id = $1 AND it.status = 'active'
        ${condicionProducto}
        ${condicionBusqueda}
        GROUP BY u.id, u.full_name, u.email
        ORDER BY ${columna} ${direccion} NULLS LAST`,
      params,
    );

    const docentes: DocenteConAsignaciones[] = [];
    for (const fila of r.rows) {
      const asignaciones = await this.asignacionesDe(institucionId, fila.user_id, false);
      docentes.push({
        docenteId: fila.user_id,
        nombre: fila.full_name,
        email: fila.email,
        totalLicencias: fila.total_licencias,
        ultimaAsignacionEn: fila.ultima_asignacion_en,
        asignaciones,
      });
    }
    return docentes;
  }

  async resumen(institucionId: string): Promise<ResumenDocentes> {
    const totales = await this.client.query<{
      total_docentes: number;
      total_licencias: number;
    }>(
      `SELECT COUNT(DISTINCT it.id) FILTER (WHERE a.status = 'active')::int AS total_docentes,
              COALESCE(SUM(a.quantity_assigned) FILTER (WHERE a.status = 'active'), 0)::int AS total_licencias
         FROM institutional_teachers it
         LEFT JOIN institutional_assignments a ON a.institutional_teacher_id = it.id
        WHERE it.institution_id = $1 AND it.status = 'active'`,
      [institucionId],
    );

    // CU-28 p8: top de productos más asignados (activos).
    const top = await this.client.query<{ product_id: string; name: string; total: number }>(
      `SELECT p.id AS product_id, p.name, SUM(a.quantity_assigned)::int AS total
         FROM institutional_assignments a
         JOIN products p ON p.id = a.product_id
        WHERE a.institution_id = $1 AND a.status = 'active'
        GROUP BY p.id, p.name
        ORDER BY total DESC
        LIMIT 5`,
      [institucionId],
    );

    const fila = totales.rows[0]!;
    return {
      totalDocentesConAsignaciones: fila.total_docentes,
      totalLicenciasAsignadas: fila.total_licencias,
      productosMasAsignados: top.rows.map((p) => ({
        productoId: p.product_id,
        nombreProducto: p.name,
        total: p.total,
      })),
    };
  }

  async detalle(institucionId: string, docenteId: string): Promise<DetalleDocente | null> {
    const r = await this.client.query<{
      user_id: string;
      full_name: string;
      email: string;
      joined_at: Date | null;
    }>(
      `SELECT u.id AS user_id, u.full_name, u.email, it.joined_at
         FROM institutional_teachers it
         JOIN users u ON u.id = it.user_id
        WHERE it.institution_id = $1 AND it.user_id = $2 AND it.status = 'active'`,
      [institucionId, docenteId],
    );
    const fila = r.rows[0];
    if (!fila) return null; // A9: docente ajeno o desvinculado → 404

    // A9 / RN-007/RN-008: el detalle incluye TAMBIÉN las revocadas, con su autor y razón.
    const asignaciones = await this.asignacionesDe(institucionId, docenteId, true);
    return {
      docenteId: fila.user_id,
      nombre: fila.full_name,
      email: fila.email,
      vinculadoEn: fila.joined_at,
      asignaciones: asignaciones as DetalleAsignacion[],
    };
  }

  private async asignacionesDe(
    institucionId: string,
    docenteId: string,
    conRevocacion: boolean,
  ): Promise<AsignacionDeDocente[]> {
    const r = await this.client.query<{
      product_id: string;
      name: string;
      quantity_assigned: number;
      assigned_at: Date;
      assigned_by_name: string | null;
      status: 'active' | 'revoked';
      revoked_at: Date | null;
      revoked_by_name: string | null;
      revocation_reason: string | null;
    }>(
      `SELECT p.id AS product_id, p.name, a.quantity_assigned, a.assigned_at,
              ub.full_name AS assigned_by_name, a.status,
              a.revoked_at, ur.full_name AS revoked_by_name, a.revocation_reason
         FROM institutional_assignments a
         JOIN institutional_teachers it ON it.id = a.institutional_teacher_id
         JOIN products p ON p.id = a.product_id
         LEFT JOIN institutional_teachers tb ON tb.id = a.assigned_by
         LEFT JOIN users ub ON ub.id = tb.user_id
         LEFT JOIN institutional_teachers tr ON tr.id = a.revoked_by
         LEFT JOIN users ur ON ur.id = tr.user_id
        WHERE a.institution_id = $1 AND it.user_id = $2
        ORDER BY a.assigned_at DESC`,
      [institucionId, docenteId],
    );

    return r.rows.map((fila) => {
      const base: AsignacionDeDocente = {
        productoId: fila.product_id,
        nombreProducto: fila.name,
        cantidad: fila.quantity_assigned,
        asignadaEn: fila.assigned_at,
        asignadaPor: fila.assigned_by_name,
        estado: fila.status,
      };
      if (!conRevocacion) return base;
      const detalle: DetalleAsignacion = {
        ...base,
        revocadaEn: fila.revoked_at,
        revocadaPor: fila.revoked_by_name,
        razonRevocacion: fila.revocation_reason,
      };
      return detalle;
    });
  }

  async buscarMembresiaConJuegoAsignado(usuarioId: string, productoId: string): Promise<{ institucionId: string; docenteId: string } | null> {
    const r = await this.client.query<{ institution_id: string; id: string }>(
      `SELECT it.institution_id, it.id
         FROM institutional_teachers it
         JOIN institutional_assignments a ON a.institutional_teacher_id = it.id
        WHERE it.user_id = $1 
          AND it.status = 'active'
          AND a.product_id = $2
          AND a.status = 'active'
          AND a.quantity_assigned > 0
        LIMIT 1`,
      [usuarioId, productoId]
    );
    if (r.rows.length === 0) return null;
    return {
      institucionId: r.rows[0]!.institution_id,
      docenteId: r.rows[0]!.id,
    };
  }
}
