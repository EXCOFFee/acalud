import type { EditorialResumen, FiltroEditoriales } from '../domain/editorial';
import type { EditorialesRepository } from '../domain/ports/editoriales.repository';

/** CU-17 §4 (flujo principal) / A6 (vacío) / A7 (filtro por categoría). */
export class ListarEditoriales {
  constructor(private readonly repo: EditorialesRepository) {}

  async ejecutar(filtro: FiltroEditoriales): Promise<EditorialResumen[]> {
    return this.repo.listar(filtro);
  }
}
