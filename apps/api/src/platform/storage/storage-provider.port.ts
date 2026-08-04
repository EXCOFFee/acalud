export interface ArchivoSubido {
  /** Ruta dentro del bucket (ej: 'productos/uuid.png') — lo que se guarda en la BD. */
  path: string;
  /** Solo para buckets públicos (ej: 'productos'). null en buckets privados como 'recursos'. */
  urlPublica: string | null;
}

export interface StorageProvider {
  /**
   * CU-08 / CU-09: Genera una URL firmada de corta duración para acceder al recurso.
   * @param bucket El nombre del bucket en Supabase Storage (ej: 'recursos')
   * @param path La ruta dentro del bucket (ej: 'pdfs/juego-1.pdf')
   * @param expiracionSegundos Tiempo de validez de la URL en segundos
   */
  generarUrlFirmada(bucket: string, path: string, expiracionSegundos: number): Promise<string>;

  /** CU-19 A8/A9: sube un archivo (imagen de producto, PDF de recurso) a un bucket. */
  subirArchivo(
    bucket: string,
    path: string,
    contenido: Buffer,
    contentType: string,
  ): Promise<ArchivoSubido>;

  /** Borrado best-effort del archivo reemplazado. Idempotente: no falla si ya no existe. */
  eliminarArchivo(bucket: string, path: string): Promise<void>;

  /**
   * Si `url` es una URL pública nuestra de ese bucket, devuelve el path interno; si es una URL
   * externa pegada a mano por el admin, null. Evita borrar algo que no subimos nosotros.
   */
  extraerPathPropio(bucket: string, url: string): string | null;
}

export const STORAGE_PROVIDER = Symbol('StorageProvider');
