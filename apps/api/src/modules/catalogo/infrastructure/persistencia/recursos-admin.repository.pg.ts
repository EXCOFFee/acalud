import type { PoolClient } from 'pg';
import type { RecursosAdminRepository } from '../../domain/ports/recursos-admin.repository';
import type { DatosRecurso, RecursoAdmin } from '../../domain/recurso-admin';

interface FilaRecurso {
  id: string;
  product_id: string | null;
  title: string;
  type: 'pdf' | 'link';
  url: string;
  is_licensed: boolean;
}

function aRecursoAdmin(fila: FilaRecurso): RecursoAdmin {
  return {
    id: fila.id,
    productId: fila.product_id,
    title: fila.title,
    type: fila.type,
    url: fila.url,
    isLicensed: fila.is_licensed,
  };
}

export class RecursosAdminRepositoryPg implements RecursosAdminRepository {
  constructor(private readonly client: PoolClient) {}

  async listar(): Promise<RecursoAdmin[]> {
    const r = await this.client.query<FilaRecurso>(
      `SELECT id, product_id, title, type, url, is_licensed FROM resources ORDER BY title`,
    );
    return r.rows.map(aRecursoAdmin);
  }

  async crear(datos: DatosRecurso): Promise<RecursoAdmin> {
    const r = await this.client.query<FilaRecurso>(
      `INSERT INTO resources (product_id, title, type, url, is_licensed)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, product_id, title, type, url, is_licensed`,
      [datos.productId, datos.title, datos.type, datos.url, datos.isLicensed],
    );
    return aRecursoAdmin(r.rows[0]!);
  }

  async actualizar(id: string, datos: DatosRecurso): Promise<RecursoAdmin | null> {
    const r = await this.client.query<FilaRecurso>(
      `UPDATE resources SET product_id = $2, title = $3, type = $4, url = $5, is_licensed = $6
       WHERE id = $1
       RETURNING id, product_id, title, type, url, is_licensed`,
      [id, datos.productId, datos.title, datos.type, datos.url, datos.isLicensed],
    );
    return r.rows[0] ? aRecursoAdmin(r.rows[0]) : null;
  }

  async eliminar(id: string): Promise<boolean> {
    const r = await this.client.query(`DELETE FROM resources WHERE id = $1`, [id]);
    return (r.rowCount ?? 0) > 0;
  }
}
