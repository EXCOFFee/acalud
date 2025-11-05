import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { randomUUID } from 'crypto';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { createTestApplication } from './helpers/app.helper';
import { resetDatabase } from './helpers/database.helper';
import { ensureCleanAvatarStorage, listStoredAvatars } from './helpers/storage.helper';
import { registerUser } from './helpers/auth.helper';
import { createClassroom } from './helpers/classroom.helper';
import { createStandaloneActivity } from './helpers/activity.helper';
import { Activity } from '../../src/modules/activities/activity.entity';
import { UserRole } from '../../src/modules/users/user.entity';

const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/eqnE3cAAAAASUVORK5CYII=';

function writeTempFile(filename: string, content: Buffer): string {
  const filePath = path.join(os.tmpdir(), filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

describe('CU-20 & CU-11 (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const tempFiles: string[] = [];

  beforeAll(async () => {
    const context = await createTestApplication();
    app = context.app;
    dataSource = context.dataSource;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
    await resetDatabase(dataSource);
    ensureCleanAvatarStorage();
  });

  afterEach(() => {
    for (const file of tempFiles) {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    }
    tempFiles.length = 0;
    ensureCleanAvatarStorage();
  });

  describe('CU-11 - Modificar Avatar de Usuario', () => {
    it('permite subir y reemplazar un avatar válido', async () => {
      const { token } = await registerUser(app, { role: UserRole.TEACHER, firstName: 'Avatar', lastName: 'Owner' });

      const firstFile = writeTempFile(`avatar-first-${Date.now()}.png`, Buffer.from(PNG_BASE64, 'base64'));
      tempFiles.push(firstFile);

      const firstResponse = await request(app.getHttpServer())
        .patch('/api/v1/users/profile/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('avatar', firstFile)
        .expect(200);

      const storedAfterFirst = listStoredAvatars();
      expect(storedAfterFirst).toHaveLength(1);
      const firstStoredFilename = storedAfterFirst[0];
      expect(firstResponse.body.avatar).toContain(firstStoredFilename);

      const secondFile = writeTempFile(`avatar-second-${Date.now()}.png`, Buffer.from(PNG_BASE64, 'base64'));
      tempFiles.push(secondFile);

      const secondResponse = await request(app.getHttpServer())
        .patch('/api/v1/users/profile/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('avatar', secondFile)
        .expect(200);

      const storedAfterSecond = listStoredAvatars();
      expect(storedAfterSecond).toHaveLength(1);
      expect(storedAfterSecond[0]).not.toBe(firstStoredFilename);
      expect(secondResponse.body.avatar).toContain(storedAfterSecond[0]);
    });

    it('rechaza archivos con tipos MIME no permitidos', async () => {
      const { token } = await registerUser(app, { role: UserRole.TEACHER, firstName: 'Avatar', lastName: 'Invalid' });

      const invalidFile = writeTempFile(`avatar-invalid-${Date.now()}.txt`, Buffer.from('contenido invalido', 'utf8'));
      tempFiles.push(invalidFile);

      const response = await request(app.getHttpServer())
        .patch('/api/v1/users/profile/avatar')
        .set('Authorization', `Bearer ${token}`)
        .attach('avatar', invalidFile, { contentType: 'text/plain' })
        .expect(400);

      const message = Array.isArray(response.body?.message)
        ? response.body.message.join(' ')
        : response.body?.message;
      expect(message).toContain('Tipo de archivo no permitido');
      expect(listStoredAvatars()).toHaveLength(0);
    });

    it('requiere enviar un archivo de imagen', async () => {
      const { token } = await registerUser(app, { role: UserRole.TEACHER, firstName: 'Avatar', lastName: 'Missing' });

      const response = await request(app.getHttpServer())
        .patch('/api/v1/users/profile/avatar')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      const message = Array.isArray(response.body?.message)
        ? response.body.message.join(' ')
        : response.body?.message;
      expect(message).toContain('Debes proporcionar un archivo de imagen');
    });
  });

  describe('CU-20 - Agregar Actividad a Aula', () => {
    it('rechaza la solicitud si el docente no es propietario ni administrador', async () => {
      const owner = await registerUser(app, { role: UserRole.TEACHER, firstName: 'Owner', lastName: 'Teacher' });
      const classroom = await createClassroom(app, { token: owner.token });
      const outsider = await registerUser(app, { role: UserRole.TEACHER, firstName: 'Guest', lastName: 'Teacher' });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/classrooms/${classroom.id}/activities`)
        .set('Authorization', `Bearer ${outsider.token}`)
        .send({ activityId: randomUUID() })
        .expect(403);

      const message = Array.isArray(response.body?.message)
        ? response.body.message.join(' ')
        : response.body?.message;
  expect(message).toContain('Usuario no autorizado');
  expect(message).toContain('modificar aula');
    });

    it('retorna 404 cuando el aula no existe', async () => {
      const teacher = await registerUser(app, { role: UserRole.TEACHER, firstName: 'Owner', lastName: 'MissingClassroom' });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/classrooms/${randomUUID()}/activities`)
        .set('Authorization', `Bearer ${teacher.token}`)
        .send({ activityId: randomUUID() })
        .expect(404);

      const message = Array.isArray(response.body?.message)
        ? response.body.message.join(' ')
        : response.body?.message;
      expect(message).toContain('no fue encontrado');
    });
    it('agrega una actividad al aula cuando el docente es propietario y la actividad es valida', async () => {
      const owner = await registerUser(app, { role: UserRole.TEACHER, firstName: 'Owner', lastName: 'Valid' });
      const classroom = await createClassroom(app, { token: owner.token });

      const activity = await createStandaloneActivity(dataSource, {
        createdById: owner.user.id,
        title: 'Actividad para agregar',
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/classrooms/${classroom.id}/activities`)
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ activityId: activity.id })
        .expect(201);

      expect(Array.isArray(response.body.activities)).toBe(true);
      const attached = response.body.activities.find((act: Activity) => act.id === activity.id);
      expect(attached).toBeDefined();
      expect(attached.classroomId).toBe(classroom.id);

      const storedActivity = await dataSource.getRepository(Activity).findOneOrFail({ where: { id: activity.id } });
      expect(storedActivity.classroomId).toBe(classroom.id);
    });
  });
});
