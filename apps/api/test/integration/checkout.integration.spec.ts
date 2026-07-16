import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ProcesarPago } from '../../src/modules/compras/application/procesar-pago';
import { MercadoPagoFakeAdapter } from '../../src/modules/compras/infrastructure/adapters/mercado-pago-fake.adapter';
import { type CtxApp, levantarApp } from './helpers/app';

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
  await ctx.pg.query(`UPDATE cuentas SET estado = 'verificada' WHERE email = $1`, [email]);
  const login = await ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena: PW });
  return { token: login.body.token as string, email };
}

async function crearJuego(precio: number, stock: number): Promise<string> {
  const id = randomUUID();
  await ctx.pg.query(
    `INSERT INTO juegos (id, nombre, precio_lista, stock_actual, publicado) VALUES ($1,$2,$3,$4,true)`,
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
    .send({ modalidad_envio: 'domicilio', codigo_postal: '1900', domicilio: DOM });

async function stock(juegoId: string): Promise<number> {
  const r = await ctx.pg.query<{ stock_actual: number }>(
    `SELECT stock_actual FROM juegos WHERE id = $1`,
    [juegoId],
  );
  return r.rows[0]!.stock_actual;
}

async function estado(pedidoId: string): Promise<string> {
  const r = await ctx.pg.query<{ estado: string }>(`SELECT estado FROM pedidos WHERE id = $1`, [
    pedidoId,
  ]);
  return r.rows[0]!.estado;
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
    expect(await estado(pedidoId)).toBe('pendiente_pago');

    const resultado = await procesar.ejecutar(MercadoPagoFakeAdapter.paymentIdDe(pedidoId));
    expect(resultado).toBe('pagado');

    expect(await estado(pedidoId)).toBe('pagado');
    expect(await stock(jx)).toBe(3); // 5 − 2, exactamente
    expect(await stock(jy)).toBe(4); // 5 − 1
    // Carrito vaciado.
    expect((await ctx.request.get('/api/v1/carrito').set(bearer(token))).body.lineas).toHaveLength(0);
    // Email de confirmación encolado (exactamente uno).
    const mails = await ctx.pg.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM outbox_emails WHERE tipo = 'confirmacion_compra' AND destinatario = $1`,
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

    expect(await procesar.ejecutar(paymentId)).toBe('pagado');
    expect(await stock(jx)).toBe(8); // 10 − 2

    // Segunda notificación con el MISMO payment_id.
    expect(await procesar.ejecutar(paymentId)).toBe('ya_procesado');
    expect(await stock(jx)).toBe(8); // NO se descontó de nuevo

    // No se encoló un segundo email.
    const mails = await ctx.pg.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM outbox_emails WHERE tipo = 'confirmacion_compra' AND destinatario = $1`,
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
    expect([r1, r2].sort()).toEqual(['en_revision', 'pagado']);
    expect([await estado(p1), await estado(p2)].sort()).toEqual(['en_revision', 'pagado']);
    // El stock se descontó EXACTAMENTE una vez.
    expect(await stock(jz)).toBe(0);
  });

  it('@scenario:CHK-CU012-ALT-001 · pago rechazado → rechazado, stock intacto, carrito conservado', async () => {
    const { token } = await usuarioVerificado();
    const jx = await crearJuego(10000, 5);
    await agregar(token, jx, 1);
    const pedidoId = (await checkout(token)).body.pedido_id as string;

    const resultado = await procesar.ejecutar(MercadoPagoFakeAdapter.paymentRechazadoDe(pedidoId));
    expect(resultado).toBe('rechazado');

    expect(await estado(pedidoId)).toBe('rechazado');
    expect(await stock(jx)).toBe(5); // intacto
    // El carrito se conserva para reintentar.
    expect((await ctx.request.get('/api/v1/carrito').set(bearer(token))).body.lineas).toHaveLength(1);
  });

  it('cuenta no verificada → 403; carrito vacío → 422; segundo checkout del mismo carrito → 409', async () => {
    // 403: registrada pero sin verificar.
    const email = `${randomUUID()}@escuela.edu.ar`;
    await ctx.request
      .post('/api/v1/auth/registro')
      .send({ email, contrasena: PW, nombre: 'N', apellido: 'A' });
    const noVerif = (await ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena: PW }))
      .body.token as string;
    const jx = await crearJuego(10000, 5);
    await agregar(noVerif, jx, 1);
    expect((await checkout(noVerif)).status).toBe(403);

    // 422: verificada pero carrito vacío.
    const { token } = await usuarioVerificado();
    expect((await checkout(token)).status).toBe(422);

    // 409: ya hay un pedido pendiente_pago para ese carrito.
    await agregar(token, jx, 1);
    expect((await checkout(token)).status).toBe(201);
    expect((await checkout(token)).status).toBe(409);
  });
});
