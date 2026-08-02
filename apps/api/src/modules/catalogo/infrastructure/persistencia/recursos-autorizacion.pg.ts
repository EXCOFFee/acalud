import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../../platform/db/pg.module';
import type { RecursosAutorizacionPort } from '../../domain/ports/recursos-autorizacion.port';

@Injectable()
export class RecursosAutorizacionPg implements RecursosAutorizacionPort {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async tieneDerechoAlJuego(usuarioId: string, productoId: string): Promise<boolean> {
    // Verificamos en BC Compras (órdenes directas del usuario)
    const ordersRes = await this.pool.query(
      `SELECT 1 FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = $1 
         AND oi.product_id = $2
         AND o.status IN ('paid', 'shipped', 'delivered')
       LIMIT 1`,
      [usuarioId, productoId]
    );

    if (ordersRes.rows.length > 0) return true;

    // Verificamos en BC Institucional (asignaciones activas)
    const instRes = await this.pool.query(
      `SELECT 1 FROM institutional_teachers it
       JOIN institutional_assignments a ON a.institutional_teacher_id = it.id
       WHERE it.user_id = $1 
         AND it.status = 'active'
         AND a.product_id = $2
         AND a.status = 'active'
         AND a.quantity_assigned > 0
       LIMIT 1`,
      [usuarioId, productoId]
    );

    return instRes.rows.length > 0;
  }
}
