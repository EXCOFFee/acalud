import { resolve } from 'node:path';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { Client } from 'pg';
import supertest from 'supertest';
import { AppModule } from '../../../src/app.module';
import { configurarApp } from '../../../src/configurar-app';
import { MercadoPagoFakeAdapter } from '../../../src/modules/compras/infrastructure/adapters/mercado-pago-fake.adapter';
import { PAYMENT_PROVIDER } from '../../../src/modules/compras/domain/ports/payment-provider.port';
import { aplicarMigraciones } from '../../../src/platform/db/migrator';

const MIGRACIONES_DIR = resolve(process.cwd(), '../../infra/migrations');

export type Peticion = ReturnType<typeof supertest>;

export interface CtxApp {
  app: INestApplication;
  container: StartedPostgreSqlContainer;
  pg: Client; // cliente directo para asserts contra la BD
  request: Peticion;
  /** Contenido subido al StorageProvider fake, clave `bucket/path` — para verificar subida/borrado. */
  storageMock: Map<string, Buffer>;
  detener: () => Promise<void>;
}

/**
 * Levanta la app Nest completa (AppModule) contra un PostgreSQL real de Testcontainers, con
 * las migraciones aplicadas. Permite ejercitar los endpoints por HTTP (supertest) y verificar
 * el estado en la BD. Requiere Docker.
 */
export async function levantarApp(): Promise<CtxApp> {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const uri = container.getConnectionUri();

  const migrador = new Client({ connectionString: uri });
  await migrador.connect();
  await aplicarMigraciones(migrador, MIGRACIONES_DIR);
  await migrador.end();

  process.env.DATABASE_URL = uri; // lo lee el PgModule al instanciar el pool
  const { STORAGE_PROVIDER } = await import('../../../src/platform/storage/storage-provider.port');
  const storageMock = new Map<string, Buffer>();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    // El PaymentProvider real (MercadoPagoAdapter) llama a la API real de MP — en tests se
    // reemplaza por el fake determinista (ADR-006: selección fija en runtime, no en tests).
    .overrideProvider(PAYMENT_PROVIDER)
    .useValue(new MercadoPagoFakeAdapter())
    .overrideProvider(STORAGE_PROVIDER)
    .useValue({
      generarUrlFirmada: async (bucket: string, path: string, exp?: number) => `https://mock-storage.com/${bucket}/${path}?token=mock&exp=${exp}`,
      subirArchivo: async (bucket: string, path: string, contenido: Buffer) => {
        storageMock.set(`${bucket}/${path}`, contenido);
        return { path, urlPublica: `https://mock-storage.com/${bucket}/${path}` };
      },
      eliminarArchivo: async (bucket: string, path: string) => {
        storageMock.delete(`${bucket}/${path}`);
      },
      extraerPathPropio: (bucket: string, url: string) => {
        const prefijo = `https://mock-storage.com/${bucket}/`;
        return url.startsWith(prefijo) ? url.slice(prefijo.length) : null;
      },
    })
    .compile();
  const app = moduleRef.createNestApplication();
  configurarApp(app);
  await app.init();

  const pg = new Client({ connectionString: uri });
  await pg.connect();

  const request = supertest(app.getHttpServer());

  const detener = async (): Promise<void> => {
    await pg.end();
    await app.close();
    await container.stop();
  };

  return { app, container, pg, request, storageMock, detener };
}
