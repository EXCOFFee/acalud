import { EditorialNoEncontrada } from '../domain/errores';
import type { EditorialDetalle } from '../domain/editorial';
import type { EditorialesRepository } from '../domain/ports/editoriales.repository';

/** CU-17 §4 (p8-p12): detalle completo. A3 si no existe o no está activa. */
export class VerEditorial {
  constructor(private readonly repo: EditorialesRepository) {}

  async ejecutar(id: string, usuarioId: string | null): Promise<EditorialDetalle> {
    const editorial = await this.repo.obtener(id, usuarioId);
    if (editorial === null) throw new EditorialNoEncontrada();
    return editorial;
  }
}
