import type { Pool, PoolClient } from 'pg';
import type {
  DemoResumen,
  FiltroCatalogo,
  JuegoDetalle,
  PaginaJuegos,
  RecursoResumen,
  Tramo,
} from '../../domain/juego';
import type { CatalogoRepository } from '../../domain/ports/catalogo.repository';

type Ejecutor = Pool | PoolClient;

interface FilaResumen {
  id: string;
  nombre: string;
  precio_lista: number;
  area: string | null;
  imagen_url: string | null;
  tiene_demo_publica: boolean;
}

// Filtros compartidos por el listado y el conteo (mismos $1 q, $2 area). El objetivo no tiene
// borrado lógico: la baja se refleja en is_active. El área es ahora la categoría del producto.
const FILTROS = `p.is_active = true
  AND ($1::text IS NULL OR p.name ILIKE '%' || $1 || '%')
  AND ($2::text IS NULL OR c.name = $2)`;

const RESUMEN = `p.id, p.name AS nombre, p.price::float8 AS precio_lista,
  c.name AS area, p.image_url AS imagen_url,
  EXISTS (SELECT 1 FROM demos d WHERE d.product_id = p.id) AS tiene_demo_publica`;

const DESDE = `FROM products p LEFT JOIN categories c ON c.id = p.category_id`;

export class CatalogoRepositoryPg implements CatalogoRepository {
  constructor(private readonly db: Ejecutor) {}

  async listarPublicados(f: FiltroCatalogo): Promise<PaginaJuegos> {
    const offset = (f.pagina - 1) * f.tamanio;
    const datos = await this.db.query<FilaResumen>(
      `SELECT ${RESUMEN} ${DESDE} WHERE ${FILTROS} ORDER BY p.name LIMIT $3 OFFSET $4`,
      [f.q ?? null, f.area ?? null, f.tamanio, offset],
    );
    const total = await this.db.query<{ total: number }>(
      `SELECT count(*)::int AS total ${DESDE} WHERE ${FILTROS}`,
      [f.q ?? null, f.area ?? null],
    );
    return { datos: datos.rows, total: total.rows[0]?.total ?? 0 };
  }

  async verPublicado(id: string): Promise<JuegoDetalle | null> {
    const j = await this.db.query<
      FilaResumen & {
        descripcion: string;
        peso_gramos: number | null;
        stock_disponible: boolean;
        tramo_minimo: number | null;
        tramo_descuento: number | null;
      }
    >(
      `SELECT ${RESUMEN},
              p.description AS descripcion, p.weight_grams AS peso_gramos,
              (p.stock > 0) AS stock_disponible,
              p.wholesale_threshold AS tramo_minimo,
              p.wholesale_discount_percent::float8 AS tramo_descuento
         ${DESDE}
        WHERE p.id = $1 AND p.is_active = true`,
      [id],
    );
    const fila = j.rows[0];
    if (!fila) return null;

    // El objetivo guarda una demo por producto, con su configuración en jsonb.
    const demos = await this.db.query<{ config_json: { tipo?: string; formato?: string } }>(
      `SELECT config_json FROM demos WHERE product_id = $1`,
      [id],
    );
    const recursos = await this.db.query<{ id: string; title: string; is_licensed: boolean }>(
      `SELECT id, title, is_licensed FROM resources WHERE product_id = $1 ORDER BY title`,
      [id],
    );

    const demosMapeadas: DemoResumen[] = demos.rows.map((d) => ({
      tipo: (d.config_json.tipo ?? 'publica') as DemoResumen['tipo'],
      formato: (d.config_json.formato ?? 'html5') as DemoResumen['formato'],
    }));

    const recursosMapeados: RecursoResumen[] = recursos.rows.map((r) => ({
      id: r.id,
      nombre: r.title,
      tipo: r.is_licensed ? 'licenciado' : 'libre',
      desbloqueado: !r.is_licensed, // el derecho real (CU-09) llega en la Etapa 2
    }));

    // Δ2 · un solo tramo de descuento, en columnas del producto (CU-10/CU-22).
    const tramos: Tramo[] =
      fila.tramo_minimo !== null && fila.tramo_descuento !== null
        ? [{ cantidad_minima: fila.tramo_minimo, descuento_pct: fila.tramo_descuento }]
        : [];

    return {
      id: fila.id,
      nombre: fila.nombre,
      precio_lista: fila.precio_lista,
      area: fila.area,
      imagen_url: fila.imagen_url,
      tiene_demo_publica: fila.tiene_demo_publica,
      descripcion: fila.descripcion,
      peso_gramos: fila.peso_gramos,
      stock_disponible: fila.stock_disponible,
      imagenes: fila.imagen_url !== null ? [fila.imagen_url] : [],
      demos: demosMapeadas,
      recursos: recursosMapeados,
      tramos,
    };
  }
}
