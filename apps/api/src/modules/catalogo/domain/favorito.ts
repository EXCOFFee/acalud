export type TipoFavorito = 'product' | 'resource' | 'editorial_partner';

/** Exactamente uno de los tres debe ser no nulo (RN-002/RN-003; CHECK real en la base). */
export interface DatosFavorito {
  productId: string | null;
  resourceId: string | null;
  editorialPartnerId: string | null;
}

export interface Favorito {
  id: string;
  userId: string;
  productId: string | null;
  resourceId: string | null;
  editorialPartnerId: string | null;
  createdAt: Date;
}

/** Fila de "Mis Favoritos" (CU-18 A9), con el título resuelto según el tipo. */
export interface FavoritoResumen {
  id: string;
  tipo: TipoFavorito;
  itemId: string;
  titulo: string;
  createdAt: Date;
}
