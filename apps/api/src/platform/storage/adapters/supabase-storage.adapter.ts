import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { ArchivoSubido, StorageProvider } from '../storage-provider.port';

@Injectable()
export class SupabaseStorageAdapter implements StorageProvider {
  private readonly supabase: SupabaseClient;
  private readonly logger = new Logger(SupabaseStorageAdapter.name);

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      this.logger.warn('SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están definidos. El StorageProvider fallará al usarse.');
    }

    this.supabase = createClient(url || 'http://localhost', key || 'dummy_key');
  }

  async generarUrlFirmada(bucket: string, path: string, expiracionSegundos: number): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiracionSegundos);

    if (error) {
      this.logger.error(`Error generando URL firmada para ${bucket}/${path}: ${error.message}`);
      throw new Error(`No se pudo generar la URL de descarga: ${error.message}`);
    }

    return data.signedUrl;
  }

  async subirArchivo(
    bucket: string,
    path: string,
    contenido: Buffer,
    contentType: string,
  ): Promise<ArchivoSubido> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(path, contenido, { contentType, upsert: false });

    if (error) {
      this.logger.error(`Error subiendo ${bucket}/${path}: ${error.message}`);
      throw new Error(`No se pudo subir el archivo: ${error.message}`);
    }

    // getPublicUrl no valida si el bucket es realmente público — en un bucket privado (ej.
    // 'recursos') la URL que devuelve no sirve para nada; el llamador decide si la usa.
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return { path, urlPublica: data.publicUrl ?? null };
  }

  async eliminarArchivo(bucket: string, path: string): Promise<void> {
    const { error } = await this.supabase.storage.from(bucket).remove([path]);
    if (error) {
      // Best-effort: un archivo que ya no existe (o un error transitorio de Storage) no debe
      // tumbar la operación de guardar el producto/recurso que disparó este borrado.
      this.logger.warn(`No se pudo borrar ${bucket}/${path}: ${error.message}`);
    }
  }

  extraerPathPropio(bucket: string, url: string): string | null {
    const { data } = this.supabase.storage.from(bucket).getPublicUrl('');
    const prefijo = data.publicUrl;
    if (!prefijo || !url.startsWith(prefijo)) return null;
    return url.slice(prefijo.length);
  }
}
