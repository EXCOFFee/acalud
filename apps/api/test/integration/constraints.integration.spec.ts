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
    `INSERT INTO cuentas (email, hash_password, nombre, apellido)
     VALUES ($1, 'hash', 'Nombre', 'Apellido') RETURNING id`,
    [email],
  );
  return primeraFila(r).id;
}

async function crearJuego(stock = 10): Promise<string> {
  const r = await db.query<{ id: string }>(
    `INSERT INTO juegos (nombre, precio_lista, peso_gramos, stock_actual, publicado)
     VALUES ('Juego', 1000, 500, $1, true) RETURNING id`,
    [stock],
  );
  return primeraFila(r).id;
}

async function crearInstitucion(): Promise<string> {
  const cuit = `30-${Math.floor(10_000_000 + Math.random() * 89_999_999)}-9`;
  const r = await db.query<{ id: string }>(
    `INSERT INTO instituciones (razon_social, cuit, nivel_educativo, domicilio)
     VALUES ('Escuela', $1, 'primario', '{}'::jsonb) RETURNING id`,
    [cuit],
  );
  return primeraFila(r).id;
}

async function crearPedido(cuentaId: string): Promise<string> {
  const r = await db.query<{ id: string }>(
    `INSERT INTO pedidos (numero, comprador_tipo, cuenta_id, domicilio_snapshot, envio_modalidad)
     VALUES ($1, 'personal', $2, '{}'::jsonb, 'domicilio') RETURNING id`,
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
        `INSERT INTO pagos_procesados (payment_id, pedido_id, estado_mp, payload_crudo)
         VALUES ($1, $2, 'approved', '{}'::jsonb)`,
        [paymentId, pedido],
      );
    await insertar();
    await expect(insertar()).rejects.toThrow(/duplicate key|unique/i);
  });

  it('UNIQUE cuentas(email) es case-insensitive (CU-001 A1)', async () => {
    const email = `${randomUUID()}@ESCUELA.edu.ar`;
    await crearCuenta(email);
    await expect(crearCuenta(email.toLowerCase())).rejects.toThrow(/duplicate key|unique/i);
  });

  it('UNIQUE respuestas(encuesta, cuenta): una respuesta por docente (S-17)', async () => {
    const cuenta = await crearCuenta();
    const enc = primeraFila(
      await db.query<{ id: string }>(`INSERT INTO encuestas (titulo) VALUES ('E') RETURNING id`),
    ).id;
    const responder = (): Promise<unknown> =>
      db.query(
        `INSERT INTO respuestas (encuesta_id, cuenta_id, contenido) VALUES ($1, $2, '{}'::jsonb)`,
        [enc, cuenta],
      );
    await responder();
    await expect(responder()).rejects.toThrow(/duplicate key|unique/i);
  });

  it('UNIQUE catalogo_institucional(institucion, juego): alta por lote idempotente (CU-024)', async () => {
    const inst = await crearInstitucion();
    const juego = await crearJuego();
    const alta = (): Promise<unknown> =>
      db.query(`INSERT INTO catalogo_institucional (institucion_id, juego_id) VALUES ($1, $2)`, [
        inst,
        juego,
      ]);
    await alta();
    await expect(alta()).rejects.toThrow(/duplicate key|unique/i);
  });

  it('UNIQUE parcial de membresías: no dos vigentes por (institución, email); re-invitar tras desvincular sí (CU-026 E1)', async () => {
    const inst = await crearInstitucion();
    const email = `${randomUUID()}@profe.com`;
    const invitar = (): Promise<unknown> =>
      db.query(
        `INSERT INTO membresias (institucion_id, email_invitado, rol) VALUES ($1, $2, 'docente')`,
        [inst, email],
      );
    await invitar();
    await expect(invitar()).rejects.toThrow(/duplicate key|unique/i);

    await db.query(
      `UPDATE membresias SET estado = 'desvinculada', desvinculada_en = now()
       WHERE institucion_id = $1 AND lower(email_invitado) = lower($2)`,
      [inst, email],
    );
    await invitar(); // ahora sí, el índice parcial lo permite

    const n = primeraFila(
      await db.query<{ n: number }>(
        `SELECT count(*)::int AS n FROM membresias WHERE institucion_id = $1`,
        [inst],
      ),
    ).n;
    expect(n).toBe(2);
  });

  it('un solo pedido pendiente_pago por carrito-origen (idempotencia por pedido, CU-012)', async () => {
    const cuenta = await crearCuenta();
    const carrito = primeraFila(
      await db.query<{ id: string }>(`INSERT INTO carritos (cuenta_id) VALUES ($1) RETURNING id`, [
        cuenta,
      ]),
    ).id;
    const nuevoPedido = (estado: string): Promise<unknown> =>
      db.query(
        `INSERT INTO pedidos (numero, comprador_tipo, cuenta_id, carrito_id, estado, domicilio_snapshot, envio_modalidad)
         VALUES ($1, 'personal', $2, $3, $4, '{}'::jsonb, 'domicilio')`,
        [randomUUID(), cuenta, carrito, estado],
      );
    await nuevoPedido('pendiente_pago');
    await expect(nuevoPedido('pendiente_pago')).rejects.toThrow(/duplicate key|unique/i);
    await nuevoPedido('rechazado'); // otro estado no colisiona con el índice parcial
  });
});

// ── Stock: no negativo + decremento condicional (Lost Update) ────────────────
describe('Stock y concurrencia (2.3 §5)', () => {
  it('CHECK stock_actual >= 0 rechaza dejar el stock en negativo (CU-E04 E1)', async () => {
    const juego = await crearJuego(3);
    await expect(
      db.query(`UPDATE juegos SET stock_actual = -1 WHERE id = $1`, [juego]),
    ).rejects.toThrow(/check|stock_actual/i);
  });

  it('decremento condicional atómico: el segundo OUT sin stock afecta 0 filas (CU-012)', async () => {
    const juego = await crearJuego(5);
    const decrementar = async (n: number): Promise<number | null> =>
      (
        await db.query(
          `UPDATE juegos SET stock_actual = stock_actual - $1 WHERE id = $2 AND stock_actual >= $1`,
          [n, juego],
        )
      ).rowCount;

    expect(await decrementar(5)).toBe(1); // consume todo
    expect(await decrementar(1)).toBe(0); // sin stock → 0 filas (en la app: rollback → en_revision)

    const stock = primeraFila(
      await db.query<{ stock_actual: number }>(`SELECT stock_actual FROM juegos WHERE id = $1`, [
        juego,
      ]),
    ).stock_actual;
    expect(stock).toBe(0); // nunca negativo
  });
});

// ── Rangos de sesión de uso ─────────────────────────────────────────────────
describe('Rangos de sesión de uso (PI-05)', () => {
  it('CHECK de alumnos 1..100 y duración 5..240 minutos', async () => {
    const inst = await crearInstitucion();
    const juego = await crearJuego();
    const membresia = primeraFila(
      await db.query<{ id: string }>(
        `INSERT INTO membresias (institucion_id, email_invitado, rol, estado, cuenta_id)
         VALUES ($1, $2, 'docente', 'activa', $3) RETURNING id`,
        [inst, `${randomUUID()}@profe.com`, await crearCuenta()],
      ),
    ).id;

    const cargar = (alumnos: number, duracion: number): Promise<unknown> =>
      db.query(
        `INSERT INTO sesiones_uso
           (membresia_id, institucion_id, juego_id, fecha, curso, cantidad_alumnos, duracion_min, editable_hasta)
         VALUES ($1, $2, $3, current_date, '4B', $4, $5, now() + interval '48 hours')`,
        [membresia, inst, juego, alumnos, duracion],
      );

    await cargar(28, 45); // válido
    await expect(cargar(0, 45)).rejects.toThrow(/check|cantidad_alumnos/i);
    await expect(cargar(101, 45)).rejects.toThrow(/check|cantidad_alumnos/i);
    await expect(cargar(28, 4)).rejects.toThrow(/check|duracion_min/i);
    await expect(cargar(28, 241)).rejects.toThrow(/check|duracion_min/i);
  });
});

// ── Append-only (NFR-S6) ────────────────────────────────────────────────────
describe('Append-only por trigger (NFR-S6)', () => {
  it('eventos_auditoria: INSERT sí, UPDATE y DELETE fallan', async () => {
    const id = primeraFila(
      await db.query<{ id: string }>(
        `INSERT INTO eventos_auditoria (tipo, sujeto_tipo) VALUES ('SesionIniciada', 'cuenta') RETURNING id`,
      ),
    ).id;
    await expect(
      db.query(`UPDATE eventos_auditoria SET tipo = 'Otro' WHERE id = $1`, [id]),
    ).rejects.toThrow(/append-only/i);
    await expect(db.query(`DELETE FROM eventos_auditoria WHERE id = $1`, [id])).rejects.toThrow(
      /append-only/i,
    );
  });

  it('movimientos_stock (kardex): inmutable — UPDATE falla', async () => {
    const juego = await crearJuego();
    const id = primeraFila(
      await db.query<{ id: string }>(
        `INSERT INTO movimientos_stock (juego_id, tipo, cantidad_signada) VALUES ($1, 'venta', -1) RETURNING id`,
        [juego],
      ),
    ).id;
    await expect(
      db.query(`UPDATE movimientos_stock SET cantidad_signada = -2 WHERE id = $1`, [id]),
    ).rejects.toThrow(/append-only/i);
  });

  it('outbox_emails: el worker puede UPDATE (estado/intentos) pero no DELETE', async () => {
    const id = primeraFila(
      await db.query<{ id: string }>(
        `INSERT INTO outbox_emails (email_id, tipo, destinatario, payload)
         VALUES ($1, 'confirmacion_compra', 'a@b.com', '{}'::jsonb) RETURNING id`,
        [randomUUID()],
      ),
    ).id;
    // el worker marca enviado — permitido
    await db.query(`UPDATE outbox_emails SET estado = 'enviado', intentos = 1 WHERE id = $1`, [id]);
    // pero no se borra
    await expect(db.query(`DELETE FROM outbox_emails WHERE id = $1`, [id])).rejects.toThrow(
      /DELETE no permitido/i,
    );
  });
});
