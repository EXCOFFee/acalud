import type { Pool } from 'pg';
import type { CatalogoItem, CatalogoPedagogicoRepository } from '../../domain/ports/catalogo-pedagogico.repository';

export class CatalogoPedagogicoRepositoryPg implements CatalogoPedagogicoRepository {
  constructor(private readonly pool: Pool) {}

  async listarNiveles(): Promise<CatalogoItem[]> {
    const r = await this.pool.query<CatalogoItem>('SELECT id, name FROM levels ORDER BY name');
    return r.rows;
  }

  async listarMaterias(): Promise<CatalogoItem[]> {
    const r = await this.pool.query<CatalogoItem>('SELECT id, name FROM subjects ORDER BY name');
    return r.rows;
  }
}
