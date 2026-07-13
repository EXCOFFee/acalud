import { JuegoNoEncontrado } from '../domain/errores';
import type { JuegoDetalle } from '../domain/juego';
import type { CatalogoRepository } from '../domain/ports/catalogo.repository';

/** CU-006 · Ver ficha de un juego publicado. Juego inexistente/no publicado → 404. */
export class VerJuego {
  constructor(private readonly repo: CatalogoRepository) {}

  async ejecutar(id: string): Promise<JuegoDetalle> {
    const juego = await this.repo.verPublicado(id);
    if (juego === null) throw new JuegoNoEncontrado();
    return juego;
  }
}
