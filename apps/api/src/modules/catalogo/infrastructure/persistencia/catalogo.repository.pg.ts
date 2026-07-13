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
  edad_objetivo: string | null;
  imagen_url: string | null;
  tiene_demo_publica: boolean;
}

// Filtros compartidos por el listado y el conteo (mismos $1 q, $2 area).
const FILTROS = `j.publicado = true AND j.eliminado_en IS NULL
  AND ($1::text IS NULL OR j.nombre ILIKE '%' || $1 || '%')
  AND ($2::text IS NULL OR j.area = $2)`;

const RESUMEN = `j.id, j.nombre, j.precio_lista::float8 AS precio_lista, j.area, j.edad_objetivo,
  j.imagenes->>0 AS imagen_url,
  EXISTS (SELECT 1 FROM demos d WHERE d.juego_id = j.id AND d.tipo = 'publica') AS tiene_demo_publica`;

export class CatalogoRepositoryPg implements CatalogoRepository {
  constructor(private readonly db: Ejecutor) {}

  async listarPublicados(f: FiltroCatalogo): Promise<PaginaJuegos> {
    const offset = (f.pagina - 1) * f.tamanio;
    const datos = await this.db.query<FilaResumen>(
      `SELECT ${RESUMEN} FROM juegos j WHERE ${FILTROS} ORDER BY j.nombre LIMIT $3 OFFSET $4`,
      [f.q ?? null, f.area ?? null, f.tamanio, offset],
    );
    const total = await this.db.query<{ total: number }>(
      `SELECT count(*)::int AS total FROM juegos j WHERE ${FILTROS}`,
      [f.q ?? null, f.area ?? null],
    );
    return { datos: datos.rows, total: total.rows[0]?.total ?? 0 };
  }

  async verPublicado(id: string): Promise<JuegoDetalle | null> {
    const j = await this.db.query<
      FilaResumen & {
        descripcion: string;
        peso_gramos: number;
        stock_disponible: boolean;
        imagenes: string[];
      }
    >(
      `SELECT ${RESUMEN},
              j.descripcion, j.peso_gramos, (j.stock_actual > 0) AS stock_disponible,
              ARRAY(SELECT jsonb_array_elements_text(j.imagenes)) AS imagenes
         FROM juegos j
        WHERE j.id = $1 AND j.publicado = true AND j.eliminado_en IS NULL`,
      [id],
    );
    const fila = j.rows[0];
    if (!fila) return null;

    const demos = await this.db.query<DemoResumen>(
      `SELECT tipo, formato FROM demos WHERE juego_id = $1 ORDER BY tipo`,
      [id],
    );
    const recursos = await this.db.query<{ id: string; nombre: string; tipo: 'libre' | 'licenciado' }>(
      `SELECT id, nombre, tipo FROM recursos WHERE juego_id = $1 AND eliminado_en IS NULL ORDER BY nombre`,
      [id],
    );
    const tramos = await this.db.query<Tramo>(
      `SELECT cantidad_minima, descuento_pct FROM tramos_descuento WHERE juego_id = $1 ORDER BY cantidad_minima`,
      [id],
    );

    const recursosMapeados: RecursoResumen[] = recursos.rows.map((r) => ({
      id: r.id,
      nombre: r.nombre,
      tipo: r.tipo,
      desbloqueado: r.tipo === 'libre', // el derecho real de los licenciados (CU-009) llega en Etapa 2
    }));

    return {
      id: fila.id,
      nombre: fila.nombre,
      precio_lista: fila.precio_lista,
      area: fila.area,
      edad_objetivo: fila.edad_objetivo,
      imagen_url: fila.imagen_url,
      tiene_demo_publica: fila.tiene_demo_publica,
      descripcion: fila.descripcion,
      peso_gramos: fila.peso_gramos,
      stock_disponible: fila.stock_disponible,
      imagenes: fila.imagenes,
      demos: demos.rows,
      recursos: recursosMapeados,
      tramos: tramos.rows,
    };
  }
}
