import type { FavoritoResumen } from '../domain/favorito';
import type { FavoritosRepository } from '../domain/ports/favoritos.repository';

/** CU-18 A9: lista de favoritos del usuario, con el título resuelto. */
export class VerMisFavoritos {
  constructor(private readonly repo: FavoritosRepository) {}

  async ejecutar(userId: string): Promise<FavoritoResumen[]> {
    return this.repo.listarPropios(userId);
  }
}
