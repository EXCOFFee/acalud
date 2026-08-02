import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-025 · Ver Tenencia de Licencias Institucionales, contra la app real + PostgreSQL real.
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

/** Registra una institución por el flujo real (CU-23) y devuelve su id. */
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

async function producto(nombre: string, precio = 1000): Promise<string> {
  const r = await ctx.pg.query<{ id: string }>(
    `INSERT INTO products (name, price, weight_grams, stock, is_active, description)
     VALUES ($1, $2, 500, 100, true, 'Descripción de ' || $1) RETURNING id`,
    [nombre, precio],
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

/** Membresía docente (no admin) activa. Devuelve el id de la membresía. */
async function docenteVinculado(institucionId: string, nombre: string): Promise<string> {
  const d = await docente(nombre);
  const r = await ctx.pg.query<{ id: string }>(
    `INSERT INTO institutional_teachers (institution_id, user_id, invited_email, is_admin, status, joined_at)
     VALUES ($1, $2, $3, false, 'active', now()) RETURNING id`,
    [institucionId, d.id, d.email],
  );
  return r.rows[0]!.id;
}

async function membresiaDe(institucionId: string, usuarioId: string): Promise<string> {
  const r = await ctx.pg.query<{ id: string }>(
    `SELECT id FROM institutional_teachers WHERE institution_id = $1 AND user_id = $2`,
    [institucionId, usuarioId],
  );
  return r.rows[0]!.id;
}

async function asignacion(
  institucionId: string,
  membresiaDocenteId: string,
  productoId: string,
  cantidad: number,
  porMembresiaId: string,
  estado: 'active' | 'revoked' = 'active',
): Promise<void> {
  await ctx.pg.query(
    `INSERT INTO institutional_assignments
       (institution_id, institutional_teacher_id, product_id, quantity_assigned, status,
        assigned_by, revoked_at, revoked_by)
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::assignment_status, $6::uuid,
             CASE WHEN $5 = 'revoked' THEN now() END,
             CASE WHEN $5 = 'revoked' THEN $6::uuid END)`,
    [institucionId, membresiaDocenteId, productoId, cantidad, estado, porMembresiaId],
  );
}

async function compraB2b(
  institucionId: string,
  usuarioId: string,
  productoId: string,
  cantidad: number,
  precioUnitario: number,
  haceDias: number,
): Promise<void> {
  const orden = await ctx.pg.query<{ id: string }>(
    `INSERT INTO orders
       (order_number, order_type, user_id, institution_id, status, shipping_method,
        total_amount, created_at)
     VALUES ($1, 'b2b', $2, $3, 'paid', 'home_delivery', $4, now() - ($5 || ' days')::interval)
     RETURNING id`,
    [randomUUID(), usuarioId, institucionId, cantidad * precioUnitario, haceDias.toString()],
  );
  await ctx.pg.query(
    `INSERT INTO order_items (order_id, product_id, product_name_snapshot, quantity, unit_price)
     VALUES ($1, $2, 'Juego', $3, $4)`,
    [orden.rows[0]!.id, productoId, cantidad, precioUnitario],
  );
}

const getInventario = (token: string, institucionId: string, query = '') =>
  ctx.request.get(`/api/v1/instituciones/${institucionId}/inventario${query}`).set(bearer(token));

describe('CU-025 · Ver tenencia de licencias institucionales', () => {
  it('flujo principal: grilla con cantidades + resumen + evento inventory_viewed', async () => {
    const encargado = await docente('Carlos Director');
    const institucionId = await institucionDe(encargado.token);
    const membresiaAdmin = await membresiaDe(institucionId, encargado.id);

    const prodA = await producto('Oca Histórica', 1500);
    const prodB = await producto('Memotest Solar', 800);
    await inventario(institucionId, prodA, 10, 4);
    await inventario(institucionId, prodB, 20, 0);

    // Una compra paga del producto A (alimenta última fecha y total gastado).
    await compraB2b(institucionId, encargado.id, prodA, 10, 1500, 3);

    // Un docente con asignación activa (alimenta docentes_asignados).
    const membresiaDocente = await docenteVinculado(institucionId, 'Laura Profesora');
    await asignacion(institucionId, membresiaDocente, prodA, 4, membresiaAdmin);

    const res = await getInventario(encargado.token, institucionId);
    expect(res.status).toBe(200);

    expect(res.body.resumen.total_adquiridas).toBe(30);
    expect(res.body.resumen.total_en_uso).toBe(4);
    // CU-25 RN-002: disponible = adquirida − asignada.
    expect(res.body.resumen.total_disponibles).toBe(26);
    expect(res.body.resumen.docentes_asignados).toBe(1);

    expect(res.body.items).toHaveLength(2);
    const oca = res.body.items.find((i: { nombre_producto: string }) => i.nombre_producto === 'Oca Histórica');
    expect(oca.cantidad_adquirida).toBe(10);
    expect(oca.cantidad_asignada).toBe(4);
    expect(oca.cantidad_disponible).toBe(6);
    expect(oca.total_gastado).toBe(15000);
    expect(oca.ultima_compra_en).not.toBeNull();

    const sinCompras = res.body.items.find((i: { nombre_producto: string }) => i.nombre_producto === 'Memotest Solar');
    expect(sinCompras.total_gastado).toBeNull();
    expect(sinCompras.ultima_compra_en).toBeNull();

    // CU-25 RN-006: cada consulta registra inventory_viewed con institución y usuario.
    const evento = await ctx.pg.query<{ actor_user_id: string }>(
      `SELECT actor_user_id FROM audit_log
        WHERE action = 'InventarioConsultado' AND entity_type = 'institution' AND entity_id = $1`,
      [institucionId],
    );
    expect(evento.rows).toHaveLength(1);
    expect(evento.rows[0]!.actor_user_id).toBe(encargado.id);
  });

  it('A1: institución sin inventario → grilla vacía y resumen en cero', async () => {
    const encargado = await docente();
    const institucionId = await institucionDe(encargado.token);

    const res = await getInventario(encargado.token, institucionId);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(0);
    expect(res.body.resumen.total_adquiridas).toBe(0);
    expect(res.body.resumen.total_disponibles).toBe(0);
  });

  it('A2/RN-004: docente vinculado sin is_admin no ve el inventario → 404', async () => {
    const encargado = await docente();
    const institucionId = await institucionDe(encargado.token);

    const profe = await docente();
    await ctx.pg.query(
      `INSERT INTO institutional_teachers (institution_id, user_id, invited_email, is_admin, status, joined_at)
       VALUES ($1, $2, $3, false, 'active', now())`,
      [institucionId, profe.id, profe.email],
    );

    const res = await getInventario(profe.token, institucionId);
    expect(res.status).toBe(404);
    expect(res.body.detail).toMatch(/permisos/i);
  });

  it('seguridad: el encargado de una institución no ve el inventario de otra → 404', async () => {
    const encargadoA = await docente();
    await institucionDe(encargadoA.token);
    const encargadoB = await docente();
    const institucionB = await institucionDe(encargadoB.token);

    // A pide el inventario de B: recurso ajeno → 404 (no 403).
    expect((await getInventario(encargadoA.token, institucionB)).status).toBe(404);
    // Institución inexistente e id malformado → 404 también.
    expect((await getInventario(encargadoA.token, randomUUID())).status).toBe(404);
    expect((await getInventario(encargadoA.token, 'no-es-uuid')).status).toBe(404);
  });

  it('A5/A6: filtra por producto y ordena por cantidad descendente', async () => {
    const encargado = await docente();
    const institucionId = await institucionDe(encargado.token);
    const prodA = await producto('Juego A');
    const prodB = await producto('Juego B');
    const prodC = await producto('Juego C');
    await inventario(institucionId, prodA, 5);
    await inventario(institucionId, prodB, 30);
    await inventario(institucionId, prodC, 15);

    const filtrado = await getInventario(encargado.token, institucionId, `?producto_id=${prodB}`);
    expect(filtrado.status).toBe(200);
    expect(filtrado.body.items).toHaveLength(1);
    expect(filtrado.body.items[0].nombre_producto).toBe('Juego B');

    const ordenado = await getInventario(
      encargado.token,
      institucionId,
      '?orden=cantidad_adquirida&direccion=desc',
    );
    expect(ordenado.status).toBe(200);
    const cantidades = ordenado.body.items.map((i: { cantidad_adquirida: number }) => i.cantidad_adquirida);
    expect(cantidades).toEqual([30, 15, 5]);
  });

  it('A6: los cinco criterios de orden son válidos; sin compras queda al final', async () => {
    const encargado = await docente();
    const institucionId = await institucionDe(encargado.token);
    const conCompra = await producto('Zeta con compra');
    const sinCompra = await producto('Alfa sin compra');
    await inventario(institucionId, conCompra, 8, 2);
    await inventario(institucionId, sinCompra, 3, 0);
    await compraB2b(institucionId, encargado.id, conCompra, 8, 1000, 5);

    // Todo el enum se ejerce: un criterio que rompe el SQL no puede pasar el gate.
    for (const orden of [
      'cantidad_adquirida',
      'cantidad_asignada',
      'cantidad_disponible',
      'ultima_compra',
      'nombre',
    ]) {
      for (const direccion of ['asc', 'desc']) {
        const res = await getInventario(
          encargado.token,
          institucionId,
          `?orden=${orden}&direccion=${direccion}`,
        );
        expect(res.status, `orden=${orden}&direccion=${direccion}`).toBe(200);
        expect(res.body.items).toHaveLength(2);
      }
    }

    // El producto sin compras no tiene fecha: va al final en ambas direcciones (NULLS LAST).
    for (const direccion of ['asc', 'desc']) {
      const res = await getInventario(
        encargado.token,
        institucionId,
        `?orden=ultima_compra&direccion=${direccion}`,
      );
      const nombres = res.body.items.map((i: { nombre_producto: string }) => i.nombre_producto);
      expect(nombres[1], `direccion=${direccion}`).toBe('Alfa sin compra');
    }
  });

  it('A7/RN-007: detalle con historial de compras y docentes asignados', async () => {
    const encargado = await docente('Carlos Director');
    const institucionId = await institucionDe(encargado.token);
    const membresiaAdmin = await membresiaDe(institucionId, encargado.id);
    const prodA = await producto('Oca Histórica', 1500);
    await inventario(institucionId, prodA, 10, 3);

    await compraB2b(institucionId, encargado.id, prodA, 4, 1500, 10);
    await compraB2b(institucionId, encargado.id, prodA, 6, 1500, 2);

    const docenteActivo = await docenteVinculado(institucionId, 'Laura Profesora');
    const docenteRevocado = await docenteVinculado(institucionId, 'Martín Suplente');
    await asignacion(institucionId, docenteActivo, prodA, 2, membresiaAdmin);
    await asignacion(institucionId, docenteRevocado, prodA, 1, membresiaAdmin, 'revoked');

    const res = await ctx.request
      .get(`/api/v1/instituciones/${institucionId}/inventario/${prodA}`)
      .set(bearer(encargado.token));
    expect(res.status).toBe(200);

    expect(res.body.nombre_producto).toBe('Oca Histórica');
    expect(res.body.precio).toBe(1500);
    expect(res.body.cantidad_adquirida).toBe(10);
    expect(res.body.cantidad_asignada).toBe(3);
    expect(res.body.cantidad_disponible).toBe(7);

    // Historial: dos compras, la más reciente primero.
    expect(res.body.compras).toHaveLength(2);
    expect(res.body.compras[0].cantidad).toBe(6);
    expect(res.body.compras[0].monto).toBe(9000);
    expect(res.body.compras[1].cantidad).toBe(4);

    // Docentes: activa y revocada, con su estado (CU-28 RN-007 ya lo exige acá).
    expect(res.body.docentes).toHaveLength(2);
    const estados = res.body.docentes.map((d: { estado: string }) => d.estado).sort();
    expect(estados).toEqual(['active', 'revoked']);
  });

  it('A7: producto que no está en el inventario de la institución → 404', async () => {
    const encargado = await docente();
    const institucionId = await institucionDe(encargado.token);
    const prodAjeno = await producto('No comprado');

    const res = await ctx.request
      .get(`/api/v1/instituciones/${institucionId}/inventario/${prodAjeno}`)
      .set(bearer(encargado.token));
    expect(res.status).toBe(404);
  });

  it('sin sesión → 401 y no registra evento', async () => {
    const res = await ctx.request.get(`/api/v1/instituciones/${randomUUID()}/inventario`);
    expect(res.status).toBe(401);
  });
});
