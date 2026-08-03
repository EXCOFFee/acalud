import { FavoritoNoEncontrado } from '../domain/errores';
import type { FavoritosRepository } from '../domain/ports/favoritos.repository';

/** CU-18 A7: elimina un favorito propio (toggle inverso, RN-005). */
export class EliminarFavorito {
  constructor(private readonly repo: FavoritosRepository) {}

  async ejecutar(userId: string, favoritoId: string): Promise<void> {
    const eliminado = await this.repo.eliminar(userId, favoritoId);
    if (!eliminado) throw new FavoritoNoEncontrado();
  }
}
