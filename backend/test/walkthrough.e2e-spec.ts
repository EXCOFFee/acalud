import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, Repository } from 'typeorm';
import { createTestApplication } from './communications/helpers/app.helper';
import { registerUser } from './communications/helpers/auth.helper';
import { User, UserRole } from '../src/modules/users/user.entity';
import { ValidGrades, ValidSubjects } from '../src/modules/classrooms/dto/create-classroom.dto';
import { ActivityType, DifficultyLevel } from '../src/modules/activities/activity.entity';
import { StoreItemType, ItemAvailability, ItemRarity } from '../src/modules/store/entities/store-item.entity';
import { PaymentMethod } from '../src/modules/store/entities/user-purchase.entity';
import { ReportType, ReportSeverity } from '../src/modules/moderation/entities/report.entity';

describe('Plataforma AcaLud - Walkthrough End-to-End (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let userRepository: Repository<User>;

  beforeAll(async () => {
    const context = await createTestApplication();
    app = context.app;
    dataSource = context.dataSource;
    userRepository = dataSource.getRepository(User);
  });

  afterAll(async () => {
    await app.close();
  });

  it('ejecuta el flujo completo Auth → Aulas → Actividades → Tienda → Moderación', async () => {
    const teacherPassword = 'Passw0rd!';
    const studentPassword = 'Passw0rd!';
    const adminPassword = 'Passw0rd!';

    // =============================
    // 1. Autenticación (registro + login)
    // =============================
    const teacherAuth = await registerUser(app, {
      role: UserRole.TEACHER,
      firstName: 'Walkthrough',
      lastName: 'Teacher',
      password: teacherPassword,
    });
    const teacherLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: teacherAuth.user.email, password: teacherPassword })
      .expect(200);
    expect(teacherLogin.body.success).toBe(true);
    const teacherToken: string = teacherLogin.body.data.token;
    expect(teacherToken).toBeDefined();

    const studentAuth = await registerUser(app, {
      role: UserRole.STUDENT,
      firstName: 'Walkthrough',
      lastName: 'Student',
      password: studentPassword,
    });
    const studentLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: studentAuth.user.email, password: studentPassword })
      .expect(200);
    expect(studentLogin.body.success).toBe(true);
    const studentToken: string = studentLogin.body.data.token;
    expect(studentToken).toBeDefined();

    const adminAuth = await registerUser(app, {
      role: UserRole.ADMIN,
      firstName: 'Walkthrough',
      lastName: 'Admin',
      password: adminPassword,
    });
    const adminLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: adminAuth.user.email, password: adminPassword })
      .expect(200);
    expect(adminLogin.body.success).toBe(true);
    const adminToken: string = adminLogin.body.data.token;
    expect(adminToken).toBeDefined();

    // =============================
    // 2. Aulas (crear aula y estudiante se une)
    // =============================
    const classroomResponse = await request(app.getHttpServer())
      .post('/api/v1/classrooms')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        name: 'Aula Walkthrough',
        description: 'Aula creada durante el recorrido end-to-end.',
        subject: ValidSubjects.MATEMATICAS,
        grade: ValidGrades.PRIMERO_PRIMARIA,
      })
      .expect(201);

    const classroomId: string = classroomResponse.body.id;
    const inviteCode: string = classroomResponse.body.inviteCode;
    expect(classroomId).toBeDefined();
    expect(inviteCode).toMatch(/^[A-Z0-9]{6,}$/);

    const joinResponse = await request(app.getHttpServer())
      .post('/api/v1/classrooms/join')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ inviteCode })
      .expect(201);
    expect(joinResponse.body.inviteCode).toBe(inviteCode);

    // =============================
    // 3. Actividades (docente crea y estudiante completa)
    // =============================
    const activityPayload = {
      title: 'Quiz Walkthrough',
      description: 'Actividad de repaso para el recorrido integral.',
      type: ActivityType.QUIZ,
      difficulty: DifficultyLevel.EASY,
      subject: 'Matemáticas',
      classroomId,
      content: {
        instructions: 'Selecciona la respuesta correcta.',
        questions: [
          {
            id: 1,
            question: '¿Cuánto es 5 + 3?',
            options: ['6', '7', '8'],
            correctAnswer: 2,
            points: 10,
          },
        ],
      },
      rewards: {
        coins: 40,
        experience: 80,
        achievements: [],
      },
      tags: ['walkthrough', 'quiz'],
      estimatedTime: 10,
      baseExperience: 80,
      maxAttempts: 3,
      isPublic: false,
      settings: {
        shuffleQuestions: false,
        allowSkip: true,
      },
    };

    const createActivityResponse = await request(app.getHttpServer())
      .post('/api/v1/activities')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send(activityPayload)
      .expect(201);
    const activityId: string = createActivityResponse.body.id;
    expect(activityId).toBeDefined();

    const classroomActivitiesResponse = await request(app.getHttpServer())
      .get(`/api/v1/activities/classroom/${classroomId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    expect(Array.isArray(classroomActivitiesResponse.body)).toBe(true);
    expect(classroomActivitiesResponse.body.some((activity: any) => activity.id === activityId)).toBe(true);

    const completionResponse = await request(app.getHttpServer())
      .post(`/api/v1/activities/${activityId}/complete`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        score: 92,
        answers: { question_1: '8' },
        timeSpent: 120,
        comments: 'Actividad completada durante el walkthrough.',
        additionalData: { attemptOrigin: 'walkthrough-suite' },
      })
      .expect(201);
    expect(completionResponse.body.score).toBe(92);
    expect(completionResponse.body.message).toContain('Actividad completada');

    // =============================
    // 4. Tienda (admin crea item y estudiante compra)
    // =============================
    const storeItemPayload = {
      name: 'Fondo Neo Walkthrough',
      description: 'Elemento cosmético creado durante el recorrido integral.',
      type: StoreItemType.AVATAR_BACKGROUND,
      rarity: ItemRarity.UNCOMMON,
      price: 120,
      imageUrl: 'https://cdn.acalud.test/assets/store/background-walkthrough.png',
      availability: ItemAvailability.AVAILABLE,
      tags: ['walkthrough', 'background'],
      minLevelRequired: 1,
      isOnSale: false,
      discountPercentage: 0,
    };

    const storeItemResponse = await request(app.getHttpServer())
      .post('/api/v1/store/admin/items')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(storeItemPayload)
      .expect(201);
    const storeItemId: string = storeItemResponse.body.data.id;
    expect(storeItemId).toBeDefined();

    await userRepository.update(studentAuth.user.id, { coins: 500, level: 5 });

    const purchaseResponse = await request(app.getHttpServer())
      .post('/api/v1/store/purchase')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        storeItemId,
        quantity: 1,
        paymentMethod: PaymentMethod.COINS,
      })
      .expect(201);
    expect(purchaseResponse.body.success).toBe(true);
    expect(purchaseResponse.body.data.item.id).toBe(storeItemId);
    expect(purchaseResponse.body.data.remainingCoins).toBe(380);
    const purchaseId: string = purchaseResponse.body.data.purchase.id;

    const inventoryResponse = await request(app.getHttpServer())
      .get('/api/v1/store/inventory')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    expect(inventoryResponse.body.success).toBe(true);
    expect(Array.isArray(inventoryResponse.body.data)).toBe(true);
    expect(inventoryResponse.body.data.some((entry: any) => entry.id === purchaseId)).toBe(true);

    // =============================
    // 5. Moderación (estudiante reporta actividad y verifica historial)
    // =============================
    const reportPayload = {
      type: ReportType.INAPPROPRIATE_CONTENT,
      reason: 'Contenido potencialmente ofensivo detectado en la actividad',
      description:
        'Durante el walkthrough se detectó una posible incidencia en la pregunta principal. Se reporta para revisión preventiva.',
      severity: ReportSeverity.MEDIUM,
      reportedActivityId: activityId,
    };

    const reportResponse = await request(app.getHttpServer())
      .post('/api/v1/moderation/reports')
      .set('Authorization', `Bearer ${studentToken}`)
      .send(reportPayload)
      .expect(201);
    expect(reportResponse.body.success).toBe(true);
    const reportId: string = reportResponse.body.data.id;
    expect(reportId).toBeDefined();

    const myReportsResponse = await request(app.getHttpServer())
      .get('/api/v1/moderation/reports/my-reports')
      .query({ page: 1, limit: 10 })
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    expect(myReportsResponse.body.success).toBe(true);
    expect(myReportsResponse.body.data.data.some((report: any) => report.id === reportId)).toBe(true);
  });
});
