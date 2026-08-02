import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { StorageProvider } from '../storage-provider.port';

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
}
