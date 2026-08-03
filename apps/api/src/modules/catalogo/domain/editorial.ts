/** Fila del directorio de editoriales (CU-17 p4, listado). */
export interface EditorialResumen {
  id: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  externalWebsiteUrl: string | null;
}

export interface FiltroEditoriales {
  category?: string | undefined; // A7
}

/** Detalle completo (CU-17 p8). social_media_urls/contact_email no tienen columna: sin CU de ABM que los cargue. */
export interface EditorialDetalle extends EditorialResumen {
  category: string | null;
}
