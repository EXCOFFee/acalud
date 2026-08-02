import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-026 · Asignar Licencia de Juego a un Docente, contra la app real + PostgreSQL real.
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
  const [nombrePila, apellido] = nombre.split(' ');
  await ctx.request
    .post('/api/v1/auth/registro')
    .send({ email, contrasena: PW, nombre: nombrePila, apellido });
  await ctx.pg.query(`UPDATE users SET email_verified = true WHERE email = $1`, [email]);
  const login = await ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena: PW });
  const r = await ctx.pg.query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [email]);
  return { token: login.body.token as string, email, id: r.rows[0]!.id };
}

async function institucionDe(token: string): Promise<string> {
  const res = await ctx.request
    .post('/api/v1/instituciones')
    .set(bearer(token))
    .send({
      nombre_legal: 'Escuela Normal N°1',
      identificador_tributario: `30-${Math.floor(10_000_000 + Math.random() * 89_999_999)}-9`,
      email_institucional: `${randomUUID()}@institucion.edu.ar`,
      domicilio: {
        calle: 'San Martín',
        numero: '450',
        localidad: 'La Plata',
        provincia: 'Buenos Aires',
        codigo_postal: '1900',
      },
    });
  expect(res.status).toBe(201);
  return res.body.institucion_id as string;
}

async function producto(nombre: string): Promise<string> {
  const r = await ctx.pg.query<{ id: string }>(
    `INSERT INTO products (name, price, weight_grams, stock, is_active)
     VALUES ($1, 1000, 500, 100, true) RETURNING id`,
    [nombre],
  );
  return r.rows[0]!.id;
}

async function inventario(
  institucionId: string,
  productoId: string,
  adquirida: number,
  asignada = 0,
): Promise<void> {
  await ctx.pg.query(
    `INSERT INTO institutional_inventories (institution_id, product_id, quantity_purchased, quantity_assigned)
     VALUES ($1, $2, $3, $4)`,
    [institucionId, productoId, adquirida, asignada],
  );
}

/** Vincula un docente nuevo (no admin) y activo a la institución. */
async function docenteVinculado(
  institucionId: string,
  nombre = 'Laura Profesora',
): Promise<{ token: string; email: string; id: string }> {
  const d = await docente(nombre);
  await ctx.pg.query(
    `INSERT INTO institutional_teachers (institution_id, user_id, invited_email, is_admin, status, joined_at)
     VALUES ($1, $2, $3, false, 'active', now())`,
    [institucionId, d.id, d.email],
  );
  return d;
}

const asignar = (token: string, institucionId: string, body: Record<string, unknown>) =>
  ctx.request
    .post(`/api/v1/instituciones/${institucionId}/asignaciones`)
    .set(bearer(token))
    .send(body);

async function asignadoEnInventario(institucionId: string, productoId: string): Promise<number> {
  const r = await ctx.pg.query<{ quantity_assigned: number }>(
    `SELECT quantity_assigned FROM institutional_inventories
      WHERE institution_id = $1 AND product_id = $2`,
    [institucionId, productoId],
  );
  return r.rows[0]!.quantity_assigned;
}

/** Escenario base: encargado con institución, un producto con `adquiridas` licencias y un docente. */
async function escenario(adquiridas = 10) {
  const encargado = await docente('Carlos Director');
  const institucionId = await institucionDe(encargado.token);
  const productoId = await producto(`Oca ${randomUUID().slice(0, 8)}`);
  await inventario(institucionId, productoId, adquiridas);
  const profe = await docenteVinculado(institucionId);
  return { encargado, institucionId, productoId, profe };
}

describe('CU-026 · Asignar licencia de juego a un docente', () => {
  it('flujo principal: crea la asignación, actualiza el inventario, notifica y audita', async () => {
    const { encargado, institucionId, productoId, profe } = await escenario(10);

    const res = await asignar(encargado.token, institucionId, {
      producto_id: productoId,
      asignaciones: [{ docente_id: profe.id, cantidad: 3 }],
      observaciones: 'Para el taller de matemática',
    });

    expect(res.status).toBe(201);
    expect(res.body.asignaciones).toHaveLength(1);
    expect(res.body.asignaciones[0].docente_id).toBe(profe.id);
    // p21: la respuesta ya trae la disponibilidad actualizada.
    expect(res.body.cantidad_disponible).toBe(7);

    // RN-006: la asignación apunta a la MEMBRESÍA del docente, con su autor y su cantidad.
    const fila = await ctx.pg.query<{
      quantity_assigned: number;
      status: string;
      notes: string | null;
      docente: string;
      autor: string;
    }>(
      `SELECT a.quantity_assigned, a.status, a.notes,
              td.user_id AS docente, ta.user_id AS autor
         FROM institutional_assignments a
         JOIN institutional_teachers td ON td.id = a.institutional_teacher_id
         JOIN institutional_teachers ta ON ta.id = a.assigned_by
        WHERE a.institution_id = $1 AND a.product_id = $2`,
      [institucionId, productoId],
    );
    expect(fila.rows).toHaveLength(1);
    expect(fila.rows[0]!.quantity_assigned).toBe(3);
    expect(fila.rows[0]!.status).toBe('active');
    expect(fila.rows[0]!.docente).toBe(profe.id);
    expect(fila.rows[0]!.autor).toBe(encargado.id);
    // CU-26 p8: las observaciones del encargado se conservan.
    expect(fila.rows[0]!.notes).toBe('Para el taller de matemática');

    // RN-007: el inventario refleja la asignación.
    expect(await asignadoEnInventario(institucionId, productoId)).toBe(3);

    // RN-008: notificación por dashboard y email encolado.
    const notif = await ctx.pg.query<{ type: string; message: string }>(
      `SELECT type, message FROM notifications WHERE recipient_user_id = $1`,
      [profe.id],
    );
    expect(notif.rows[0]?.type).toBe('licencia_asignada');
    expect(notif.rows[0]?.message).toMatch(/3 licencia/);

    const email = await ctx.pg.query<{ subject: string }>(
      `SELECT subject FROM outbox_emails WHERE recipient = $1 AND template = 'licencia-asignada'`,
      [profe.email],
    );
    expect(email.rows).toHaveLength(1);
    expect(email.rows[0]!.subject).toBeTruthy();

    // RN-009 / RNF-007: evento por asignación, con docente, producto y cantidad.
    const evento = await ctx.pg.query<{
      actor_user_id: string;
      entity_type: string;
      new_values: { teacher_id: string; product_id: string; quantity: number };
    }>(
      `SELECT actor_user_id, entity_type, new_values FROM audit_log
        WHERE action = 'LicenciaAsignada' AND entity_id = $1`,
      [res.body.asignaciones[0].asignacion_id],
    );
    expect(evento.rows).toHaveLength(1);
    expect(evento.rows[0]!.entity_type).toBe('institutional_assignment');
    expect(evento.rows[0]!.actor_user_id).toBe(encargado.id);
    expect(evento.rows[0]!.new_values.teacher_id).toBe(profe.id);
    expect(evento.rows[0]!.new_values.quantity).toBe(3);
  });

  it('p7: un mismo pedido reparte cantidades distintas entre varios docentes', async () => {
    const { encargado, institucionId, productoId, profe } = await escenario(10);
    const otro = await docenteVinculado(institucionId, 'Martín Suplente');

    const res = await asignar(encargado.token, institucionId, {
      producto_id: productoId,
      asignaciones: [
        { docente_id: profe.id, cantidad: 1 },
        { docente_id: otro.id, cantidad: 3 },
      ],
    });

    expect(res.status).toBe(201);
    expect(res.body.asignaciones).toHaveLength(2);
    expect(res.body.cantidad_disponible).toBe(6);
    expect(await asignadoEnInventario(institucionId, productoId)).toBe(4);

    // Cada docente recibe la suya, con su propia cantidad.
    const filas = await ctx.pg.query<{ docente: string; cantidad: number }>(
      `SELECT t.user_id AS docente, a.quantity_assigned AS cantidad
         FROM institutional_assignments a
         JOIN institutional_teachers t ON t.id = a.institutional_teacher_id
        WHERE a.institution_id = $1 ORDER BY a.quantity_assigned`,
      [institucionId],
    );
    expect(filas.rows.map((f) => f.cantidad)).toEqual([1, 3]);
  });

  it('A1/RN-005: cantidad mayor a la disponible → 422 y no escribe nada', async () => {
    const { encargado, institucionId, productoId, profe } = await escenario(5);

    const res = await asignar(encargado.token, institucionId, {
      producto_id: productoId,
      asignaciones: [{ docente_id: profe.id, cantidad: 6 }],
    });

    expect(res.status).toBe(422);
    // A1.3: el mensaje informa el stock disponible.
    expect(res.body.detail).toMatch(/5/);

    expect(await asignadoEnInventario(institucionId, productoId)).toBe(0);
    const n = await ctx.pg.query<{ n: string }>(
      `SELECT count(*) AS n FROM institutional_assignments WHERE institution_id = $1`,
      [institucionId],
    );
    expect(Number(n.rows[0]!.n)).toBe(0);
  });

  it('RN-005: el disponible descuenta lo ya asignado, no sólo lo adquirido', async () => {
    const { encargado, institucionId, productoId, profe } = await escenario(10);
    // Ya hay 8 asignadas por fuera: quedan 2.
    await ctx.pg.query(
      `UPDATE institutional_inventories SET quantity_assigned = 8
        WHERE institution_id = $1 AND product_id = $2`,
      [institucionId, productoId],
    );

    expect(
      (
        await asignar(encargado.token, institucionId, {
          producto_id: productoId,
          asignaciones: [{ docente_id: profe.id, cantidad: 3 }],
        })
      ).status,
    ).toBe(422);

    const ok = await asignar(encargado.token, institucionId, {
      producto_id: productoId,
      asignaciones: [{ docente_id: profe.id, cantidad: 2 }],
    });
    expect(ok.status).toBe(201);
    expect(ok.body.cantidad_disponible).toBe(0);
    expect(await asignadoEnInventario(institucionId, productoId)).toBe(10);
  });

  it('A2/RN-003: el mismo docente puede recibir el producto más de una vez', async () => {
    const { encargado, institucionId, productoId, profe } = await escenario(10);

    expect(
      (
        await asignar(encargado.token, institucionId, {
          producto_id: productoId,
          asignaciones: [{ docente_id: profe.id, cantidad: 2 }],
        })
      ).status,
    ).toBe(201);

    // A2.4/A2.5: se le asignan más unidades; la segunda no reemplaza a la primera.
    const segunda = await asignar(encargado.token, institucionId, {
      producto_id: productoId,
      asignaciones: [{ docente_id: profe.id, cantidad: 3 }],
    });
    expect(segunda.status).toBe(201);

    const n = await ctx.pg.query<{ n: string }>(
      `SELECT count(*) AS n FROM institutional_assignments
        WHERE institution_id = $1 AND product_id = $2`,
      [institucionId, productoId],
    );
    expect(Number(n.rows[0]!.n)).toBe(2);
    expect(await asignadoEnInventario(institucionId, productoId)).toBe(5);
  });

  it('A3/RN-010: docente no vinculado → 422, sin asignaciones ni cambios de inventario', async () => {
    const { encargado, institucionId, productoId, profe } = await escenario(10);
    const ajeno = await docente('Pedro Ajeno'); // registrado, pero sin membresía

    // Atomicidad: el docente válido va PRIMERO, así se comprueba que tampoco queda escrito.
    const res = await asignar(encargado.token, institucionId, {
      producto_id: productoId,
      asignaciones: [
        { docente_id: profe.id, cantidad: 1 },
        { docente_id: ajeno.id, cantidad: 1 },
      ],
    });

    expect(res.status).toBe(422);
    expect(res.body.detail).toMatch(/no pertenece/i);

    expect(await asignadoEnInventario(institucionId, productoId)).toBe(0);
    const n = await ctx.pg.query<{ n: string }>(
      `SELECT count(*) AS n FROM institutional_assignments WHERE institution_id = $1`,
      [institucionId],
    );
    expect(Number(n.rows[0]!.n)).toBe(0);
  });

  it('RN-001: un docente sin is_admin no puede asignar → 404', async () => {
    const { institucionId, productoId, profe } = await escenario(10);

    const res = await asignar(profe.token, institucionId, {
      producto_id: productoId,
      asignaciones: [{ docente_id: profe.id, cantidad: 1 }],
    });
    expect(res.status).toBe(404);
    expect(await asignadoEnInventario(institucionId, productoId)).toBe(0);
  });

  it('seguridad: el encargado de una institución no asigna sobre otra → 404', async () => {
    const { institucionId, productoId, profe } = await escenario(10);
    const intruso = await docente('Otro Director');
    await institucionDe(intruso.token); // es encargado, pero de la suya

    const res = await asignar(intruso.token, institucionId, {
      producto_id: productoId,
      asignaciones: [{ docente_id: profe.id, cantidad: 1 }],
    });
    expect(res.status).toBe(404);
    expect(await asignadoEnInventario(institucionId, productoId)).toBe(0);
  });

  it('p14: producto fuera del inventario institucional → 404', async () => {
    const { encargado, institucionId, profe } = await escenario(10);
    const ajeno = await producto('No adquirido');

    const res = await asignar(encargado.token, institucionId, {
      producto_id: ajeno,
      asignaciones: [{ docente_id: profe.id, cantidad: 1 }],
    });
    expect(res.status).toBe(404);
  });

  it('RN-004 y forma del pedido: cantidades no positivas y docentes repetidos → 422', async () => {
    const { encargado, institucionId, productoId, profe } = await escenario(10);
    const linea = (cantidad: number) => ({
      producto_id: productoId,
      asignaciones: [{ docente_id: profe.id, cantidad }],
    });

    expect((await asignar(encargado.token, institucionId, linea(0))).status).toBe(422);
    expect((await asignar(encargado.token, institucionId, linea(-2))).status).toBe(422);
    expect((await asignar(encargado.token, institucionId, linea(1.5))).status).toBe(422);

    // Lista vacía: no hay nada que asignar.
    expect(
      (await asignar(encargado.token, institucionId, { producto_id: productoId, asignaciones: [] }))
        .status,
    ).toBe(422);

    // El mismo docente dos veces en un pedido es ambiguo y se rechaza.
    expect(
      (
        await asignar(encargado.token, institucionId, {
          producto_id: productoId,
          asignaciones: [
            { docente_id: profe.id, cantidad: 1 },
            { docente_id: profe.id, cantidad: 2 },
          ],
        })
      ).status,
    ).toBe(422);

    expect(await asignadoEnInventario(institucionId, productoId)).toBe(0);
  });

  it('A6: sin sesión → 401 y nada se escribe', async () => {
    const { institucionId, productoId, profe } = await escenario(10);

    const res = await ctx.request
      .post(`/api/v1/instituciones/${institucionId}/asignaciones`)
      .send({ producto_id: productoId, asignaciones: [{ docente_id: profe.id, cantidad: 1 }] });

    expect(res.status).toBe(401);
    expect(await asignadoEnInventario(institucionId, productoId)).toBe(0);
  });
});
