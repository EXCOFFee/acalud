import { ElementoFavoritoNoEncontrado } from '../domain/errores';
import type { DatosFavorito, Favorito } from '../domain/favorito';
import type { FavoritosRepository } from '../domain/ports/favoritos.repository';

export interface GuardarFavoritoInput extends DatosFavorito {
  userId: string;
}

/** CU-18 · Guardar Favorito (flujo principal + A2/A4; RN-008 exige sesión, ya lo cubre AuthGuard). */
export class GuardarFavorito {
  constructor(private readonly repo: FavoritosRepository) {}

  async ejecutar(input: GuardarFavoritoInput): Promise<Favorito> {
    // A4: el elemento referenciado debe existir. La forma (exactamente uno de los tres) ya se
    // validó en el borde (Zod), así que acá alcanza con mirar cuál de los tres vino.
    let existe: boolean;
    if (input.productId !== null) {
      existe = await this.repo.existeProducto(input.productId);
    } else if (input.resourceId !== null) {
      existe = await this.repo.existeRecurso(input.resourceId);
    } else {
      existe = await this.repo.existeEditorial(input.editorialPartnerId!);
    }
    if (!existe) throw new ElementoFavoritoNoEncontrado();

    // A2/RN-001: el duplicado lo resuelve el índice único parcial de la base (evita la carrera
    // entre chequeo y escritura), no una lectura previa.
    return this.repo.crear(input.userId, input);
  }
}
