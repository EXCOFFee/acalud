import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { type CtxApp, levantarApp } from './helpers/app';

// CU-20 · Parametrizar Encuesta (ABM admin) — contra la app real + PostgreSQL real.
describe('CU-20 · ABM de Encuestas (admin)', () => {
  let ctx: CtxApp;
  let adminToken: string;
  let docenteToken: string;
  let nivelPrimariaId: string;

  beforeAll(async () => {
    ctx = await levantarApp();

    const PW = 'Password123!';

    const crearUsuario = async (email: string, esAdmin: boolean): Promise<string> => {
      await ctx.request
        .post('/api/v1/auth/registro')
        .send({ email, contrasena: PW, nombre: 'Test', apellido: 'User' });
      await ctx.pg.query(`UPDATE users SET email_verified = true WHERE email = $1`, [email]);
      if (esAdmin) {
        await ctx.pg.query(`UPDATE users SET role = 'admin' WHERE email = $1`, [email]);
      }
      const login = await ctx.request.post('/api/v1/auth/sesion').send({ email, contrasena: PW });
      return login.body.token as string;
    };

    adminToken = await crearUsuario('admin-encuestas@test.com', true);
    docenteToken = await crearUsuario('docente-encuestas@test.com', false);

    nivelPrimariaId = (await ctx.pg.query(`SELECT id FROM levels WHERE name = 'Primaria'`)).rows[0].id;
  });

  afterAll(async () => {
    await ctx?.detener();
  });

  const encuestaValida = {
    pregunta: '¿Qué te parece la nueva demo?',
    nivel_educativo_id: null as string | null,
    opciones: ['Muy buena', 'Buena', 'Regular'],
  };

  describe('Autorización (RN-001)', () => {
    it('sin sesión responde 401', async () => {
      const res = await ctx.request.post('/api/v1/admin/polls').send(encuestaValida);
      expect(res.status).toBe(401);
    });

    it('autenticado pero sin rol admin responde 403', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/polls')
        .set('Cookie', `acalud_sesion=${docenteToken}`)
        .send(encuestaValida);
      expect(res.status).toBe(403);
    });
  });

  describe('Alta de encuesta (flujo principal + A4/A5/A6)', () => {
    it('A4: rechaza pregunta vacía con 422', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/polls')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...encuestaValida, pregunta: '' });
      expect(res.status).toBe(422);
    });

    it('A5: rechaza con menos de 2 opciones', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/polls')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...encuestaValida, opciones: ['Sola'] });
      expect(res.status).toBe(422);
    });

    it('A6: rechaza opciones duplicadas', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/polls')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...encuestaValida, opciones: ['Igual', 'igual'] });
      expect(res.status).toBe(422);
    });

    it('rechaza más de 10 opciones', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/polls')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...encuestaValida, opciones: Array.from({ length: 11 }, (_, i) => `Opción ${i}`) });
      expect(res.status).toBe(422);
    });

    it('nivel educativo inexistente responde 422', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/polls')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...encuestaValida, nivel_educativo_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' });
      expect(res.status).toBe(422);
    });

    it('RN-004: crea la encuesta inactiva (draft) con sus opciones y audita', async () => {
      const res = await ctx.request
        .post('/api/v1/admin/polls')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...encuestaValida, nivel_educativo_id: nivelPrimariaId });

      expect(res.status).toBe(201);
      expect(res.body.estado).toBe('draft');
      expect(res.body.opciones).toHaveLength(3);

      const fila = await ctx.pg.query('SELECT * FROM polls WHERE id = $1', [res.body.id]);
      expect(fila.rows[0].status).toBe('draft');

      const opciones = await ctx.pg.query('SELECT * FROM poll_options WHERE poll_id = $1', [res.body.id]);
      expect(opciones.rows).toHaveLength(3);

      const auditoria = await ctx.pg.query(
        `SELECT * FROM audit_log WHERE entity_type = 'poll' AND entity_id = $1 AND action = 'create'`,
        [res.body.id],
      );
      expect(auditoria.rows).toHaveLength(1);
    });
  });

  describe('Activar/Desactivar (A1)', () => {
    it('alterna draft -> active -> draft y audita cada transición', async () => {
      const alta = await ctx.request
        .post('/api/v1/admin/polls')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send(encuestaValida);
      const id = alta.body.id as string;

      const activar = await ctx.request
        .patch(`/api/v1/admin/polls/${id}/toggle`)
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(activar.status).toBe(200);
      expect(activar.body.estado).toBe('active');

      const desactivar = await ctx.request
        .patch(`/api/v1/admin/polls/${id}/toggle`)
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(desactivar.status).toBe(200);
      expect(desactivar.body.estado).toBe('draft');

      const auditoria = await ctx.pg.query(
        `SELECT action FROM audit_log WHERE entity_type = 'poll' AND entity_id = $1 AND action IN ('activate','deactivate')`,
        [id],
      );
      expect(auditoria.rows.map((r) => r.action).sort()).toEqual(['activate', 'deactivate']);
    });

    it('toggle de encuesta inexistente responde 404', async () => {
      const res = await ctx.request
        .patch('/api/v1/admin/polls/dddddddd-dddd-4ddd-8ddd-dddddddddddd/toggle')
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Edición (A2/RN-005)', () => {
    it('edita una encuesta inactiva (reemplaza pregunta y opciones)', async () => {
      const alta = await ctx.request
        .post('/api/v1/admin/polls')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send(encuestaValida);
      const id = alta.body.id as string;

      const res = await ctx.request
        .put(`/api/v1/admin/polls/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...encuestaValida, pregunta: 'Pregunta editada', opciones: ['Sí', 'No'] });

      expect(res.status).toBe(200);
      expect(res.body.pregunta).toBe('Pregunta editada');
      expect(res.body.opciones).toHaveLength(2);

      const opciones = await ctx.pg.query('SELECT * FROM poll_options WHERE poll_id = $1', [id]);
      expect(opciones.rows).toHaveLength(2); // reemplazadas, no acumuladas
    });

    it('A2.3/RN-005: editar una encuesta activa responde 409', async () => {
      const alta = await ctx.request
        .post('/api/v1/admin/polls')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send(encuestaValida);
      const id = alta.body.id as string;
      await ctx.request.patch(`/api/v1/admin/polls/${id}/toggle`).set('Cookie', `acalud_sesion=${adminToken}`);

      const res = await ctx.request
        .put(`/api/v1/admin/polls/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send({ ...encuestaValida, pregunta: 'No debería aplicarse' });
      expect(res.status).toBe(409);
    });

    it('editar una encuesta inexistente responde 404', async () => {
      const res = await ctx.request
        .put('/api/v1/admin/polls/dddddddd-dddd-4ddd-8ddd-dddddddddddd')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send(encuestaValida);
      expect(res.status).toBe(404);
    });
  });

  describe('Listado (p4)', () => {
    it('lista las encuestas con estado y total de votos', async () => {
      const res = await ctx.request
        .get('/api/v1/admin/polls')
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.some((e: { pregunta: string }) => e.pregunta === encuestaValida.pregunta)).toBe(true);
      expect(res.body[0]).toHaveProperty('total_votos');
    });
  });

  describe('Baja (A3/RN-006)', () => {
    it('elimina la encuesta con cascada a opciones y audita', async () => {
      const alta = await ctx.request
        .post('/api/v1/admin/polls')
        .set('Cookie', `acalud_sesion=${adminToken}`)
        .send(encuestaValida);
      const id = alta.body.id as string;

      const res = await ctx.request
        .delete(`/api/v1/admin/polls/${id}`)
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(204);

      const fila = await ctx.pg.query('SELECT * FROM polls WHERE id = $1', [id]);
      expect(fila.rows).toHaveLength(0);

      const opciones = await ctx.pg.query('SELECT * FROM poll_options WHERE poll_id = $1', [id]);
      expect(opciones.rows).toHaveLength(0); // cascada

      const auditoria = await ctx.pg.query(
        `SELECT * FROM audit_log WHERE entity_type = 'poll' AND entity_id = $1 AND action = 'delete'`,
        [id],
      );
      expect(auditoria.rows).toHaveLength(1);
    });

    it('eliminar una encuesta inexistente responde 404', async () => {
      const res = await ctx.request
        .delete('/api/v1/admin/polls/dddddddd-dddd-4ddd-8ddd-dddddddddddd')
        .set('Cookie', `acalud_sesion=${adminToken}`);
      expect(res.status).toBe(404);
    });
  });
});
