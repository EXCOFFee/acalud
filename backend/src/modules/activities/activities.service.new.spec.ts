import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ActivitiesService } from './activities.service.new';
import { Activity, ActivityType, DifficultyLevel } from './activity.entity';
import { ActivityCompletion } from './activity-completion.entity';
import { User, UserRole } from '../users/user.entity';
import { Classroom } from '../classrooms/classroom.entity';
import { createMockRepository } from '../../test/setup';

const createQueryBuilderMock = () => {
  const qb: any = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
  };
  return qb;
};

const buildActivity = (overrides: Partial<Activity> = {}): Activity => {
  const activity = Object.assign(new Activity(), {
    id: 'activity-1',
    title: 'Actividad Demo',
    description: 'Descripción válida para publicación',
    type: ActivityType.QUIZ,
    difficulty: DifficultyLevel.MEDIUM,
    subject: 'Matemáticas',
    content: {
      questions: [
        {
          question: '¿Pregunta demo?',
          options: ['Respuesta A', 'Respuesta B'],
          correctAnswer: 0,
        },
      ],
    },
    rewards: { coins: 10, experience: 20 },
    tags: [],
    estimatedTime: 10,
    baseExperience: 50,
    dueDate: null,
    maxAttempts: 3,
    isPublic: false,
    isActive: true,
    settings: {},
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    classroomId: 'classroom-1',
    classroom: { id: 'classroom-1' } as Classroom,
    createdById: 'teacher-1',
    createdBy: { id: 'teacher-1' } as User,
    completions: [],
    libraryEntries: [],
  });

  Object.assign(activity, overrides);
  return activity;
};

describe('ActivitiesService (refactor)', () => {
  let service: ActivitiesService;
  let activityRepository: any;
  let completionRepository: any;
  let userRepository: any;
  let classroomRepository: any;
  let queryBuilder: ReturnType<typeof createQueryBuilderMock>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        {
          provide: getRepositoryToken(Activity),
          useFactory: createMockRepository,
        },
        {
          provide: getRepositoryToken(ActivityCompletion),
          useFactory: createMockRepository,
        },
        {
          provide: getRepositoryToken(User),
          useFactory: createMockRepository,
        },
        {
          provide: getRepositoryToken(Classroom),
          useFactory: createMockRepository,
        },
      ],
    }).compile();

  service = module.get(ActivitiesService);
  activityRepository = module.get(getRepositoryToken(Activity)) as any;
  completionRepository = module.get(getRepositoryToken(ActivityCompletion)) as any;
  userRepository = module.get(getRepositoryToken(User)) as any;
  classroomRepository = module.get(getRepositoryToken(Classroom)) as any;

    queryBuilder = createQueryBuilderMock();
    (activityRepository.createQueryBuilder as jest.Mock).mockReturnValue(queryBuilder);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const teacherId = 'teacher-1';
    const classroomId = 'classroom-1';

    it('crea una actividad cuando el docente es propietario del aula', async () => {
      const dto: any = { classroomId, title: 'Quiz', type: ActivityType.QUIZ };
      classroomRepository.findOne.mockResolvedValue({
        id: classroomId,
        teacher: { id: teacherId } as User,
      } as Classroom);

      const created = { id: 'activity-1', ...dto } as Activity;
      activityRepository.create.mockReturnValue(created);
      activityRepository.save.mockResolvedValue(created);

      const result = await service.create(dto, teacherId);

      expect(activityRepository.create).toHaveBeenCalledWith({
        ...dto,
        createdById: teacherId,
        classroom: expect.objectContaining({ id: classroomId }),
      });
      expect(activityRepository.save).toHaveBeenCalledWith(created);
      expect(result).toBe(created);
    });

    it('lanza NotFoundException si el aula no existe', async () => {
      classroomRepository.findOne.mockResolvedValue(null);

      await expect(service.create({ classroomId } as any, teacherId)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza ForbiddenException si otro docente intenta crear', async () => {
      classroomRepository.findOne.mockResolvedValue({
        id: classroomId,
        teacher: { id: 'other' } as User,
      } as Classroom);

      await expect(service.create({ classroomId } as any, teacherId)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('aplica filtros básicos y retorna paginación', async () => {
      const activities = [{ id: 'a1' } as Activity];
      queryBuilder.getManyAndCount.mockResolvedValue([activities, 1]);
      userRepository.findOne.mockResolvedValue({ id: 'teacher', role: UserRole.TEACHER } as User);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        userId: 'teacher',
      });

      expect(activityRepository.createQueryBuilder).toHaveBeenCalledWith('activity');
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('activity.isActive = :isActive', { isActive: true });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('activity.createdById = :userId', { userId: 'teacher' });
      expect(queryBuilder.getManyAndCount).toHaveBeenCalled();
      expect(result).toEqual({
        data: activities,
        meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
      });
    });

    it('filtra aulas disponibles para estudiantes inscritos', async () => {
      const activities = [] as Activity[];
      queryBuilder.getManyAndCount.mockResolvedValue([activities, 0]);
      userRepository.findOne.mockResolvedValue({
        id: 'student-1',
        role: UserRole.STUDENT,
        enrolledClassrooms: [{ id: 'c1' }, { id: 'c2' }],
      } as unknown as User);

      await service.findAll({ page: 1, limit: 5, userId: 'student-1' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('activity.classroomId IN (:...classroomIds)', {
        classroomIds: ['c1', 'c2'],
      });
    });
  });

  describe('getClassroomActivities', () => {
    it('lanza NotFoundException si el usuario no existe', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getClassroomActivities('classroom', 'user')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza ForbiddenException si un estudiante no está inscrito', async () => {
      userRepository.findOne.mockResolvedValue({
        id: 'student',
        role: UserRole.STUDENT,
        enrolledClassrooms: [{ id: 'other-classroom' }],
      } as unknown as User);

      await expect(service.getClassroomActivities('target-classroom', 'student')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lanza ForbiddenException si el docente no es dueño del aula', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'teacher', role: UserRole.TEACHER } as User);
      classroomRepository.findOne.mockResolvedValue(null);

      await expect(service.getClassroomActivities('classroom', 'teacher')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('retorna actividades cuando el docente es propietario', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'teacher', role: UserRole.TEACHER } as User);
      classroomRepository.findOne.mockResolvedValue({ id: 'classroom', teacher: { id: 'teacher' } } as Classroom);
      const activities = [{ id: 'activity-1' } as Activity];
      activityRepository.find.mockResolvedValue(activities);

      const result = await service.getClassroomActivities('classroom', 'teacher');

      expect(activityRepository.find).toHaveBeenCalledWith({
        where: { classroom: { id: 'classroom' } },
        relations: ['classroom', 'createdBy', 'completions'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toBe(activities);
    });
  });

  describe('findById', () => {
    it('lanza NotFoundException cuando la actividad no existe', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('activity', 'user')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('retorna la actividad cuando el usuario admin tiene acceso', async () => {
      const activity = {
        id: 'activity',
        classroom: { id: 'classroom' },
        createdBy: { id: 'owner' },
      } as unknown as Activity;
      activityRepository.findOne.mockResolvedValue(activity);
      userRepository.findOne.mockResolvedValue({ id: 'admin', role: UserRole.ADMIN } as User);

      const result = await service.findById('activity', 'admin');

      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'admin' },
        relations: ['enrolledClassrooms'],
      });
      expect(result).toBe(activity);
    });
  });

  describe('update', () => {
    it('lanza NotFoundException si la actividad no existe', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(service.update('activity', {} as any, 'teacher')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza ForbiddenException si otro docente intenta actualizar', async () => {
      const activity = {
        id: 'activity',
        createdBy: { id: 'owner' },
        classroom: { id: 'c1' },
      } as Activity;
      activityRepository.findOne.mockResolvedValue(activity);

      await expect(service.update('activity', {} as any, 'teacher-2')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('guarda los cambios cuando el propietario actualiza', async () => {
      const activity = {
        id: 'activity',
        createdBy: { id: 'teacher' },
        classroom: { id: 'c1' },
      } as Activity;
      activityRepository.findOne.mockResolvedValue(activity);
  activityRepository.save.mockResolvedValue({ ...activity, title: 'Actualizada' } as Activity);

      const result = await service.update('activity', { title: 'Actualizada' } as any, 'teacher');

      expect(activityRepository.save).toHaveBeenCalledWith(expect.objectContaining({ title: 'Actualizada' }));
      expect(result.title).toBe('Actualizada');
    });
  });

  describe('remove', () => {
    it('lanza NotFoundException si la actividad no existe', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'user', role: UserRole.TEACHER } as User);
      activityRepository.findOne.mockResolvedValue(null);

      await expect(service.remove('activity', 'user')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('desactiva la actividad cuando el usuario es admin', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'admin', role: UserRole.ADMIN } as User);
      activityRepository.findOne.mockResolvedValue({ id: 'activity', createdBy: { id: 'teacher' } } as Activity);

      await service.remove('activity', 'admin');

      expect(activityRepository.save).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
    });

    it('lanza ForbiddenException si un docente distinto intenta eliminar', async () => {
      userRepository.findOne.mockResolvedValue({ id: 'teacher-2', role: UserRole.TEACHER } as User);
      activityRepository.findOne.mockResolvedValue({
        id: 'activity',
        createdBy: { id: 'owner' },
      } as Activity);

      await expect(service.remove('activity', 'teacher-2')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('completeActivity', () => {
    const activityId = 'activity';
    const studentId = 'student';

    it('lanza NotFoundException si la actividad no existe', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(service.completeActivity(activityId, {} as any, studentId)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza BadRequestException si la actividad está inactiva', async () => {
      activityRepository.findOne.mockResolvedValue({
        id: activityId,
        isActive: false,
        classroom: { students: [] },
      } as Activity);

      await expect(
        service.completeActivity(activityId, { score: 80, timeSpent: 10, answers: [] } as any, studentId),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza ForbiddenException si el estudiante no pertenece al aula', async () => {
      activityRepository.findOne.mockResolvedValue({
        id: activityId,
        isActive: true,
        classroom: { students: [{ id: 'other' }] },
      } as Activity);

      await expect(
        service.completeActivity(activityId, { score: 80, timeSpent: 10, answers: [] } as any, studentId),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('actualiza un completion existente', async () => {
      activityRepository.findOne.mockResolvedValue({
        id: activityId,
        isActive: true,
        classroom: { students: [{ id: studentId }] },
      } as Activity);

      const completion = {
        id: 'completion',
        attempts: 1,
        score: 70,
        studentId,
        activityId,
        timeSpent: 5,
        student: {},
        activity: {},
      } as unknown as ActivityCompletion;

      completionRepository.findOne.mockResolvedValue(completion);
      completionRepository.save.mockImplementation(async (entity) => entity as ActivityCompletion);

      const result = await service.completeActivity(
        activityId,
        { score: 90, timeSpent: 12, answers: [] } as any,
        studentId,
      );

      expect(result.score).toBe(90);
      expect(result.attempts).toBe(2);
      expect(completionRepository.save).toHaveBeenCalled();
    });

    it('crea un completion cuando no existe registro previo', async () => {
      activityRepository.findOne.mockResolvedValue({
        id: activityId,
        isActive: true,
        classroom: { students: [{ id: studentId }] },
      } as Activity);
      completionRepository.findOne.mockResolvedValue(null);

      const created = { id: 'new-completion' } as ActivityCompletion;
      completionRepository.create.mockReturnValue(created);
      completionRepository.save.mockResolvedValue(created);

      const result = await service.completeActivity(
        activityId,
        { score: 75, timeSpent: 8, answers: [] } as any,
        studentId,
      );

      expect(completionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ activityId, studentId, score: 75, attempts: 1 }),
      );
      expect(result).toBe(created);
    });
  });

  describe('publishActivity', () => {
    const activityId = 'activity-1';
    const teacherId = 'teacher-1';

    it('publica la actividad cuando el docente propietario la solicita', async () => {
      const activity = buildActivity();
      activityRepository.findOne.mockResolvedValue(activity);
      activityRepository.save.mockImplementation(async (entity) => entity);

      const result = await service.publishActivity(activityId, teacherId);

      expect(activityRepository.findOne).toHaveBeenCalledWith({
        where: { id: activityId },
        relations: ['createdBy', 'classroom'],
      });
      expect(result.isPublic).toBe(true);
      expect(activityRepository.save).toHaveBeenCalledWith(expect.objectContaining({ isPublic: true }));
    });

    it('lanza NotFoundException cuando la actividad no existe', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(service.publishActivity(activityId, teacherId)).rejects.toBeInstanceOf(NotFoundException);
      expect(activityRepository.save).not.toHaveBeenCalled();
    });

    it('lanza ForbiddenException si otro docente intenta publicar', async () => {
      activityRepository.findOne.mockResolvedValue(buildActivity({ createdBy: { id: 'other-teacher' } as User }));

      await expect(service.publishActivity(activityId, teacherId)).rejects.toBeInstanceOf(ForbiddenException);
      expect(activityRepository.save).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si la actividad ya está publicada', async () => {
      activityRepository.findOne.mockResolvedValue(buildActivity({ isPublic: true }));

      await expect(service.publishActivity(activityId, teacherId)).rejects.toBeInstanceOf(BadRequestException);
      expect(activityRepository.save).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si la actividad está inactiva', async () => {
      activityRepository.findOne.mockResolvedValue(buildActivity({ isActive: false }));

      await expect(service.publishActivity(activityId, teacherId)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('valida que un quiz tenga preguntas antes de publicar', async () => {
      activityRepository.findOne.mockResolvedValue(
        buildActivity({ content: { questions: [] } })
      );

      await expect(service.publishActivity(activityId, teacherId)).rejects.toBeInstanceOf(BadRequestException);
      expect(activityRepository.save).not.toHaveBeenCalled();
    });

    it('valida que existan recompensas configuradas', async () => {
      activityRepository.findOne.mockResolvedValue(
        buildActivity({ rewards: { coins: undefined as unknown as number, experience: 10 } })
      );

      await expect(service.publishActivity(activityId, teacherId)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getActivityStats', () => {
    it('lanza NotFoundException si la actividad no existe', async () => {
      activityRepository.findOne.mockResolvedValue(null);

      await expect(service.getActivityStats('activity', 'teacher')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza ForbiddenException si el usuario no es dueño', async () => {
      activityRepository.findOne.mockResolvedValue({
        id: 'activity',
        createdBy: { id: 'other' },
      } as Activity);

      await expect(service.getActivityStats('activity', 'teacher')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('calcula estadísticas correctamente cuando hay completions', async () => {
      activityRepository.findOne.mockResolvedValue({
        id: 'activity',
        createdBy: { id: 'teacher' },
        classroom: { students: [{ id: 's1' }, { id: 's2' }] },
      } as unknown as Activity);

      const completions: ActivityCompletion[] = [
        {
          id: 'c1',
          score: 90,
          attempts: 1,
          completedAt: new Date('2025-01-01'),
          student: { id: 'u1', firstName: 'A', lastName: 'B', avatar: null } as User,
        } as ActivityCompletion,
        {
          id: 'c2',
          score: 70,
          attempts: 2,
          completedAt: new Date('2025-01-02'),
          student: { id: 'u2', firstName: 'C', lastName: 'D', avatar: null } as User,
        } as ActivityCompletion,
      ];

      completionRepository.find.mockResolvedValue(completions);

      const stats = await service.getActivityStats('activity', 'teacher');

      expect(stats.totalCompletions).toBe(2);
      expect(stats.averageScore).toBe(80);
      expect(stats.averageAttempts).toBe(1.5);
      expect(stats.completionRate).toBe(100);
      expect(stats.topScorers[0].score).toBe(90);
    });
  });
});
