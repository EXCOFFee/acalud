import type { PoolClient } from 'pg';
import { NombreCategoriaDuplicado } from '../../domain/errores';
import type { CategoriasAdminRepository } from '../../domain/ports/categorias-admin.repository';
import type { CategoriaAdmin } from '../../domain/categoria-admin';

const PG_VIOLACION_UNICIDAD = '23505';
const UQ_NOMBRE = 'categories_name_key';

export class CategoriasAdminRepositoryPg implements CategoriasAdminRepository {
  constructor(private readonly client: PoolClient) {}

  async listar(): Promise<CategoriaAdmin[]> {
    const r = await this.client.query<CategoriaAdmin>(
      `SELECT id, name FROM categories ORDER BY name`,
    );
    return r.rows;
  }

  async crear(nombre: string): Promise<CategoriaAdmin> {
    try {
      const r = await this.client.query<CategoriaAdmin>(
        `INSERT INTO categories (name) VALUES ($1) RETURNING id, name`,
        [nombre],
      );
      return r.rows[0]!;
    } catch (e) {
      throw this.mapearError(e);
    }
  }

  async actualizar(id: string, nombre: string): Promise<CategoriaAdmin | null> {
    try {
      const r = await this.client.query<CategoriaAdmin>(
        `UPDATE categories SET name = $2 WHERE id = $1 RETURNING id, name`,
        [id, nombre],
      );
      return r.rows[0] ?? null;
    } catch (e) {
      throw this.mapearError(e);
    }
  }

  async eliminar(id: string): Promise<boolean> {
    const r = await this.client.query(`DELETE FROM categories WHERE id = $1`, [id]);
    return (r.rowCount ?? 0) > 0;
  }

  private mapearError(e: unknown): unknown {
    const err = e as { code?: string; constraint?: string };
    if (err.code === PG_VIOLACION_UNICIDAD && err.constraint === UQ_NOMBRE) {
      return new NombreCategoriaDuplicado(); // A7.5
    }
    return e;
  }
}
