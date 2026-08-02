import type { PoolClient } from 'pg';
import type { ProductosAdminRepository } from '../../domain/ports/productos-admin.repository';
import type { DatosProducto, ProductoAdmin } from '../../domain/producto-admin';

interface FilaProducto {
  id: string;
  name: string;
  description: string;
  price: string;
  stock: number;
  is_own_brand: boolean;
  external_url: string | null;
  category_id: string | null;
  wholesale_threshold: number | null;
  wholesale_discount_percent: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// `numeric` vuelve como string desde `pg`: se convierte acá, en el borde de persistencia.
function aProductoAdmin(fila: FilaProducto): ProductoAdmin {
  return {
    id: fila.id,
    name: fila.name,
    description: fila.description,
    price: Number(fila.price),
    stock: fila.stock,
    isOwnBrand: fila.is_own_brand,
    externalUrl: fila.external_url,
    categoryId: fila.category_id,
    wholesaleThreshold: fila.wholesale_threshold,
    wholesaleDiscountPercent:
      fila.wholesale_discount_percent === null ? null : Number(fila.wholesale_discount_percent),
    imageUrl: fila.image_url,
    isActive: fila.is_active,
    createdAt: fila.created_at,
    updatedAt: fila.updated_at,
  };
}

export class ProductosAdminRepositoryPg implements ProductosAdminRepository {
  constructor(private readonly client: PoolClient) {}

  async existeCategoria(categoriaId: string): Promise<boolean> {
    const r = await this.client.query('SELECT 1 FROM categories WHERE id = $1', [categoriaId]);
    return r.rowCount !== null && r.rowCount > 0;
  }

  async crear(datos: DatosProducto): Promise<ProductoAdmin> {
    // is_active se fija en true: CU-19 no tiene un paso de "publicar" aparte del alta; A2 es la
    // única baja/desactivación contemplada.
    const r = await this.client.query<FilaProducto>(
      `INSERT INTO products
         (name, description, price, stock, is_own_brand, external_url, category_id,
          wholesale_threshold, wholesale_discount_percent, image_url, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
       RETURNING *`,
      [
        datos.name,
        datos.description,
        datos.price,
        datos.stock,
        datos.isOwnBrand,
        datos.externalUrl,
        datos.categoryId,
        datos.wholesaleThreshold,
        datos.wholesaleDiscountPercent,
        datos.imageUrl,
      ],
    );
    return aProductoAdmin(r.rows[0]!);
  }

  async actualizar(id: string, datos: DatosProducto): Promise<ProductoAdmin | null> {
    const r = await this.client.query<FilaProducto>(
      `UPDATE products SET
         name = $2, description = $3, price = $4, stock = $5, is_own_brand = $6,
         external_url = $7, category_id = $8, wholesale_threshold = $9,
         wholesale_discount_percent = $10, image_url = $11
       WHERE id = $1
       RETURNING *`,
      [
        id,
        datos.name,
        datos.description,
        datos.price,
        datos.stock,
        datos.isOwnBrand,
        datos.externalUrl,
        datos.categoryId,
        datos.wholesaleThreshold,
        datos.wholesaleDiscountPercent,
        datos.imageUrl,
      ],
    );
    return r.rows[0] ? aProductoAdmin(r.rows[0]) : null;
  }

  async desactivar(id: string): Promise<ProductoAdmin | null> {
    const r = await this.client.query<FilaProducto>(
      `UPDATE products SET is_active = false WHERE id = $1 RETURNING *`,
      [id],
    );
    return r.rows[0] ? aProductoAdmin(r.rows[0]) : null;
  }
}
