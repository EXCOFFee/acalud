import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../../platform/db/pg.module';
import type { EditorialesRepository } from '../../domain/ports/editoriales.repository';
import type { EditorialDetalle, EditorialResumen, FiltroEditoriales } from '../../domain/editorial';

interface FilaEditorial {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  external_website_url: string | null;
  category: string | null;
}

@Injectable()
export class EditorialesRepositoryPg implements EditorialesRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async listar(filtro: FiltroEditoriales): Promise<EditorialResumen[]> {
    const r = await this.pool.query<FilaEditorial>(
      `SELECT id, name, logo_url, description, external_website_url, category
         FROM editorial_partners
        WHERE is_active = true
          AND ($1::text IS NULL OR category = $1)
        ORDER BY name`,
      [filtro.category ?? null],
    );
    return r.rows.map((f) => ({
      id: f.id,
      name: f.name,
      logoUrl: f.logo_url,
      description: f.description,
      externalWebsiteUrl: f.external_website_url,
    }));
  }

  async obtener(id: string, usuarioId: string | null): Promise<EditorialDetalle | null> {
    const r = await this.pool.query<FilaEditorial>(
      `SELECT id, name, logo_url, description, external_website_url, category
         FROM editorial_partners
        WHERE id = $1 AND is_active = true`,
      [id],
    );
    const fila = r.rows[0];
    if (!fila) return null;

    // RN-006: cada visualización del detalle se registra.
    await this.pool.query(
      `INSERT INTO audit_log (action, entity_type, entity_id, actor_user_id, new_values)
       VALUES ('editorial_partner_viewed', 'editorial_partner', $1, $2, $3::jsonb)`,
      [id, usuarioId, JSON.stringify({ partner_id: id })],
    );

    return {
      id: fila.id,
      name: fila.name,
      logoUrl: fila.logo_url,
      description: fila.description,
      externalWebsiteUrl: fila.external_website_url,
      category: fila.category,
    };
  }

  async registrarClick(id: string, usuarioId: string | null): Promise<boolean> {
    const r = await this.pool.query('SELECT 1 FROM editorial_partners WHERE id = $1 AND is_active = true', [id]);
    if (r.rowCount === 0) return false;

    // RN-007: distingue anónimo de registrado en el propio evento (A1 vs A2).
    const accion = usuarioId ? 'editorial_partner_clicked' : 'editorial_partner_clicked_anonymous';
    await this.pool.query(
      `INSERT INTO audit_log (action, entity_type, entity_id, actor_user_id, new_values)
       VALUES ($1, 'editorial_partner', $2, $3, $4::jsonb)`,
      [accion, id, usuarioId, JSON.stringify({ partner_id: id })],
    );
    return true;
  }
}
