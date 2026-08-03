import type { DatosFavorito, Favorito, FavoritoResumen } from '../favorito';

/** Puerto de favoritos (CU-18). */
export interface FavoritosRepository {
  existeProducto(id: string): Promise<boolean>;
  existeRecurso(id: string): Promise<boolean>;
  existeEditorial(id: string): Promise<boolean>;
  /** Lanza FavoritoDuplicado si ya existe (los 3 índices únicos parciales lo garantizan). */
  crear(userId: string, datos: DatosFavorito): Promise<Favorito>;
  /** CU-18 A9: los favoritos del usuario, con el título resuelto según el tipo. */
  listarPropios(userId: string): Promise<FavoritoResumen[]>;
  /** CU-18 A7: solo elimina si pertenece al usuario. false si no existe o es ajeno. */
  eliminar(userId: string, favoritoId: string): Promise<boolean>;
}

export const FAVORITOS_REPOSITORY = Symbol('FavoritosRepository');
