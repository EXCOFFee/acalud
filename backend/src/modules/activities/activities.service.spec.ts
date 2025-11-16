import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { ActivitiesService } from './activities.service';
import { Activity, ActivityType } from './activity.entity';
import { ActivityCompletion } from './activity-completion.entity';
import { User, UserRole } from '../users/user.entity';
import { Classroom } from '../classrooms/classroom.entity';
import { createMockRepository } from '../../test/setup';
import { Repository } from 'typeorm';

const mockActivityRepository = () => createMockRepository();
const mockCompletionRepository = () => createMockRepository();
const mockUserRepository = () => createMockRepository();
const mockClassroomRepository = () => createMockRepository();

describe('ActivitiesService', () => {
  let service: ActivitiesService;
  let activityRepository: jest.Mocked<Repository<Activity>>;
  let completionRepository: jest.Mocked<Repository<ActivityCompletion>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let classroomRepository: jest.Mocked<Repository<Classroom>>;

  const buildQueryBuilder = () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
    } as unknown as jest.Mocked<Record<string, any>>;

    activityRepository.createQueryBuilder.mockReturnValue(qb as any);
    return qb;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        {
          provide: getRepositoryToken(Activity),
          useFactory: mockActivityRepository,
        },
        {
          provide: getRepositoryToken(ActivityCompletion),
          useFactory: mockCompletionRepository,
        },
        {
          provide: getRepositoryToken(User),
          useFactory: mockUserRepository,
        },
        {
          provide: getRepositoryToken(Classroom),
          useFactory: mockClassroomRepository,
        },
      ],
    }).compile();

    service = module.get(ActivitiesService);
    activityRepository = module.get(getRepositoryToken(Activity));
    completionRepository = module.get(getRepositoryToken(ActivityCompletion));
    userRepository = module.get(getRepositoryToken(User));
    classroomRepository = module.get(getRepositoryToken(Classroom));
  });

  describe('create', () => {
    const teacherId = 'teacher-1';
    const classroomId = 'classroom-1';

    it('debería crear una actividad cuando el docente es propietario del aula', async () => {
      const dto: any = {
        title: 'Actividad de Matemáticas',
        type: 'QUIZ',
        difficulty: 'MEDIUM',
        classroomId,
      };

      const classroom: Partial<Classroom> = {
        id: classroomId,
        teacher: { id: teacherId } as User,
      };

      const activityEntity = { id: 'activity-1', ...dto } as Activity;
      const savedActivity = { ...activityEntity, createdById: teacherId } as Activity;

      classroomRepository.findOne.mockResolvedValue(classroom as Classroom);
      activityRepository.create.mockReturnValue(activityEntity);
      activityRepository.save.mockResolvedValue(savedActivity);

      const result = await service.create(dto, teacherId);

      expect(result).toBe(savedActivity);
      expect(activityRepository.create).toHaveBeenCalledWith({
        ...dto,
        createdById: teacherId,
        classroom,
      });
      expect(activityRepository.save).toHaveBeenCalledWith(activityEntity);
    });

    it('debería lanzar NotFoundException si el aula no existe', async () => {
      classroomRepository.findOne.mockResolvedValue(null);

      await expect(
        service.create({ classroomId } as any, teacherId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('debería lanzar ForbiddenException si el docente no es propietario del aula', async () => {
      const classroom: Partial<Classroom> = {
        id: classroomId,
        teacher: { id: 'other-teacher' } as User,
      };

      classroomRepository.findOne.mockResolvedValue(classroom as Classroom);

      await expect(
        service.create({ classroomId } as any, teacherId),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(activityRepository.create).not.toHaveBeenCalled();
    });

    it('debería envolver errores inesperados en InternalServerErrorException', async () => {
      const dto: any = {
        title: 'Actividad inesperada',
        classroomId,
      };

      const classroom: Partial<Classroom> = {
        id: classroomId,
        teacher: { id: teacherId } as User,
      };

      const activityEntity = { id: 'activity-err', ...dto } as Activity;

      classroomRepository.findOne.mockResolvedValue(classroom as Classroom);
      activityRepository.create.mockReturnValue(activityEntity);
      activityRepository.save.mockRejectedValue(new Error('db exploded'));

      await expect(service.create(dto, teacherId)).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('findAll', () => {
    it('debería construir filtros para docentes', async () => {
      const qb: any = buildQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[{ id: 'activity-1' } as Activity], 1]);

      userRepository.findOne.mockResolvedValue({
        id: 'teacher-1',
        role: UserRole.TEACHER,
      } as User);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        userId: 'teacher-1',
      });

      expect(qb.andWhere).toHaveBeenCalledWith('activity.isActive = :isActive', { isActive: true });
      expect(qb.andWhere).toHaveBeenCalledWith('activity.createdById = :userId', { userId: 'teacher-1' });
      expect(result.meta).toEqual({ total: 1, page: 1, limit: 10, totalPages: 1 });
      expect(result.data).toHaveLength(1);
    });

    it('debería limitar actividades según aulas del estudiante', async () => {
      const qb: any = buildQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[{ id: 'activity-2' } as Activity], 1]);

      userRepository.findOne.mockResolvedValue({
        id: 'student-1',
        role: UserRole.STUDENT,
        enrolledClassrooms: [{ id: 'classroom-1' }, { id: 'classroom-2' }],
      } as unknown as User);

      const result = await service.findAll({
        page: 2,
        limit: 5,
        userId: 'student-1',
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        'activity.classroomId IN (:...classroomIds)',
        { classroomIds: ['classroom-1', 'classroom-2'] },
      );
      expect(result.meta).toEqual({ total: 1, page: 2, limit: 5, totalPages: 1 });
    });
  });

  describe('getClassroomActivities', () => {
    const classroomId = 'classroom-1';

    it('debería lanzar NotFoundException si el usuario no existe', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getClassroomActivities(classroomId, 'unknown-user'))
        .rejects.toBeInstanceOf(NotFoundException);
    });

    it('debería impedir acceso a estudiantes no inscritos', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'student-1',
        role: UserRole.STUDENT,
        enrolledClassrooms: [{ id: 'other-classroom' }],
      } as unknown as User);

      await expect(service.getClassroomActivities(classroomId, 'student-1'))
        .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('debería validar propiedad del aula para docentes', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'teacher-1',
        role: UserRole.TEACHER,
        enrolledClassrooms: [],
      } as User);

      classroomRepository.findOne.mockResolvedValue(null);

      await expect(service.getClassroomActivities(classroomId, 'teacher-1'))
        .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('debería retornar actividades ordenadas cuando el docente es propietario', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'teacher-1',
        role: UserRole.TEACHER,
        enrolledClassrooms: [],
      } as User);

      classroomRepository.findOne.mockResolvedValue({ id: classroomId } as Classroom);

      const activities = [{ id: 'activity-1' }, { id: 'activity-2' }] as Activity[];
      activityRepository.find.mockResolvedValue(activities);

      const result = await service.getClassroomActivities(classroomId, 'teacher-1');

      expect(activityRepository.find).toHaveBeenCalledWith({
        where: { classroom: { id: classroomId } },
        relations: ['classroom', 'createdBy', 'completions'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(activities);
    });
  });

  describe('findById', () => {
    const activityId = 'activity-1';

    it('debería lanzar NotFoundException si la actividad no existe', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(service.findById(activityId, 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('debería restringir acceso a estudiantes sin inscripción', async () => {
      activityRepository.findOne.mockResolvedValue({
        id: activityId,
        classroom: { id: 'classroom-1' },
        createdBy: { id: 'teacher-1' },
      } as unknown as Activity);

      userRepository.findOne.mockResolvedValue({
        id: 'student-1',
        role: UserRole.STUDENT,
        enrolledClassrooms: [{ id: 'other' }],
      } as unknown as User);

      await expect(service.findById(activityId, 'student-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('debería permitir acceso a administradores', async () => {
      const activity = {
        id: activityId,
        classroom: { id: 'classroom-1' },
        createdBy: { id: 'teacher-1' },
        completions: [],
      } as unknown as Activity;

      activityRepository.findOne.mockResolvedValue(activity);

      userRepository.findOne.mockResolvedValue({
        id: 'admin-1',
        role: UserRole.ADMIN,
        enrolledClassrooms: [],
      } as User);

      const result = await service.findById(activityId, 'admin-1');

      expect(result).toBe(activity);
    });
  });

  describe('update', () => {
    const activityId = 'activity-123';

    it('debería lanzar NotFoundException si la actividad no existe', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(service.update(activityId, { title: 'Nueva' } as any, 'teacher-1'))
        .rejects.toBeInstanceOf(NotFoundException);
    });

    it('debería impedir actualizar si el docente no es propietario', async () => {
      activityRepository.findOne.mockResolvedValue({
        id: activityId,
        createdBy: { id: 'other-teacher' },
        classroom: { id: 'classroom-1' },
      } as unknown as Activity);

      await expect(service.update(activityId, { title: 'Nueva' } as any, 'teacher-1'))
        .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('debería actualizar la actividad cuando el docente es propietario', async () => {
      const activity = {
        id: activityId,
        title: 'Vieja',
        createdBy: { id: 'teacher-1' },
        classroom: { id: 'classroom-1' },
      } as unknown as Activity;

      activityRepository.findOne.mockResolvedValue(activity);
      activityRepository.save.mockImplementation(async (entity) => entity as Activity);

      const result = await service.update(activityId, { title: 'Nueva' } as any, 'teacher-1');

      expect(result.title).toBe('Nueva');
      expect(activityRepository.save).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nueva' }));
    });
  });

  describe('completeActivity', () => {
    const activityId = 'activity-complete';
    const studentId = 'student-1';

    it('debería lanzar NotFoundException si la actividad no existe', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(
        service.completeActivity(activityId, { score: 80, timeSpent: 300, answers: [] } as any, studentId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('debería impedir completar actividades inactivas', async () => {
      activityRepository.findOne.mockResolvedValue({
        id: activityId,
        isActive: false,
        classroom: { students: [{ id: studentId }] },
      } as unknown as Activity);

      await expect(
        service.completeActivity(activityId, { score: 50, timeSpent: 300, answers: [] } as any, studentId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('debería impedir completar si el estudiante no pertenece al aula', async () => {
      activityRepository.findOne.mockResolvedValue({
        id: activityId,
        isActive: true,
        classroom: { students: [{ id: 'other-student' }] },
      } as unknown as Activity);

      await expect(
        service.completeActivity(activityId, { score: 50, timeSpent: 300, answers: [] } as any, studentId),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('debería lanzar NotFoundException si el estudiante no existe', async () => {
      activityRepository.findOne.mockResolvedValue({
        id: activityId,
        isActive: true,
        estimatedTime: 600,
        classroom: { students: [{ id: studentId }] },
      } as unknown as Activity);

      completionRepository.findOne.mockResolvedValue(null);
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.completeActivity(activityId, { score: 80, timeSpent: 300, answers: [] } as any, studentId),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('debería registrar la primera completación aplicando bonus por velocidad', async () => {
      const activity = {
        id: activityId,
        isActive: true,
        estimatedTime: 600,
        classroom: { students: [{ id: studentId }] },
      } as unknown as Activity;

      const createdCompletion = {
        activityId,
        studentId,
        score: 80,
        maxScore: 100,
        timeSpent: 300,
        attempts: 1,
        answers: [],
      } as unknown as ActivityCompletion;

      activityRepository.findOne.mockResolvedValue(activity);
      completionRepository.findOne.mockResolvedValue(null);
      completionRepository.create.mockReturnValue(createdCompletion);
      completionRepository.save.mockResolvedValue({ ...createdCompletion, id: 'completion-1' } as ActivityCompletion);

      const student = {
        id: studentId,
        coins: 50,
        experience: 888,
        level: 3,
        name: 'Estudiante',
      } as unknown as User;

      userRepository.findOne.mockResolvedValue(student);
      userRepository.save.mockImplementation(async (entity) => entity as User);

      const result = await service.completeActivity(
        activityId,
        { score: 80, timeSpent: 300, answers: [] } as any,
        studentId,
      );

      expect(result).toMatchObject({ id: 'completion-1', score: 80 });
      expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        coins: 110,
        experience: 1008,
        level: 4,
      }));
    });

    it('debería otorgar recompensas reducidas cuando mejora el puntaje', async () => {
      activityRepository.findOne.mockResolvedValue({
        id: activityId,
        isActive: true,
        estimatedTime: 600,
        classroom: { students: [{ id: studentId }] },
      } as unknown as Activity);

      const existingCompletion = {
        id: 'completion-1',
        activityId,
        studentId,
        score: 60,
        attempts: 1,
        timeSpent: 900,
        completedAt: new Date('2024-01-01'),
      } as unknown as ActivityCompletion;

      completionRepository.findOne.mockResolvedValue(existingCompletion);
      completionRepository.save.mockImplementation(async (entity) => entity as ActivityCompletion);

      const student = {
        id: studentId,
        coins: 10,
        experience: 0,
        level: 1,
        name: 'Estudiante',
      } as unknown as User;

      userRepository.findOne.mockResolvedValue(student);
      userRepository.save.mockImplementation(async (entity) => entity as User);

      const result = await service.completeActivity(
        activityId,
        { score: 80, timeSpent: 700, answers: [] } as any,
        studentId,
      );

      expect(result.attempts).toBe(2);
      expect(existingCompletion.score).toBe(80);
      expect(userRepository.save).toHaveBeenCalledWith(expect.objectContaining({ coins: 25, experience: 30 }));
    });

    it('no debería otorgar recompensas si no mejora el puntaje', async () => {
      activityRepository.findOne.mockResolvedValue({
        id: activityId,
        isActive: true,
        estimatedTime: 600,
        classroom: { students: [{ id: studentId }] },
      } as unknown as Activity);

      const existingCompletion = {
        id: 'completion-2',
        activityId,
        studentId,
        score: 80,
        attempts: 2,
        timeSpent: 400,
        completedAt: new Date('2024-01-01'),
      } as unknown as ActivityCompletion;

      completionRepository.findOne.mockResolvedValue(existingCompletion);
      completionRepository.save.mockImplementation(async (entity) => entity as ActivityCompletion);

      const student = {
        id: studentId,
        coins: 200,
        experience: 500,
        level: 3,
        name: 'Estudiante',
      } as unknown as User;

      userRepository.findOne.mockResolvedValue(student);

      const result = await service.completeActivity(
        activityId,
        { score: 75, timeSpent: 650, answers: [] } as any,
        studentId,
      );

      expect(result.attempts).toBe(3);
      expect(userRepository.save).not.toHaveBeenCalled();
      expect(student.coins).toBe(200);
      expect(student.experience).toBe(500);
    });
  });

  describe('getActivityStats', () => {
    const activityId = 'activity-stats';

    it('debería calcular métricas cuando el docente es propietario', async () => {
      activityRepository.findOne.mockResolvedValue({
        id: activityId,
        createdBy: { id: 'teacher-1' },
        classroom: { students: [{ id: 's1' }, { id: 's2' }, { id: 's3' }, { id: 's4' }] },
      } as unknown as Activity);

      const completions: ActivityCompletion[] = Array.from({ length: 6 }).map((_, index) => ({
        id: `completion-${index}`,
        activityId,
        studentId: `student-${index}`,
        score: 100 - index * 10,
        maxScore: 100,
        timeSpent: 300 + index,
        attempts: index + 1,
        answers: [],
        completedAt: new Date(`2024-01-0${index + 1}`),
        student: {
          id: `student-${index}`,
          firstName: `Name${index}`,
          lastName: `Last${index}`,
          avatar: `avatar-${index}.png`,
        } as unknown as User,
      } as ActivityCompletion));

      completionRepository.find.mockResolvedValue(completions);

      const stats = await service.getActivityStats(activityId, 'teacher-1');

      expect(stats.totalCompletions).toBe(6);
      expect(stats.averageScore).toBeCloseTo((100 + 90 + 80 + 70 + 60 + 50) / 6);
      expect(stats.averageAttempts).toBeCloseTo((1 + 2 + 3 + 4 + 5 + 6) / 6);
      expect(stats.completionRate).toBeCloseTo((6 / 4) * 100);
      expect(stats.topScorers).toHaveLength(5);
      expect(stats.topScorers[0].score).toBe(100);
    });

    it('debería lanzar NotFoundException si la actividad no existe', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(service.getActivityStats(activityId, 'teacher-1'))
        .rejects.toBeInstanceOf(NotFoundException);
    });

    it('debería restringir acceso para docentes no propietarios', async () => {
      activityRepository.findOne.mockResolvedValue({
        id: activityId,
        createdBy: { id: 'other-teacher' },
      } as unknown as Activity);

      await expect(service.getActivityStats(activityId, 'teacher-1'))
        .rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('publishActivity', () => {
    const activityId = 'activity-publish';
    const teacherId = 'teacher-1';

    const buildActivity = (overrides: Partial<Activity> = {}): Activity => ({
      id: activityId,
      title: 'Actividad válida',
      description: 'Descripción suficientemente detallada',
      content: { questions: [{ id: 'q1' }] },
      type: ActivityType.QUIZ,
      rewards: { coins: 10, experience: 20 } as any,
      isActive: true,
      isPublic: false,
      createdBy: { id: teacherId } as User,
      classroom: { id: 'classroom-1' } as Classroom,
      ...overrides,
    } as unknown as Activity);

    it('debería publicar la actividad cuando pasa todas las validaciones', async () => {
      const activity = buildActivity();
      activityRepository.findOne.mockResolvedValue(activity);
      activityRepository.save.mockImplementation(async (entity) => entity as Activity);

      const result = await service.publishActivity(activityId, teacherId);

      expect(result.isPublic).toBe(true);
      expect(activityRepository.save).toHaveBeenCalledWith(expect.objectContaining({ isPublic: true }));
    });

    it('debería lanzar NotFoundException si la actividad no existe', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(service.publishActivity(activityId, teacherId))
        .rejects.toBeInstanceOf(NotFoundException);
    });

    it('debería restringir publicación si el docente no es creador', async () => {
      activityRepository.findOne.mockResolvedValue(buildActivity({ createdBy: { id: 'other' } as User }));

      await expect(service.publishActivity(activityId, teacherId))
        .rejects.toBeInstanceOf(ForbiddenException);
    });

    it('debería impedir publicar actividades que ya son públicas', async () => {
      activityRepository.findOne.mockResolvedValue(buildActivity({ isPublic: true }));

      await expect(service.publishActivity(activityId, teacherId))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it('debería validar título mínimo', async () => {
      activityRepository.findOne.mockResolvedValue(buildActivity({ title: 'no' }));

      await expect(service.publishActivity(activityId, teacherId))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it('debería validar descripción mínima', async () => {
      activityRepository.findOne.mockResolvedValue(buildActivity({ description: 'corta' }));

      await expect(service.publishActivity(activityId, teacherId))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it('debería exigir contenido definido', async () => {
      activityRepository.findOne.mockResolvedValue(buildActivity({ content: null as any }));

      await expect(service.publishActivity(activityId, teacherId))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it('debería exigir preguntas para actividades tipo QUIZ', async () => {
      activityRepository.findOne.mockResolvedValue(buildActivity({ content: { questions: [] } }));

      await expect(service.publishActivity(activityId, teacherId))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it('debería exigir recompensas definidas', async () => {
      activityRepository.findOne.mockResolvedValue(buildActivity({ rewards: { coins: undefined, experience: undefined } as any }));

      await expect(service.publishActivity(activityId, teacherId))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it('debería impedir publicar actividades inactivas', async () => {
      activityRepository.findOne.mockResolvedValue(buildActivity({ isActive: false }));

      await expect(service.publishActivity(activityId, teacherId))
        .rejects.toBeInstanceOf(BadRequestException);
    });

    it('debería envolver errores inesperados al guardar', async () => {
      const activity = buildActivity();
      activityRepository.findOne.mockResolvedValue(activity);
      activityRepository.save.mockRejectedValue(new Error('db error'));

      await expect(service.publishActivity(activityId, teacherId))
        .rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('remove', () => {
    const activityId = 'activity-1';

    it('debería desactivar la actividad cuando el usuario es admin', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'admin', role: UserRole.ADMIN } as User);
      const activity = { id: activityId, isActive: true, createdBy: { id: 'teacher-1' } } as Activity;
      activityRepository.findOne.mockResolvedValue(activity);
      activityRepository.save.mockImplementation(async (entity) => entity as Activity);

      await service.remove(activityId, 'admin');

      expect(activityRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: activityId, isActive: false }),
      );
    });

    it('debería lanzar ForbiddenException si el usuario no es propietario ni admin', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'teacher-2', role: UserRole.TEACHER } as User);
      const activity = { id: activityId, isActive: true, createdBy: { id: 'teacher-1' } } as Activity;
      activityRepository.findOne.mockResolvedValue(activity);

      await expect(service.remove(activityId, 'teacher-2')).rejects.toBeInstanceOf(ForbiddenException);
      expect(activityRepository.save).not.toHaveBeenCalled();
    });

    it('debería lanzar NotFoundException si la actividad no existe', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'teacher-1', role: UserRole.TEACHER } as User);
      activityRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(activityId, 'teacher-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('debería desactivar la actividad cuando el docente es propietario', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'teacher-1', role: UserRole.TEACHER } as User);
      const activity = { id: activityId, isActive: true, createdBy: { id: 'teacher-1' } } as Activity;
      activityRepository.findOne.mockResolvedValue(activity);
      activityRepository.save.mockImplementation(async (entity) => entity as Activity);

      await service.remove(activityId, 'teacher-1');

      expect(activityRepository.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    });
  });
});
