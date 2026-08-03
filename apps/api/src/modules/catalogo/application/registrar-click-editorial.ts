import { EditorialNoEncontrada } from '../domain/errores';
import type { EditorialesRepository } from '../domain/ports/editoriales.repository';

/** CU-17 A1/A2 · RN-003/RN-007: click en "Ir al sitio web" (distingue anónimo de registrado). */
export class RegistrarClickEditorial {
  constructor(private readonly repo: EditorialesRepository) {}

  async ejecutar(id: string, usuarioId: string | null): Promise<void> {
    const existe = await this.repo.registrarClick(id, usuarioId);
    if (!existe) throw new EditorialNoEncontrada();
  }
}
