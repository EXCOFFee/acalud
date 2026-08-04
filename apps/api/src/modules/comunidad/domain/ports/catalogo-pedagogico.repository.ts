/** Fila de una tabla maestra simple (`levels`/`subjects`): id + nombre, nada más. */
export interface CatalogoItem {
  id: string;
  name: string;
}

/**
 * Bloque E: catálogo público de niveles/materias — sin esto no hay de dónde armar los
 * selectores de `/encuestas`, `/propuestas` y `/admin/encuestas` (que ya aceptan/filtran por
 * `nivel_educativo_id`/`materia_id`, pero no tienen forma de mostrar un nombre legible).
 */
export interface CatalogoPedagogicoRepository {
  listarNiveles(): Promise<CatalogoItem[]>;
  listarMaterias(): Promise<CatalogoItem[]>;
}

export const CATALOGO_PEDAGOGICO_REPOSITORY = Symbol('CatalogoPedagogicoRepository');
