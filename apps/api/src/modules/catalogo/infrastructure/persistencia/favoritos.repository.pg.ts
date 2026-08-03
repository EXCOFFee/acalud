import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../../platform/db/pg.module';
import { FavoritoDuplicado } from '../../domain/errores';
import type { FavoritosRepository } from '../../domain/ports/favoritos.repository';
import type { DatosFavorito, Favorito, FavoritoResumen, TipoFavorito } from '../../domain/favorito';

const PG_VIOLACION_UNICIDAD = '23505';
const INDICES_DUPLICADO = ['uq_favorite_product', 'uq_favorite_resource', 'uq_favorite_partner'];

interface FilaFavorito {
  id: string;
  user_id: string;
  product_id: string | null;
  resource_id: string | null;
  editorial_partner_id: string | null;
  created_at: Date;
}

function aFavorito(fila: FilaFavorito): Favorito {
  return {
    id: fila.id,
    userId: fila.user_id,
    productId: fila.product_id,
    resourceId: fila.resource_id,
    editorialPartnerId: fila.editorial_partner_id,
    createdAt: fila.created_at,
  };
}

@Injectable()
export class FavoritosRepositoryPg implements FavoritosRepository {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async existeProducto(id: string): Promise<boolean> {
    const r = await this.pool.query('SELECT 1 FROM products WHERE id = $1', [id]);
    return r.rowCount !== null && r.rowCount > 0;
  }

  async existeRecurso(id: string): Promise<boolean> {
    const r = await this.pool.query('SELECT 1 FROM resources WHERE id = $1', [id]);
    return r.rowCount !== null && r.rowCount > 0;
  }

  async existeEditorial(id: string): Promise<boolean> {
    const r = await this.pool.query('SELECT 1 FROM editorial_partners WHERE id = $1', [id]);
    return r.rowCount !== null && r.rowCount > 0;
  }

  async crear(userId: string, datos: DatosFavorito): Promise<Favorito> {
    try {
      const r = await this.pool.query<FilaFavorito>(
        `INSERT INTO favorites (user_id, product_id, resource_id, editorial_partner_id)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, datos.productId, datos.resourceId, datos.editorialPartnerId],
      );
      return aFavorito(r.rows[0]!);
    } catch (e) {
      const err = e as { code?: string; constraint?: string };
      if (err.code === PG_VIOLACION_UNICIDAD && INDICES_DUPLICADO.includes(err.constraint ?? '')) {
        throw new FavoritoDuplicado(); // A2
      }
      throw e;
    }
  }

  async listarPropios(userId: string): Promise<FavoritoResumen[]> {
    const r = await this.pool.query<{
      id: string;
      product_id: string | null;
      resource_id: string | null;
      editorial_partner_id: string | null;
      titulo: string;
      created_at: Date;
    }>(
      `SELECT f.id, f.product_id, f.resource_id, f.editorial_partner_id,
              COALESCE(p.name, r.title, e.name) AS titulo, f.created_at
         FROM favorites f
         LEFT JOIN products p ON p.id = f.product_id
         LEFT JOIN resources r ON r.id = f.resource_id
         LEFT JOIN editorial_partners e ON e.id = f.editorial_partner_id
        WHERE f.user_id = $1
        ORDER BY f.created_at DESC`,
      [userId],
    );
    return r.rows.map((fila) => {
      const tipo: TipoFavorito = fila.product_id
        ? 'product'
        : fila.resource_id
          ? 'resource'
          : 'editorial_partner';
      const itemId = fila.product_id ?? fila.resource_id ?? fila.editorial_partner_id!;
      return { id: fila.id, tipo, itemId, titulo: fila.titulo, createdAt: fila.created_at };
    });
  }

  async eliminar(userId: string, favoritoId: string): Promise<boolean> {
    const r = await this.pool.query('DELETE FROM favorites WHERE id = $1 AND user_id = $2', [
      favoritoId,
      userId,
    ]);
    return (r.rowCount ?? 0) > 0;
  }
}
