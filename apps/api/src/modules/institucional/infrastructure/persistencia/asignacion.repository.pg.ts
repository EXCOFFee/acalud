import type { PoolClient } from 'pg';
import { renderizar } from '../../../../platform/outbox/plantillas';
import type {
  AsignacionActiva,
  AsignacionRepository,
  DocenteDestino,
  NotificacionesInstitucional,
  NuevaAsignacion,
  OutboxInstitucional,
  ProductoEnInventario,
} from '../../domain/ports/asignacion.repository';

export class AsignacionRepositoryPg implements AsignacionRepository {
  constructor(private readonly client: PoolClient) {}

  async buscarEnInventario(
    institucionId: string,
    productoId: string,
  ): Promise<ProductoEnInventario | null> {
    const r = await this.client.query<{ name: string; disponibles: number }>(
      `SELECT p.name, (ii.quantity_purchased - ii.quantity_assigned) AS disponibles
         FROM institutional_inventories ii
         JOIN products p ON p.id = ii.product_id
        WHERE ii.institution_id = $1 AND ii.product_id = $2`,
      [institucionId, productoId],
    );
    const fila = r.rows[0];
    if (!fila) return null;
    return { nombreProducto: fila.name, disponibles: fila.disponibles };
  }

  async bloquearInventario(
    institucionId: string,
    productoId: string,
  ): Promise<ProductoEnInventario | null> {
    // FOR UPDATE: la fila del inventario es el mutex por (institución, producto) de CU-27.
    const r = await this.client.query<{ name: string; disponibles: number }>(
      `SELECT p.name, (ii.quantity_purchased - ii.quantity_assigned) AS disponibles
         FROM institutional_inventories ii
         JOIN products p ON p.id = ii.product_id
        WHERE ii.institution_id = $1 AND ii.product_id = $2
        FOR UPDATE OF ii`,
      [institucionId, productoId],
    );
    const fila = r.rows[0];
    if (!fila) return null;
    return { nombreProducto: fila.name, disponibles: fila.disponibles };
  }

  async buscarDocenteDestino(
    institucionId: string,
    usuarioId: string,
  ): Promise<DocenteDestino | null> {
    const r = await this.client.query<{
      id: string;
      user_id: string;
      full_name: string;
      email: string;
    }>(
      `SELECT it.id, it.user_id, u.full_name, u.email
         FROM institutional_teachers it
         JOIN users u ON u.id = it.user_id
        WHERE it.institution_id = $1 AND it.user_id = $2 AND it.status = 'active'`,
      [institucionId, usuarioId],
    );
    const fila = r.rows[0];
    if (!fila) return null;
    return {
      membresiaId: fila.id,
      usuarioId: fila.user_id,
      nombre: fila.full_name,
      email: fila.email,
    };
  }

  async crear(datos: NuevaAsignacion): Promise<string> {
    const r = await this.client.query<{ id: string }>(
      `INSERT INTO institutional_assignments
         (institution_id, institutional_teacher_id, product_id, quantity_assigned,
          status, assigned_by, notes)
       VALUES ($1, $2, $3, $4, 'active', $5, $6)
       RETURNING id`,
      [
        datos.institucionId,
        datos.membresiaDocenteId,
        datos.productoId,
        datos.cantidad,
        datos.asignadaPorMembresiaId,
        datos.observaciones,
      ],
    );
    return r.rows[0]!.id;
  }

  async incrementarAsignado(
    institucionId: string,
    productoId: string,
    cantidad: number,
  ): Promise<boolean> {
    // El guard va en el WHERE (CU-26 RN-005): la disponibilidad la decide la base, no una
    // lectura previa que otra transacción puede invalidar. El CHECK `assigned <= purchased`
    // de la tabla es la última red, pero acá el resultado es un 422 y no un 500.
    const r = await this.client.query(
      `UPDATE institutional_inventories
          SET quantity_assigned = quantity_assigned + $3
        WHERE institution_id = $1
          AND product_id = $2
          AND quantity_purchased - quantity_assigned >= $3`,
      [institucionId, productoId, cantidad],
    );
    return r.rowCount === 1;
  }

  async listarActivas(
    institucionId: string,
    membresiaDocenteId: string,
    productoId: string,
  ): Promise<AsignacionActiva[]> {
    const r = await this.client.query<{ id: string; cantidad: number }>(
      // FIFO (CU-27: se revoca sobre la más antigua primero). La fila del inventario ya está
      // bloqueada por `bloquearInventario`, así que este conjunto es estable en la transacción.
      `SELECT id, quantity_assigned AS cantidad
         FROM institutional_assignments
        WHERE institution_id = $1
          AND institutional_teacher_id = $2
          AND product_id = $3
          AND status = 'active'
        ORDER BY assigned_at ASC, id ASC`,
      [institucionId, membresiaDocenteId, productoId],
    );
    return r.rows.map((fila) => ({ id: fila.id, cantidad: fila.cantidad }));
  }

  async aplicarRevocacion(revocacion: {
    asignacionId: string;
    nuevaCantidad: number;
    revocadaPorMembresiaId: string;
    razon: string | null;
  }): Promise<void> {
    // nuevaCantidad > 0 → A9 (queda activa con el resto); = 0 → A10 (revocada, nunca borrada:
    // CU-28 RN-007/RN-008). La fila revocada CONSERVA su quantity_assigned: el CHECK exige
    // > 0 y el historial tiene que mostrar cuánto tenía asignado. Lo "activo" se computa
    // sólo sobre status='active'. El CHECK revocation_consistency exige fecha y autor.
    await this.client.query(
      `UPDATE institutional_assignments
          SET quantity_assigned = CASE WHEN $2 > 0 THEN $2 ELSE quantity_assigned END,
              status = CASE WHEN $2 = 0 THEN 'revoked'::assignment_status ELSE status END,
              revoked_at = CASE WHEN $2 = 0 THEN now() END,
              revoked_by = CASE WHEN $2 = 0 THEN $3::uuid END,
              revocation_reason = CASE WHEN $2 = 0 THEN $4 END
        WHERE id = $1 AND status = 'active'`,
      [
        revocacion.asignacionId,
        revocacion.nuevaCantidad,
        revocacion.revocadaPorMembresiaId,
        revocacion.razon,
      ],
    );
  }

  async descontarAsignado(
    institucionId: string,
    productoId: string,
    cantidad: number,
  ): Promise<void> {
    // CU-27 RN-004. La fila ya está bloqueada por `bloquearInventario`; el CHECK
    // quantity_assigned >= 0 es la última red.
    await this.client.query(
      `UPDATE institutional_inventories
          SET quantity_assigned = quantity_assigned - $3
        WHERE institution_id = $1 AND product_id = $2`,
      [institucionId, productoId, cantidad],
    );
  }
}

/** Notificaciones por dashboard del BC Institucional (CU-26 RN-008). */
export class NotificacionesInstitucionalPg implements NotificacionesInstitucional {
  constructor(private readonly client: PoolClient) {}

  async crear(notificacion: {
    destinatarioId: string;
    tipo: string;
    titulo: string;
    mensaje: string;
    entidadTipo: string;
    entidadId: string;
  }): Promise<void> {
    await this.client.query(
      `INSERT INTO notifications
         (recipient_user_id, type, title, message, related_entity_type, related_entity_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        notificacion.destinatarioId,
        notificacion.tipo,
        notificacion.titulo,
        notificacion.mensaje,
        notificacion.entidadTipo,
        notificacion.entidadId,
      ],
    );
  }
}

/** Cola de emails del BC Institucional. El mensaje se guarda YA renderizado, como en los demás. */
export class OutboxInstitucionalPg implements OutboxInstitucional {
  constructor(private readonly client: PoolClient) {}

  async encolar(email: {
    tipo: string;
    destinatario: string;
    payload: Record<string, unknown>;
  }): Promise<void> {
    const plantilla = renderizar(email.tipo, email.payload);
    if (plantilla === null) throw new Error(`tipo de email sin plantilla: ${email.tipo}`);

    await this.client.query(
      `INSERT INTO outbox_emails (template, recipient, subject, body)
       VALUES ($1, $2, $3, $4)`,
      [email.tipo, email.destinatario, plantilla.asunto, plantilla.html],
    );
  }
}
