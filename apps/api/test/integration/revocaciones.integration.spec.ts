import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-027 · Revocar Licencia a un Docente, contra la app real + PostgreSQL real.
const PW = 'correcta-bateria-caballo-grapa';

let ctx: CtxApp;

beforeAll(async () => {
  ctx = await levantarApp();
});

afterAll(async () => {
  await ctx?.detener();
});

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

async function docente(nombre = 'Ana Gómez'): Promise<{ token: string; email: string; id: string }> {
  const email = `${randomUUID()}@escuela.edu.ar`;
  const [pila, apellido] = nombre.split(' ');
  await ctx.request.post('/api/v1/auth/registro').send({ email, contrasena: PW, nombre: pila, apellido });
  await ctx.pg.query(`UPDATE users SET email_verified = true WHERE email = $1`, [email]);
  const login = await ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena: PW });
  const r = await ctx.pg.query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [email]);
  return { token: login.body.token as string, email, id: r.rows[0]!.id };
}

async function institucionDe(token: string): Promise<string> {
  const res = await ctx.request.post('/api/v1/instituciones').set(bearer(token)).send({
    nombre_legal: 'Escuela Normal N°1',
    identificador_tributario: `30-${Math.floor(10_000_000 + Math.random() * 89_999_999)}-9`,
    email_institucional: `${randomUUID()}@institucion.edu.ar`,
    domicilio: { calle: 'San Martín', numero: '450', localidad: 'La Plata', provincia: 'Buenos Aires', codigo_postal: '1900' },
  });
  expect(res.status).toBe(201);
  return res.body.institucion_id as string;
}

async function producto(): Promise<string> {
  const r = await ctx.pg.query<{ id: string }>(
    `INSERT INTO products (name, price, weight_grams, stock, is_active) VALUES ('Juego', 1000, 500, 100, true) RETURNING id`,
  );
  return r.rows[0]!.id;
}

/** Escenario armado: institución + encargado + docente vinculado con `cantidad` asignadas (vía API CU-26). */
async function escenario(cantidad: number): Promise<{
  encargado: { token: string; id: string };
  profesor: { token: string; id: string; email: string };
  institucionId: string;
  productoId: string;
}> {
  const encargado = await docente('Carlos Director');
  const institucionId = await institucionDe(encargado.token);
  const productoId = await producto();
  const profesor = await docente('Laura Profesora');
  await ctx.pg.query(
    `INSERT INTO institutional_teachers (institution_id, user_id, invited_email, is_admin, status, joined_at)
     VALUES ($1, $2, $3, false, 'active', now())`,
    [institucionId, profesor.id, profesor.email],
  );
  await ctx.pg.query(
    `INSERT INTO institutional_inventories (institution_id, product_id, quantity_purchased, quantity_assigned)
     VALUES ($1, $2, 10, 0)`,
    [institucionId, productoId],
  );
  if (cantidad > 0) {
    const res = await ctx.request
      .post(`/api/v1/instituciones/${institucionId}/asignaciones`)
      .set(bearer(encargado.token))
      .send({ producto_id: productoId, asignaciones: [{ docente_id: profesor.id, cantidad }] });
    expect(res.status).toBe(201);
  }
  return { encargado: { token: encargado.token, id: encargado.id }, profesor, institucionId, productoId };
}

const revocar = (token: string, institucionId: string, body: Record<string, unknown>) =>
  ctx.request.post(`/api/v1/instituciones/${institucionId}/revocaciones`).set(bearer(token)).send(body);

const asignadoEnInventario = async (institucionId: string, productoId: string): Promise<number> =>
  Number(
    (
      await ctx.pg.query<{ q: number }>(
        `SELECT quantity_assigned AS q FROM institutional_inventories WHERE institution_id = $1 AND product_id = $2`,
        [institucionId, productoId],
      )
    ).rows[0]!.q,
  );

describe('CU-027 · Revocar licencia a un docente', () => {
  it('A9 parcial: reduce la fila, descuenta inventario, notifica y audita', async () => {
    const e = await escenario(3);
    const res = await revocar(e.encargado.token, e.institucionId, {
      docente_id: e.profesor.id,
      producto_id: e.productoId,
      cantidad_a_revocar: 1,
      observaciones: 'Lo necesita otro curso',
    });
    expect(res.status).toBe(200);
    expect(res.body.cantidad_revocada).toBe(1);
    expect(res.body.cantidad_restante).toBe(2);

    // La fila queda activa con 2; el inventario descuenta (RN-004).
    const fila = await ctx.pg.query<{ q: number; status: string }>(
      `SELECT quantity_assigned AS q, status FROM institutional_assignments
        WHERE institution_id = $1 AND product_id = $2`,
      [e.institucionId, e.productoId],
    );
    expect(fila.rows[0]!.q).toBe(2);
    expect(fila.rows[0]!.status).toBe('active');
    expect(await asignadoEnInventario(e.institucionId, e.productoId)).toBe(2);

    // RN-005: notificación por dashboard con el motivo + email encolado.
    const notif = await ctx.pg.query<{ message: string }>(
      `SELECT message FROM notifications WHERE recipient_user_id = $1 AND type = 'licencia_revocada'`,
      [e.profesor.id],
    );
    expect(notif.rows[0]!.message).toMatch(/revocaron 1 licencia/);
    expect(notif.rows[0]!.message).toMatch(/Lo necesita otro curso/);
    const mail = await ctx.pg.query(
      `SELECT 1 FROM outbox_emails WHERE recipient = $1 AND template = 'licencia-revocada'`,
      [e.profesor.email],
    );
    expect(mail.rows).toHaveLength(1);

    // RN-006/RN-007: auditoría con admin, docente, producto, cantidad y razón.
    const audit = await ctx.pg.query<{ actor_user_id: string; new_values: { reason: string; quantity_revoked: number } }>(
      `SELECT actor_user_id, new_values FROM audit_log WHERE action = 'LicenciaRevocada' AND entity_id = $1`,
      [e.institucionId],
    );
    expect(audit.rows[0]!.actor_user_id).toBe(e.encargado.id);
    expect(audit.rows[0]!.new_values.quantity_revoked).toBe(1);
    expect(audit.rows[0]!.new_values.reason).toBe('Lo necesita otro curso');
  });

  it('A10 total: la fila pasa a revoked con fecha, autor y razón; nunca se borra', async () => {
    const e = await escenario(2);
    const res = await revocar(e.encargado.token, e.institucionId, {
      docente_id: e.profesor.id,
      producto_id: e.productoId,
      cantidad_a_revocar: 2,
    });
    expect(res.status).toBe(200);
    expect(res.body.cantidad_restante).toBe(0);

    const fila = await ctx.pg.query<{ status: string; revoked_at: Date | null; revoked_by: string | null }>(
      `SELECT status, revoked_at, revoked_by FROM institutional_assignments
        WHERE institution_id = $1 AND product_id = $2`,
      [e.institucionId, e.productoId],
    );
    expect(fila.rows).toHaveLength(1); // la fila se conserva (CU-28 RN-007)
    expect(fila.rows[0]!.status).toBe('revoked');
    expect(fila.rows[0]!.revoked_at).not.toBeNull();
    expect(fila.rows[0]!.revoked_by).not.toBeNull();
    expect(await asignadoEnInventario(e.institucionId, e.productoId)).toBe(0);
  });

  it('FIFO: con dos asignaciones consume la más antigua primero', async () => {
    const e = await escenario(2);
    // Segunda asignación del mismo producto (CU-26 RN-003: otra fila).
    await ctx.request
      .post(`/api/v1/instituciones/${e.institucionId}/asignaciones`)
      .set(bearer(e.encargado.token))
      .send({ producto_id: e.productoId, asignaciones: [{ docente_id: e.profesor.id, cantidad: 2 }] });

    const res = await revocar(e.encargado.token, e.institucionId, {
      docente_id: e.profesor.id,
      producto_id: e.productoId,
      cantidad_a_revocar: 3,
    });
    expect(res.status).toBe(200);
    expect(res.body.cantidad_restante).toBe(1);

    const filas = await ctx.pg.query<{ q: number; status: string }>(
      `SELECT quantity_assigned AS q, status FROM institutional_assignments
        WHERE institution_id = $1 AND product_id = $2 ORDER BY assigned_at ASC`,
      [e.institucionId, e.productoId],
    );
    // La más antigua se consumió entera: revocada, conservando su cantidad histórica.
    expect(filas.rows[0]).toMatchObject({ q: 2, status: 'revoked' });
    expect(filas.rows[1]).toMatchObject({ q: 1, status: 'active' });
    expect(await asignadoEnInventario(e.institucionId, e.productoId)).toBe(1);
  });

  it('A2: revocar más de lo asignado → 422 con la cantidad actual', async () => {
    const e = await escenario(2);
    const res = await revocar(e.encargado.token, e.institucionId, {
      docente_id: e.profesor.id,
      producto_id: e.productoId,
      cantidad_a_revocar: 5,
    });
    expect(res.status).toBe(422);
    expect(res.body.detail).toMatch(/Cantidad asignada actual: 2/);
    expect(await asignadoEnInventario(e.institucionId, e.productoId)).toBe(2); // nada cambió
  });

  it('A1: cantidad cero o negativa → 422', async () => {
    const e = await escenario(2);
    expect(
      (
        await revocar(e.encargado.token, e.institucionId, {
          docente_id: e.profesor.id,
          producto_id: e.productoId,
          cantidad_a_revocar: 0,
        })
      ).status,
    ).toBe(422);
  });

  it('A3: docente sin asignación activa del producto → 404', async () => {
    const e = await escenario(0); // vinculado pero sin asignaciones
    const res = await revocar(e.encargado.token, e.institucionId, {
      docente_id: e.profesor.id,
      producto_id: e.productoId,
      cantidad_a_revocar: 1,
    });
    expect(res.status).toBe(404);
    expect(res.body.detail).toMatch(/no tiene asignaciones activas/i);
  });

  it('RN-001: docente no admin no puede revocar → 404; sin sesión → 401', async () => {
    const e = await escenario(2);
    expect(
      (
        await revocar(e.profesor.token, e.institucionId, {
          docente_id: e.profesor.id,
          producto_id: e.productoId,
          cantidad_a_revocar: 1,
        })
      ).status,
    ).toBe(404);
    expect(
      (
        await ctx.request.post(`/api/v1/instituciones/${e.institucionId}/revocaciones`).send({})
      ).status,
    ).toBe(401);
  });
});
