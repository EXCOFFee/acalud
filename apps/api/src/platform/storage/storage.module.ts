import { Global, Module } from '@nestjs/common';
import { STORAGE_PROVIDER } from './storage-provider.port';
import { SupabaseStorageAdapter } from './adapters/supabase-storage.adapter';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_PROVIDER,
      useClass: SupabaseStorageAdapter,
    },
  ],
  exports: [STORAGE_PROVIDER],
})
export class StorageModule {}
