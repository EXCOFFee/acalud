import request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { ValidGrades, ValidSubjects } from '../../../src/modules/classrooms/dto/create-classroom.dto';

interface ClassroomOptions {
  token: string;
  name?: string;
  description?: string;
  subject?: ValidSubjects;
  grade?: ValidGrades;
}

export interface ClassroomResult {
  id: string;
  name: string;
  inviteCode: string;
}

export async function createClassroom(
  app: INestApplication,
  options: ClassroomOptions,
): Promise<ClassroomResult> {
  const { token } = options;
  const payload = {
    name: options.name ?? `Aula ${Date.now()}`,
    description: options.description ?? 'Aula generada para pruebas e2e.',
    subject: options.subject ?? ValidSubjects.MATEMATICAS,
    grade: options.grade ?? ValidGrades.PRIMERO_PRIMARIA,
  };

  const response = await request(app.getHttpServer())
    .post('/api/v1/classrooms')
    .set('Authorization', `Bearer ${token}`)
    .send(payload)
    .expect(201);

  const { body } = response;

  return {
    id: body.id,
    name: body.name,
    inviteCode: body.inviteCode,
  };
}
