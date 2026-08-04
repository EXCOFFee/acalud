import type { PoolClient } from 'pg';
import type {
  FiltroProductosAdmin,
  PaginaProductosAdmin,
  ProductosAdminRepository,
} from '../../domain/ports/productos-admin.repository';
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

  async existeProducto(id: string): Promise<boolean> {
    const r = await this.client.query('SELECT 1 FROM products WHERE id = $1', [id]);
    return r.rowCount !== null && r.rowCount > 0;
  }

  async buscarPorId(id: string): Promise<ProductoAdmin | null> {
    const r = await this.client.query<FilaProducto>('SELECT * FROM products WHERE id = $1', [id]);
    return r.rows[0] ? aProductoAdmin(r.rows[0]) : null;
  }

  // p4: incluye inactivos (a diferencia del catálogo público) — el admin necesita verlos para
  // poder reactivarlos vía edición.
  async listar(filtro: FiltroProductosAdmin): Promise<PaginaProductosAdmin> {
    const offset = (filtro.pagina - 1) * filtro.tamanio;
    const datos = await this.client.query<{
      id: string;
      name: string;
      price: string;
      stock: number;
      is_active: boolean;
      tiene_demo: boolean;
      wholesale_threshold: number | null;
      wholesale_discount_percent: string | null;
      tiene_ordenes: boolean;
    }>(
      // CU-22 A8/RNF-005 (config mayorista) y A11 (advertencia si ya tiene órdenes).
      `SELECT p.id, p.name, p.price, p.stock, p.is_active,
              p.wholesale_threshold, p.wholesale_discount_percent,
              EXISTS (SELECT 1 FROM demos d WHERE d.product_id = p.id) AS tiene_demo,
              EXISTS (SELECT 1 FROM order_items oi WHERE oi.product_id = p.id) AS tiene_ordenes
         FROM products p
        WHERE ($1::text IS NULL OR p.name ILIKE '%' || $1 || '%')
        ORDER BY p.name
        LIMIT $2 OFFSET $3`,
      [filtro.q ?? null, filtro.tamanio, offset],
    );
    const total = await this.client.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM products p
        WHERE ($1::text IS NULL OR p.name ILIKE '%' || $1 || '%')`,
      [filtro.q ?? null],
    );
    return {
      datos: datos.rows.map((f) => ({
        id: f.id,
        name: f.name,
        price: Number(f.price),
        stock: f.stock,
        isActive: f.is_active,
        tieneDemo: f.tiene_demo,
        wholesaleThreshold: f.wholesale_threshold,
        wholesaleDiscountPercent:
          f.wholesale_discount_percent === null ? null : Number(f.wholesale_discount_percent),
        tieneOrdenes: f.tiene_ordenes,
      })),
      total: total.rows[0]?.total ?? 0,
    };
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
