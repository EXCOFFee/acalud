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
import { aplicarMigraciones } from '../../../src/platform/db/migrator';

const MIGRACIONES_DIR = resolve(process.cwd(), '../../infra/migrations');

export type Peticion = ReturnType<typeof supertest>;

export interface CtxApp {
  app: INestApplication;
  container: StartedPostgreSqlContainer;
  pg: Client; // cliente directo para asserts contra la BD
  request: Peticion;
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
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
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

  return { app, container, pg, request, detener };
}
