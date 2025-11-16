import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { UserRole } from '../src/modules/users/user.entity';
import { ValidGrades, ValidSubjects } from '../src/modules/classrooms/dto/create-classroom.dto';
import { createTestApplication } from './communications/helpers/app.helper';
import { registerUser } from './communications/helpers/auth.helper';
import { createClassroom } from './communications/helpers/classroom.helper';

describe('Classroom API (e2e)', () => {
  let app: INestApplication;
  let teacherToken: string;
  let studentToken: string;

  beforeAll(async () => {
    const context = await createTestApplication();
    app = context.app;

    const teacherAuth = await registerUser(app, { role: UserRole.TEACHER });
    const studentAuth = await registerUser(app, { role: UserRole.STUDENT });

    teacherToken = teacherAuth.token;
    studentToken = studentAuth.token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/classrooms (POST)', () => {
    it('should create classroom as teacher', () => {
      const createClassroomDto = {
        name: 'Test Classroom',
        description: 'Test Description',
        subject: ValidSubjects.MATEMATICAS,
        grade: ValidGrades.PRIMERO_PRIMARIA,
      };

      return request(app.getHttpServer())
        .post('/api/v1/classrooms')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(createClassroomDto)
        .expect(201)
        .expect((res) => {
          expect(res.body.name).toBe(createClassroomDto.name);
          expect(res.body.inviteCode).toBeDefined();
          expect(res.body.teacherId).toBeDefined();
        });
    });

    it('should fail to create classroom as student', () => {
      const createClassroomDto = {
        name: 'Test Classroom',
        description: 'Test Description',
        subject: ValidSubjects.MATEMATICAS,
        grade: ValidGrades.PRIMERO_PRIMARIA,
      };

      return request(app.getHttpServer())
        .post('/api/v1/classrooms')
        .set('Authorization', `Bearer ${studentToken}`)
        .send(createClassroomDto)
        .expect(403);
    });

    it('should fail with invalid data', () => {
      const invalidDto = {
        name: '', // nombre vacío
        description: 'Test Description',
        subject: ValidSubjects.MATEMATICAS,
        grade: ValidGrades.PRIMERO_PRIMARIA,
      };

      return request(app.getHttpServer())
        .post('/api/v1/classrooms')
        .set('Authorization', `Bearer ${teacherToken}`)
        .send(invalidDto)
        .expect(400);
    });
  });

  describe('/classrooms/:id (GET)', () => {
    let classroomId: string;

    beforeAll(async () => {
      const classroom = await createClassroom(app, {
        token: teacherToken,
        name: 'Test Classroom for GET',
        description: 'Test Description',
      });

      classroomId = classroom.id;
    });

    it('should get classroom by id', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/classrooms/${classroomId}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.id).toBe(classroomId);
          expect(res.body.name).toBe('Test Classroom for GET');
        });
    });

    it('should return 404 for non-existent classroom', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/classrooms/${randomUUID()}`)
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(404);
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/classrooms/${classroomId}`)
        .expect(401);
    });
  });

  describe('/classrooms/join (POST)', () => {
    let inviteCode: string;

    beforeAll(async () => {
      const classroom = await createClassroom(app, {
        token: teacherToken,
        name: 'Test Classroom for Join',
        description: 'Test Description',
      });
      inviteCode = classroom.inviteCode;
    });

    it('should join classroom with valid invite code', () => {
      return request(app.getHttpServer())
        .post('/api/v1/classrooms/join')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ inviteCode })
        .expect(201)
        .expect((res) => {
          expect(res.body.inviteCode).toBe(inviteCode);
        });
    });

    it('should fail with invalid invite code', () => {
      return request(app.getHttpServer())
        .post('/api/v1/classrooms/join')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ inviteCode: 'INVALID' })
        .expect(400);
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .post('/api/v1/classrooms/join')
        .send({ inviteCode })
        .expect(401);
    });
  });
});
