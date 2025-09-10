import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthService } from '../src/modules/auth/auth.service';
import { ClassroomService } from '../src/modules/classrooms/services/classroom.service.refactored';

describe('Classroom API (e2e)', () => {
  let app: INestApplication;
  let authService: AuthService;
  let classroomService: ClassroomService;
  let teacherToken: string;
  let studentToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    authService = moduleFixture.get<AuthService>(AuthService);
    classroomService = moduleFixture.get<ClassroomService>(ClassroomService);

    // Crear usuarios de prueba y obtener tokens
    const teacherData = {
      email: 'teacher@test.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Teacher',
      name: 'Test Teacher',
      role: 'teacher' as const,
    };

    const studentData = {
      email: 'student@test.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'Student', 
      name: 'Test Student',
      role: 'student' as const,
    };

    // Registrar y obtener tokens
    const teacherAuth = await authService.register(teacherData);
    const studentAuth = await authService.register(studentData);
    
    if (teacherAuth.success && studentAuth.success) {
      teacherToken = teacherAuth.data.token;
      studentToken = studentAuth.data.token;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/classrooms (POST)', () => {
    it('should create classroom as teacher', () => {
      const createClassroomDto = {
        name: 'Test Classroom',
        description: 'Test Description',
        subject: 'Mathematics',
        grade: '5th Grade',
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
        subject: 'Mathematics',
        grade: '5th Grade',
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
        subject: 'Mathematics',
        grade: '5th Grade',
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
      // Crear un aula de prueba
      const classroom = await classroomService.createClassroom({
        name: 'Test Classroom for GET',
        description: 'Test Description',
        subject: 'Mathematics',
        grade: '5th Grade',
      }, 'teacher-id');
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
        .get('/api/v1/classrooms/non-existent-id')
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
      // Crear un aula y obtener el código de invitación
      const classroom = await classroomService.createClassroom({
        name: 'Test Classroom for Join',
        description: 'Test Description',
        subject: 'Mathematics',
        grade: '5th Grade',
      }, 'teacher-id');
      inviteCode = classroom.inviteCode;
    });

    it('should join classroom with valid invite code', () => {
      return request(app.getHttpServer())
        .post('/api/v1/classrooms/join')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ inviteCode })
        .expect(200)
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
