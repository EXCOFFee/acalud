import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-21 · Revisar Propuestas de Juegos (admin) — contra la app real + PostgreSQL real.
describe('CU-21 · Revisar Propuestas de Juegos (admin)', () => {
  let ctx: CtxApp;
  let adminToken: string;
  let docenteToken: string;
  let docenteId: string;

  beforeAll(async () => {
    ctx = await levantarApp();

    const PW = 'Password123!';
    const crearUsuario = async (email: string, esAdmin: boolean): Promise<string> => {
      await ctx.request
        .post('/api/v1/auth/registro')
        .send({ email, contrasena: PW, nombre: 'Test', apellido: 'User' });
      await ctx.pg.query(`UPDATE users SET email_verified = true WHERE email = $1`, [email]);
      if (esAdmin) await ctx.pg.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [email]);
      const login = await ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena: PW });
      return login.body.token as string;
    };

    adminToken = await crearUsuario('admin-revisa@test.com', true);
    docenteToken = await crearUsuario('docente-propone@test.com', false);
    docenteId = (
      await ctx.pg.query(`SELECT id FROM users WHERE email = $1`, ['docente-propone@test.com'])
    ).rows[0].id;
  });

  afterAll(async () => {
    await ctx?.detener();
  });

  const crearPropuesta = async (titulo: string) => {
    const res = await ctx.request
      .post('/api/v1/proposals')
      .set('Cookie', `acalud_sesion=${docenteToken}`)
      .send({
        titulo,
        descripcion: 'Descripción suficientemente larga para pasar la validación de cincuenta caracteres.',
        materia_id: null,
        nivel_educativo_id: null,
      });
    return res.body.id as string;
  };

  describe('Autorización (RN-001)', () => {
    it('sin sesión responde 401', async () => {
      const res = await ctx.request.get('/api/v1/admin/proposals');
      expect(res.status).toBe(401);
    });

    it('autenticado pero sin rol admin responde 403', async () => {
      const res = await ctx.request
        .get('/api/v1/admin/proposals')
        .set('Cookie', `acalud_sesion=${docenteToken}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Listado y detalle (p4-p13)', () => {
    it('lista propuestas con el nombre del autor y permite buscar', async () => {
      const id = await crearPropuesta('Propuesta buscable única XYZ');

      const listado = await ctx.request
        .get('/api/v1/admin/proposals?search=XYZ')
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(listado.status).toBe(200);
      expect(listado.body.some((p: { id: string }) => p.id === id)).toBe(true);
      expect(listado.body[0]).toHaveProperty('autor');
    });

    it('A7: filtra por estado', async () => {
      const res = await ctx.request
        .get('/api/v1/admin/proposals?status=pending')
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.every((p: { estado: string }) => p.estado === 'pending')).toBe(true);
    });

    it('detalle incluye nombre y email del docente autor', async () => {
      const id = await crearPropuesta('Propuesta para ver detalle');
      const res = await ctx.request
        .get(`/api/v1/admin/proposals/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.autor.email).toBe('docente-propone@test.com');
    });

    it('A4: propuesta inexistente responde 404', async () => {
      const res = await ctx.request
        .get('/api/v1/admin/proposals/dddddddd-dddd-4ddd-8ddd-dddddddddddd')
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Actualizar estado (flujo principal + A1/A3; RN-008)', () => {
    it('flujo principal: cambia el estado, guarda feedback, audita y notifica al docente', async () => {
      const id = await crearPropuesta('Propuesta a aprobar');

      const res = await ctx.request
        .put(`/api/v1/admin/proposals/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ estado: 'approved', feedback: 'Excelente idea, la vamos a producir.' });

      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('approved');
      expect(res.body.feedback_admin).toBe('Excelente idea, la vamos a producir.');

      const auditoria = await ctx.pg.query(
        `SELECT * FROM audit_log WHERE entity_type = 'proposal' AND entity_id = $1 AND action = 'status_change'`,
        [id],
      );
      expect(auditoria.rows).toHaveLength(1);
      expect(auditoria.rows[0].new_values.old_status).toBe('pending');
      expect(auditoria.rows[0].new_values.new_status).toBe('approved');

      const notif = await ctx.pg.query(
        `SELECT * FROM notifications WHERE recipient_user_id = $1 AND related_entity_id = $2`,
        [docenteId, id],
      );
      expect(notif.rows).toHaveLength(1);

      const email = await ctx.pg.query(
        `SELECT * FROM outbox_emails WHERE recipient = 'docente-propone@test.com' AND template = 'propuesta-revisada'`,
      );
      expect(email.rows.length).toBeGreaterThanOrEqual(1);
    });

    it('A1: mismo estado con feedback nuevo se guarda como feedback_added', async () => {
      const id = await crearPropuesta('Propuesta para feedback');
      await ctx.request
        .put(`/api/v1/admin/proposals/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ estado: 'reviewed', feedback: null });

      const res = await ctx.request
        .put(`/api/v1/admin/proposals/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ estado: 'reviewed', feedback: 'Che, agregale más detalle a la mecánica.' });
      expect(res.status).toBe(200);

      const auditoria = await ctx.pg.query(
        `SELECT action FROM audit_log WHERE entity_type = 'proposal' AND entity_id = $1 AND action = 'feedback_added'`,
        [id],
      );
      expect(auditoria.rows).toHaveLength(1);
    });

    it('A3: mismo estado y mismo feedback responde 409 (sin cambios)', async () => {
      const id = await crearPropuesta('Propuesta sin cambios');
      await ctx.request
        .put(`/api/v1/admin/proposals/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ estado: 'reviewed', feedback: 'Comentario fijo' });

      const res = await ctx.request
        .put(`/api/v1/admin/proposals/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ estado: 'reviewed', feedback: 'Comentario fijo' });
      expect(res.status).toBe(409);
    });

    it('RN-008: una propuesta aprobada no puede volver a pending', async () => {
      const id = await crearPropuesta('Propuesta aprobada irreversible');
      await ctx.request
        .put(`/api/v1/admin/proposals/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ estado: 'approved', feedback: null });

      const res = await ctx.request
        .put(`/api/v1/admin/proposals/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ estado: 'pending', feedback: null });
      expect(res.status).toBe(409);
    });

    it('actualizar una propuesta inexistente responde 404', async () => {
      const res = await ctx.request
        .put('/api/v1/admin/proposals/dddddddd-dddd-4ddd-8ddd-dddddddddddd')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ estado: 'approved', feedback: null });
      expect(res.status).toBe(404);
    });
  });
});
