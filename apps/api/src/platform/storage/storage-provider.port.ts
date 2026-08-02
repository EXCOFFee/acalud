export interface StorageProvider {
  /**
   * CU-08 / CU-09: Genera una URL firmada de corta duración para acceder al recurso.
   * @param bucket El nombre del bucket en Supabase Storage (ej: 'recursos')
   * @param path La ruta dentro del bucket (ej: 'pdfs/juego-1.pdf')
   * @param expiracionSegundos Tiempo de validez de la URL en segundos
   */
  generarUrlFirmada(bucket: string, path: string, expiracionSegundos: number): Promise<string>;
}

export const STORAGE_PROVIDER = Symbol('StorageProvider');
