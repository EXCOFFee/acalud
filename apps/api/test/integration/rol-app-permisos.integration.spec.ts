import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxPostgres, levantarPostgresConEsquema } from './helpers/postgres';

/**
 * NFR-S6 · migración 0020: el rol de runtime `acalud_app` tiene permisos mínimos.
 *
 * Se verifica el PRIVILEGIO (error 42501 "permission denied"), no el trigger: aunque los
 * triggers append-only de 0001 se desactivaran, el rol igual no podría modificar la auditoría.
 * La suite de integración completa ya corre la app con este rol (helpers/app.ts), así que acá
 * solo se prueba lo que el rol NO debe poder hacer (y lo mínimo que sí).
 */
const PERMISO_DENEGADO = '42501';
const DEBE_SER_DUENO = '42501'; // DROP/ALTER de una tabla ajena también es 42501 en PG16

let ctx: CtxPostgres;
let app: Client;

beforeAll(async () => {
  ctx = await levantarPostgresConEsquema();
  await ctx.client.query(`ALTER ROLE acalud_app LOGIN PASSWORD 'acalud_app_test'`);
  const uri = new URL(ctx.container.getConnectionUri());
  uri.username = 'acalud_app';
  uri.password = 'acalud_app_test';
  app = new Client({ connectionString: uri.toString() });
  await app.connect();
});

afterAll(async () => {
  await app?.end();
  await ctx?.detener();
});

async function codigoDeError(sql: string, params: unknown[] = []): Promise<string | undefined> {
  try {
    await app.query(sql, params);
    return undefined;
  } catch (e) {
    return (e as { code?: string }).code;
  }
}

describe('NFR-S6 · rol acalud_app con permisos mínimos', () => {
  it('no es superusuario ni dueño de ninguna tabla (pero sí saltea RLS deny-all)', async () => {
    const rol = await app.query(
      `SELECT rolsuper, rolbypassrls, rolcreaterole, rolcreatedb FROM pg_roles WHERE rolname = current_user`,
    );
    expect(rol.rows[0]).toEqual({
      rolsuper: false,
      rolbypassrls: true,
      rolcreaterole: false,
      rolcreatedb: false,
    });
    const propias = await app.query(
      `SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public' AND tableowner = current_user`,
    );
    expect(propias.rows[0].n).toBe(0);
  });

  it('puede leer y escribir las tablas de negocio (DML)', async () => {
    const email = `${randomUUID()}@rol.test`;
    await app.query(`INSERT INTO users (email, password_hash, full_name) VALUES ($1, 'x', 'Rol Test')`, [email]);
    await app.query(`UPDATE users SET full_name = 'Rol Test 2' WHERE email = $1`, [email]);
    const r = await app.query(`SELECT full_name FROM users WHERE email = $1`, [email]);
    expect(r.rows[0].full_name).toBe('Rol Test 2');
    await app.query(`DELETE FROM users WHERE email = $1`, [email]);
  });

  it('auditoría: puede insertar, NO puede modificar ni borrar (privilegio, no trigger)', async () => {
    expect(await codigoDeError(`UPDATE audit_log SET action = action`)).toBe(PERMISO_DENEGADO);
    expect(await codigoDeError(`DELETE FROM audit_log`)).toBe(PERMISO_DENEGADO);
  });

  it('kardex (stock_movements): NO puede modificar ni borrar', async () => {
    expect(await codigoDeError(`UPDATE stock_movements SET quantity = quantity`)).toBe(PERMISO_DENEGADO);
    expect(await codigoDeError(`DELETE FROM stock_movements`)).toBe(PERMISO_DENEGADO);
  });

  it('outbox: puede actualizar el estado (worker) pero NO borrar', async () => {
    expect(await codigoDeError(`UPDATE outbox_emails SET attempts = attempts WHERE false`)).toBeUndefined();
    expect(await codigoDeError(`DELETE FROM outbox_emails`)).toBe(PERMISO_DENEGADO);
  });

  it('no puede leer ni tocar el historial de migraciones', async () => {
    expect(await codigoDeError(`SELECT * FROM schema_migrations`)).toBe(PERMISO_DENEGADO);
  });

  it('no puede hacer DDL: crear, alterar, borrar ni vaciar tablas', async () => {
    expect(await codigoDeError(`CREATE TABLE intruso (id int)`)).toBe(PERMISO_DENEGADO);
    expect(await codigoDeError(`ALTER TABLE users ADD COLUMN intruso int`)).toBe(DEBE_SER_DUENO);
    expect(await codigoDeError(`DROP TABLE orders`)).toBe(DEBE_SER_DUENO);
    expect(await codigoDeError(`TRUNCATE products`)).toBe(PERMISO_DENEGADO);
    expect(await codigoDeError(`ALTER TABLE audit_log DISABLE TRIGGER ALL`)).toBe(DEBE_SER_DUENO);
  });
});
