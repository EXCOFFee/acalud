import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Client } from 'pg';
import { levantarPostgresConEsquema, primeraFila, type CtxPostgres } from './helpers/postgres';

// Constraints críticos de 2.3 §6, verificados contra PostgreSQL REAL (Testcontainers).
// Prohibido mockear la BD para estos tests (ADR-002 / CLAUDE.md).

let ctx: CtxPostgres;
let db: Client;

beforeAll(async () => {
  ctx = await levantarPostgresConEsquema();
  db = ctx.client;
});

afterAll(async () => {
  await ctx?.detener();
});

// ── Helpers de datos ────────────────────────────────────────────────────────
async function crearCuenta(email = `${randomUUID()}@escuela.edu.ar`): Promise<string> {
  const r = await db.query<{ id: string }>(
    `INSERT INTO users (email, password_hash, full_name)
     VALUES ($1, 'hash', 'Nombre Apellido') RETURNING id`,
    [email],
  );
  return primeraFila(r).id;
}

async function crearJuego(stock = 10): Promise<string> {
  const r = await db.query<{ id: string }>(
    `INSERT INTO products (name, price, weight_grams, stock, is_active)
     VALUES ('Juego', 1000, 500, $1, true) RETURNING id`,
    [stock],
  );
  return primeraFila(r).id;
}

async function crearInstitucion(): Promise<string> {
  const cuit = `30-${Math.floor(10_000_000 + Math.random() * 89_999_999)}-9`;
  const r = await db.query<{ id: string }>(
    `INSERT INTO institutions (legal_name, tax_id, email, level_id)
     VALUES ('Escuela', $1, $2, (SELECT id FROM levels WHERE name = 'Primaria')) RETURNING id`,
    [cuit, `${randomUUID()}@escuela.edu.ar`],
  );
  return primeraFila(r).id;
}

async function crearPedido(cuentaId: string): Promise<string> {
  const r = await db.query<{ id: string }>(
    `INSERT INTO orders (order_number, order_type, user_id, shipping_street, shipping_method)
     VALUES ($1, 'b2c', $2, 'Calle 1', 'home_delivery') RETURNING id`,
    [randomUUID(), cuentaId],
  );
  return primeraFila(r).id;
}

// ── Idempotencia / unicidad ─────────────────────────────────────────────────
describe('Idempotencia y unicidad (2.3 §6)', () => {
  it('UNIQUE(payment_id): el webhook no se procesa dos veces (CU-012 E1)', async () => {
    const pedido = await crearPedido(await crearCuenta());
    const paymentId = randomUUID();
    const insertar = (): Promise<unknown> =>
      db.query(
        `INSERT INTO processed_payments (payment_id, order_id, status, raw_payload)
         VALUES ($1, $2, 'approved', '{}'::jsonb)`,
        [paymentId, pedido],
      );
    await insertar();
    await expect(insertar()).rejects.toThrow(/duplicate key|unique/i);
  });

  it('UNIQUE users(email) es case-insensitive (CU-001 A1)', async () => {
    const email = `${randomUUID()}@ESCUELA.edu.ar`;
    await crearCuenta(email);
    await expect(crearCuenta(email.toLowerCase())).rejects.toThrow(/duplicate key|unique/i);
  });

  it('UNIQUE poll_responses(poll, user): un voto por docente y encuesta (CU-014 RN-001)', async () => {
    const cuenta = await crearCuenta();
    const enc = primeraFila(
      await db.query<{ id: string }>(
        `INSERT INTO polls (question) VALUES ('¿Qué área te interesa?') RETURNING id`,
      ),
    ).id;
    const opcion = primeraFila(
      await db.query<{ id: string }>(
        `INSERT INTO poll_options (poll_id, text) VALUES ($1, 'Matemática') RETURNING id`,
        [enc],
      ),
    ).id;
    const responder = (): Promise<unknown> =>
      db.query(`INSERT INTO poll_responses (poll_id, option_id, user_id) VALUES ($1, $2, $3)`, [
        enc,
        opcion,
        cuenta,
      ]);
    await responder();
    await expect(responder()).rejects.toThrow(/duplicate key|unique/i);
  });

  it('UNIQUE institutional_inventories(institución, producto): alta por lote idempotente (CU-024)', async () => {
    const inst = await crearInstitucion();
    const juego = await crearJuego();
    const alta = (): Promise<unknown> =>
      db.query(
        `INSERT INTO institutional_inventories (institution_id, product_id, quantity_purchased)
         VALUES ($1, $2, 5)`,
        [inst, juego],
      );
    await alta();
    await expect(alta()).rejects.toThrow(/duplicate key|unique/i);
  });

  it('UNIQUE parcial de vínculos institucionales: no dos vigentes por (institución, email); re-invitar tras desvincular sí (CU-023 A12.7)', async () => {
    const inst = await crearInstitucion();
    const email = `${randomUUID()}@profe.com`;
    const invitar = (): Promise<unknown> =>
      db.query(
        `INSERT INTO institutional_teachers (institution_id, invited_email, is_admin)
         VALUES ($1, $2, false)`,
        [inst, email],
      );
    await invitar();
    await expect(invitar()).rejects.toThrow(/duplicate key|unique/i);

    await db.query(
      `UPDATE institutional_teachers SET status = 'unlinked', unlinked_at = now()
       WHERE institution_id = $1 AND lower(invited_email) = lower($2)`,
      [inst, email],
    );
    await invitar(); // ahora sí, el índice parcial lo permite

    const n = primeraFila(
      await db.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM institutional_teachers WHERE institution_id = $1`,
        [inst],
      ),
    ).n;
    expect(n).toBe(2);
  });

  it('un solo pedido pendiente_pago por carrito-origen (idempotencia por pedido, CU-012)', async () => {
    const cuenta = await crearCuenta();
    const carrito = primeraFila(
      await db.query<{ id: string }>(`INSERT INTO carts (user_id) VALUES ($1) RETURNING id`, [
        cuenta,
      ]),
    ).id;
    const nuevoPedido = (estado: string): Promise<unknown> =>
      db.query(
        `INSERT INTO orders (order_number, order_type, user_id, cart_id, status, shipping_street, shipping_method)
         VALUES ($1, 'b2c', $2, $3, $4::order_status, 'Calle 1', 'home_delivery')`,
        [randomUUID(), cuenta, carrito, estado],
      );
    await nuevoPedido('pending');
    await expect(nuevoPedido('pending')).rejects.toThrow(/duplicate key|unique/i);
    await nuevoPedido('paid'); // otro estado no colisiona con el índice parcial
  });
});

// ── Stock: no negativo + decremento condicional (Lost Update) ────────────────
describe('Stock y concurrencia (2.3 §5)', () => {
  it('CHECK stock >= 0 rechaza dejar el stock en negativo (CU-E04 E1)', async () => {
    const juego = await crearJuego(3);
    await expect(
      db.query(`UPDATE products SET stock = -1 WHERE id = $1`, [juego]),
    ).rejects.toThrow(/check|stock/i);
  });

  it('decremento condicional atómico: el segundo OUT sin stock afecta 0 filas (CU-012)', async () => {
    const juego = await crearJuego(5);
    const decrementar = async (n: number): Promise<number | null> =>
      (
        await db.query(
          `UPDATE products SET stock = stock - $1 WHERE id = $2 AND stock >= $1`,
          [n, juego],
        )
      ).rowCount;

    expect(await decrementar(5)).toBe(1); // consume todo
    expect(await decrementar(1)).toBe(0); // sin stock → 0 filas (en la app: rollback → en_revision)

    const stock = primeraFila(
      await db.query<{ stock_actual: number }>(`SELECT stock AS stock_actual FROM products WHERE id = $1`, [
        juego,
      ]),
    ).stock_actual;
    expect(stock).toBe(0); // nunca negativo
  });
});

// ── Rangos de sesión de uso ─────────────────────────────────────────────────
describe('Sesiones de uso en el aula (CU-029)', () => {
  async function docenteConInstitucion(): Promise<string> {
    const inst = await crearInstitucion();
    return primeraFila(
      await db.query<{ id: string }>(
        `INSERT INTO institutional_teachers (institution_id, invited_email, is_admin, status, user_id)
         VALUES ($1, $2, false, 'active', $3) RETURNING id`,
        [inst, `${randomUUID()}@profe.com`, await crearCuenta()],
      ),
    ).id;
  }

  const APRENDIZAJES = 'los chicos entendieron fracciones con el tablero';

  it('CHECK de alumnos 1..100 y duración 5..240 minutos', async () => {
    const docente = await docenteConInstitucion();
    const juego = await crearJuego();

    const cargar = (alumnos: number, duracion: number): Promise<unknown> =>
      db.query(
        `INSERT INTO game_sessions
           (institutional_teacher_id, product_id, session_date, group_name,
            student_count, duration_minutes, teacher_satisfaction, key_learnings)
         VALUES ($1, $2, current_date, '4B', $3, $4, 5, $5)`,
        [docente, juego, alumnos, duracion, APRENDIZAJES],
      );

    await cargar(28, 45); // válido
    await expect(cargar(0, 45)).rejects.toThrow(/check|student_count/i);
    await expect(cargar(101, 45)).rejects.toThrow(/check|student_count/i);
    await expect(cargar(28, 4)).rejects.toThrow(/check|duration_minutes/i);
    await expect(cargar(28, 241)).rejects.toThrow(/check|duration_minutes/i);
  });

  it('RN-002/004/005: fecha no futura, aprendizajes ≥ 20 caracteres y satisfacción 1..5', async () => {
    const docente = await docenteConInstitucion();
    const juego = await crearJuego();

    const cargar = (fecha: string, satisfaccion: number, aprendizajes: string): Promise<unknown> =>
      db.query(
        `INSERT INTO game_sessions
           (institutional_teacher_id, product_id, session_date, group_name,
            student_count, duration_minutes, teacher_satisfaction, key_learnings)
         VALUES ($1, $2, ${fecha}, '4B', 28, 45, $3, $4)`,
        [docente, juego, satisfaccion, aprendizajes],
      );

    await cargar('current_date', 5, APRENDIZAJES); // válido
    await expect(cargar("current_date + 1", 5, APRENDIZAJES)).rejects.toThrow(/session_date/i);
    await expect(cargar('current_date', 5, 'corto')).rejects.toThrow(/key_learnings/i);
    await expect(cargar('current_date', 6, APRENDIZAJES)).rejects.toThrow(/teacher_satisfaction/i);
    await expect(cargar('current_date', 0, APRENDIZAJES)).rejects.toThrow(/teacher_satisfaction/i);
  });
});

// ── Append-only (NFR-S6) ────────────────────────────────────────────────────
describe('Append-only por trigger (NFR-S6)', () => {
  it('audit_log: INSERT sí, UPDATE y DELETE fallan', async () => {
    const id = primeraFila(
      await db.query<{ id: string }>(
        `INSERT INTO audit_log (action, entity_type, entity_id)
         VALUES ('SesionIniciada', 'user', gen_random_uuid()) RETURNING id`,
      ),
    ).id;
    await expect(
      db.query(`UPDATE audit_log SET action = 'Otro' WHERE id = $1`, [id]),
    ).rejects.toThrow(/append-only/i);
    await expect(db.query(`DELETE FROM audit_log WHERE id = $1`, [id])).rejects.toThrow(
      /append-only/i,
    );
  });

  it('stock_movements (kardex): inmutable — UPDATE falla', async () => {
    const juego = await crearJuego();
    const id = primeraFila(
      await db.query<{ id: string }>(
        `INSERT INTO stock_movements (product_id, movement_type, quantity) VALUES ($1, 'sale', -1) RETURNING id`,
        [juego],
      ),
    ).id;
    await expect(
      db.query(`UPDATE stock_movements SET quantity = -2 WHERE id = $1`, [id]),
    ).rejects.toThrow(/append-only/i);
  });

  it('outbox_emails: el worker puede UPDATE (status/attempts) pero no DELETE', async () => {
    const id = primeraFila(
      await db.query<{ id: string }>(
        `INSERT INTO outbox_emails (template, recipient, subject, body)
         VALUES ('confirmacion_compra', 'a@b.com', 'Asunto', '<p>cuerpo</p>') RETURNING id`,
      ),
    ).id;
    // el worker marca enviado — permitido
    await db.query(
      `UPDATE outbox_emails SET status = 'sent', sent_at = now(), attempts = 1 WHERE id = $1`,
      [id],
    );
    // pero no se borra
    await expect(db.query(`DELETE FROM outbox_emails WHERE id = $1`, [id])).rejects.toThrow(
      /DELETE no permitido/i,
    );
  });
});
