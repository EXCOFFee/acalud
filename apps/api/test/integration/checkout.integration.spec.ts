import { createHmac, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ProcesarPago } from '../../src/modules/compras/application/procesar-pago';
import { MercadoPagoFakeAdapter } from '../../src/modules/compras/infrastructure/adapters/mercado-pago-fake.adapter';
import { type CtxApp, levantarApp } from './helpers/app';

const MP_WEBHOOK_SECRET_TEST = 'secreto-de-prueba-integracion';

function firmarWebhookMp(dataId: string, xRequestId: string, secret = MP_WEBHOOK_SECRET_TEST) {
  const ts = Date.now().toString();
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hash = createHmac('sha256', secret).update(manifest).digest('hex');
  return { 'x-signature': `ts=${ts},v1=${hash}`, 'x-request-id': xRequestId };
}

// CU-012 (checkout) contra la app real + PostgreSQL real (Testcontainers). Los tests más
// importantes del proyecto: idempotencia y concurrencia con el UNIQUE/guards activos.
const PW = 'correcta-bateria-caballo-grapa';
const DOM = {
  calle: 'San Martín',
  numero: '123',
  codigo_postal: '1900',
  provincia: 'Buenos Aires',
  localidad: 'La Plata',
};

let ctx: CtxApp;
let procesar: ProcesarPago;

beforeAll(async () => {
  process.env.MP_WEBHOOK_SECRET = MP_WEBHOOK_SECRET_TEST;
  ctx = await levantarApp();
  procesar = ctx.app.get(ProcesarPago);
});

afterAll(async () => {
  await ctx?.detener();
});

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

async function usuarioVerificado(): Promise<{ token: string; email: string }> {
  const email = `${randomUUID()}@escuela.edu.ar`;
  await ctx.request
    .post('/api/v1/auth/registro')
    .send({ email, contrasena: PW, nombre: 'N', apellido: 'A' });
  await ctx.pg.query(`UPDATE users SET email_verified = true WHERE email = $1`, [email]);
  const login = await ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena: PW });
  return { token: login.body.token as string, email };
}

async function crearJuego(precio: number, stock: number): Promise<string> {
  const id = randomUUID();
  await ctx.pg.query(
    `INSERT INTO products (id, name, price, stock, is_active) VALUES ($1,$2,$3,$4,true)`,
    [id, `J-${id.slice(0, 8)}`, precio, stock],
  );
  return id;
}

const agregar = (t: string, juego: string, cant: number) =>
  ctx.request.put(`/api/v1/carrito/lineas/${juego}`).set(bearer(t)).send({ cantidad: cant });

const checkout = (t: string) =>
  ctx.request
    .post('/api/v1/checkout')
    .set(bearer(t))
    .send({ modalidad_envio: 'home_delivery', codigo_postal: '1900', domicilio: DOM });

async function stock(juegoId: string): Promise<number> {
  const r = await ctx.pg.query<{ stock_actual: number }>(
    `SELECT stock AS stock_actual FROM products WHERE id = $1`,
    [juegoId],
  );
  return r.rows[0]!.stock_actual;
}

async function estado(pedidoId: string): Promise<string> {
  const r = await ctx.pg.query<{ estado: string }>(`SELECT status AS estado FROM orders WHERE id = $1`, [
    pedidoId,
  ]);
  return r.rows[0]!.estado;
}

async function pagoGuardado(
  pedidoId: string,
): Promise<{ preferencia: string | null; paymentIdMp: string | null }> {
  const r = await ctx.pg.query<{ preferencia: string | null; paymentIdMp: string | null }>(
    `SELECT payment_preference_id AS preferencia, payment_id_mp AS "paymentIdMp" FROM orders WHERE id = $1`,
    [pedidoId],
  );
  return r.rows[0]!;
}

describe('CU-012 · Checkout', () => {
  it('@scenario:CHK-CU012-HAPPY-001 · pago aprobado → pagado, stock descontado, carrito vaciado, email', async () => {
    const { token, email } = await usuarioVerificado();
    const jx = await crearJuego(10000, 5);
    const jy = await crearJuego(5000, 5);
    await agregar(token, jx, 2);
    await agregar(token, jy, 1);

    const co = await checkout(token);
    expect(co.status).toBe(201);
    const pedidoId = co.body.pedido_id as string;
    expect(co.body.init_point).toContain(pedidoId);
    expect(await estado(pedidoId)).toBe('pending');
    // CU-12 (paso 14): el preference_id de Mercado Pago queda guardado tras iniciar el checkout.
    expect((await pagoGuardado(pedidoId)).preferencia).toBe(`fake-pref-${pedidoId}`);

    const paymentId = MercadoPagoFakeAdapter.paymentIdDe(pedidoId);
    const resultado = await procesar.ejecutar(paymentId);
    expect(resultado).toBe('paid');

    expect(await estado(pedidoId)).toBe('paid');
    // CU-12 (poscondición): "se guarda el payment_id_mp" al aprobarse el pago.
    expect((await pagoGuardado(pedidoId)).paymentIdMp).toBe(paymentId);
    expect(await stock(jx)).toBe(3); // 5 − 2, exactamente
    expect(await stock(jy)).toBe(4); // 5 − 1
    // Carrito vaciado.
    expect((await ctx.request.get('/api/v1/carrito').set(bearer(token))).body.lineas).toHaveLength(0);
    // Email de confirmación encolado (exactamente uno).
    const mails = await ctx.pg.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM outbox_emails WHERE template = 'confirmacion_compra' AND recipient = $1`,
      [email],
    );
    expect(mails.rows[0]!.n).toBe(1);
  });

  it('@scenario:CHK-CU012-EXC-001 · webhook duplicado (mismo payment_id) = no-op, sin doble descuento', async () => {
    const { token, email } = await usuarioVerificado();
    const jx = await crearJuego(10000, 10);
    await agregar(token, jx, 2);
    const pedidoId = (await checkout(token)).body.pedido_id as string;
    const paymentId = MercadoPagoFakeAdapter.paymentIdDe(pedidoId);

    expect(await procesar.ejecutar(paymentId)).toBe('paid');
    expect(await stock(jx)).toBe(8); // 10 − 2

    // Segunda notificación con el MISMO payment_id.
    expect(await procesar.ejecutar(paymentId)).toBe('already_processed');
    expect(await stock(jx)).toBe(8); // NO se descontó de nuevo

    // No se encoló un segundo email.
    const mails = await ctx.pg.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM outbox_emails WHERE template = 'confirmacion_compra' AND recipient = $1`,
      [email],
    );
    expect(mails.rows[0]!.n).toBe(1);
  });

  it('@scenario:CHK-CU012-EXC-002 · dos pagos concurrentes por el último ítem: uno gana, el otro en_revision (sin doble descuento)', async () => {
    const jz = await crearJuego(8000, 1); // último ítem
    const u1 = await usuarioVerificado();
    const u2 = await usuarioVerificado();
    await agregar(u1.token, jz, 1);
    await agregar(u2.token, jz, 1);
    const p1 = (await checkout(u1.token)).body.pedido_id as string;
    const p2 = (await checkout(u2.token)).body.pedido_id as string;

    // Ambos ProcesarPago EN PARALELO por el mismo último ítem.
    const [r1, r2] = await Promise.all([
      procesar.ejecutar(MercadoPagoFakeAdapter.paymentIdDe(p1)),
      procesar.ejecutar(MercadoPagoFakeAdapter.paymentIdDe(p2)),
    ]);

    // Uno pagó, el otro quedó en_revision (StockInsuficiente limpio).
    expect([r1, r2].sort()).toEqual(['paid', 'under_review']);
    expect([await estado(p1), await estado(p2)].sort()).toEqual(['paid', 'under_review']);
    // El stock se descontó EXACTAMENTE una vez.
    expect(await stock(jz)).toBe(0);
  });

  it('@scenario:CHK-CU012-ALT-001 · pago rechazado → sigue pending y reintentable, stock intacto, carrito conservado', async () => {
    const { token } = await usuarioVerificado();
    const jx = await crearJuego(10000, 5);
    await agregar(token, jx, 1);
    const pedidoId = (await checkout(token)).body.pedido_id as string;

    const resultado = await procesar.ejecutar(MercadoPagoFakeAdapter.paymentRechazadoDe(pedidoId));
    expect(resultado).toBe('rejected');

    // El rechazo NO crea un estado propio: el pedido queda reintentable (CU-12).
    expect(await estado(pedidoId)).toBe('pending');
    expect(await stock(jx)).toBe(5); // intacto
    // El carrito se conserva para reintentar.
    expect((await ctx.request.get('/api/v1/carrito').set(bearer(token))).body.lineas).toHaveLength(1);
  });

  it('la cuenta sin verificar puede comprar; carrito vacío → 422; segundo checkout del mismo carrito → 409', async () => {
    // CU-12 enumera sus precondiciones de forma cerrada y NO incluye el correo verificado: la
    // cuenta queda operativa desde el registro (CU-01), así que la verificación no bloquea.
    const email = `${randomUUID()}@escuela.edu.ar`;
    await ctx.request
      .post('/api/v1/auth/registro')
      .send({ email, contrasena: PW, nombre: 'N', apellido: 'A' });
    const noVerif = (await ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena: PW }))
      .body.token as string;
    const jx = await crearJuego(10000, 5);
    await agregar(noVerif, jx, 1);
    expect((await checkout(noVerif)).status).toBe(201);

    // 422: carrito vacío.
    const { token } = await usuarioVerificado();
    expect((await checkout(token)).status).toBe(422);

    // 409: ya hay un pedido pendiente_pago para ese carrito.
    await agregar(token, jx, 1);
    expect((await checkout(token)).status).toBe(201);
    expect((await checkout(token)).status).toBe(409);
  });

  describe('Webhook de Mercado Pago (HTTP, firma real — CU-12 RN-004/RNF-002/A7)', () => {
    it('sin header x-signature → 401, el pedido no se toca', async () => {
      const { token } = await usuarioVerificado();
      const jx = await crearJuego(10000, 5);
      await agregar(token, jx, 1);
      const pedidoId = (await checkout(token)).body.pedido_id as string;
      const paymentId = MercadoPagoFakeAdapter.paymentIdDe(pedidoId);

      const r = await ctx.request.post(`/api/v1/webhooks/mercadopago?data.id=${paymentId}`);
      expect(r.status).toBe(401);
      expect(await estado(pedidoId)).toBe('pending');
    });

    it('firma calculada con un secreto incorrecto → 401, el pedido no se toca', async () => {
      const { token } = await usuarioVerificado();
      const jx = await crearJuego(10000, 5);
      await agregar(token, jx, 1);
      const pedidoId = (await checkout(token)).body.pedido_id as string;
      const paymentId = MercadoPagoFakeAdapter.paymentIdDe(pedidoId);

      const headers = firmarWebhookMp(paymentId, 'req-falso', 'secreto-equivocado');
      const r = await ctx.request
        .post(`/api/v1/webhooks/mercadopago?data.id=${paymentId}`)
        .set(headers);
      expect(r.status).toBe(401);
      expect(await estado(pedidoId)).toBe('pending');
    });

    it('firma válida → 200, pedido pasa a paid; repetirla es idempotente', async () => {
      const { token } = await usuarioVerificado();
      const jx = await crearJuego(10000, 5);
      await agregar(token, jx, 1);
      const pedidoId = (await checkout(token)).body.pedido_id as string;
      const paymentId = MercadoPagoFakeAdapter.paymentIdDe(pedidoId);

      const headers = firmarWebhookMp(paymentId, 'req-1');
      const r1 = await ctx.request
        .post(`/api/v1/webhooks/mercadopago?data.id=${paymentId}`)
        .set(headers);
      expect(r1.status).toBe(200);
      expect(r1.body.resultado).toBe('paid');
      expect(await estado(pedidoId)).toBe('paid');
      expect(await stock(jx)).toBe(4); // 5 − 1, una sola vez

      // Reenvío (MP reintenta si no confirmás rápido): misma firma, mismo data.id → no-op.
      const headers2 = firmarWebhookMp(paymentId, 'req-2');
      const r2 = await ctx.request
        .post(`/api/v1/webhooks/mercadopago?data.id=${paymentId}`)
        .set(headers2);
      expect(r2.status).toBe(200);
      expect(r2.body.resultado).toBe('already_processed');
      expect(await stock(jx)).toBe(4); // sin doble descuento
    });
  });
});
