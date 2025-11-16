import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ClassroomsService } from './classrooms.service';
import { Classroom } from './classroom.entity';
import { Activity, ActivityType, DifficultyLevel } from '../activities/activity.entity';
import { User, UserRole } from '../users/user.entity';

type MockedRepository<T> = jest.Mocked<Repository<T>>;

const createRepositoryMock = <T>(): MockedRepository<T> => ({
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
  manager: {} as any,
  metadata: {} as any,
} as unknown as MockedRepository<T>);

const buildUser = (overrides: Partial<User> = {}): User => (
  Object.assign(new User(), {
    id: 'user-1',
    email: 'user@test.com',
    firstName: 'Test',
    lastName: 'User',
    name: 'Test User',
    role: UserRole.TEACHER,
    avatar: null,
    coins: 0,
    level: 1,
    experience: 0,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    password: 'hashed',
    ownedClassrooms: [],
    enrolledClassrooms: [],
    achievements: [],
    activityCompletions: [],
    preferences: {},
    createdActivities: [],
    sharedActivities: [],
    activityRatings: [],
    inventory: [],
    purchases: [],
    createdGames: [],
    gameResults: [],
    ...overrides,
  })
);

const buildClassroom = (overrides: Partial<Classroom> = {}): Classroom => (
  Object.assign(new Classroom(), {
    id: 'classroom-1',
    name: 'Aula Demo',
    description: 'Descripción larga',
    subject: 'Ciencias',
    grade: '5 Básico',
    inviteCode: 'INVITE1',
    color: '#123456',
    coverImage: null,
    settings: { maxStudents: 50 },
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-02'),
    teacherId: 'teacher-1',
    teacher: buildUser({ id: 'teacher-1', role: UserRole.TEACHER }),
    students: [],
    activities: [],
    tags: [],
    invitedStudentEmails: [],
    level: 'intermedio',
    timezone: 'America/Santiago',
    language: 'es',
    ...overrides,
  })
);

const buildActivity = (overrides: Partial<Activity> = {}): Activity => (
  Object.assign(new Activity(), {
    id: 'activity-1',
    title: 'Actividad Base',
    description: 'Contenido base',
    type: ActivityType.QUIZ,
    difficulty: DifficultyLevel.MEDIUM,
    subject: 'Ciencias',
    content: { instructions: ['Responder preguntas de práctica'] },
    rewards: { coins: 10, experience: 100 },
    tags: [],
    estimatedTime: 10,
    baseExperience: 100,
    dueDate: null,
    maxAttempts: null,
    isPublic: false,
    isActive: true,
    settings: {},
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-04'),
    classroomId: null,
    classroom: null,
    createdById: 'teacher-1',
    createdBy: buildUser({ id: 'teacher-1', role: UserRole.TEACHER }),
    completions: [],
    libraryEntries: [],
    ...overrides,
  })
);

describe('ClassroomsService', () => {
  let service: ClassroomsService;
  let classroomRepository: MockedRepository<Classroom>;
  let activityRepository: MockedRepository<Activity>;
  let userRepository: MockedRepository<User>;

  const setupQueryBuilder = () => {
    const qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getMany: jest.fn(),
    };

    (classroomRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);
    return qb;
  };

  beforeEach(() => {
    classroomRepository = createRepositoryMock<Classroom>();
    activityRepository = createRepositoryMock<Activity>();
    userRepository = createRepositoryMock<User>();

    service = new ClassroomsService(classroomRepository, activityRepository, userRepository);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('crea un aula normalizando etiquetas e invitaciones', async () => {
      const teacher = buildUser({ id: 'teacher-1', role: UserRole.TEACHER });
      userRepository.findOne.mockResolvedValueOnce(teacher);

      const classroomEntity = buildClassroom({ inviteCode: 'ABCD1234' });
      classroomRepository.create.mockReturnValue(classroomEntity);
      classroomRepository.save.mockResolvedValue(classroomEntity);

      const mathSpy = jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
      classroomRepository.findOne.mockResolvedValueOnce(null);

      const dto = {
        name: 'Aula Matemática',
        description: 'Descripción Larga',
        subject: ' Matemática ',
        grade: '6 Básico',
        tags: [' Ciencia ', 'ciencia', 'Matemática'],
        invitedStudentEmails: ['Alumno@Mail.Com ', ' alumno@mail.com'],
        settings: { maxStudents: 80 },
      } as any;

      const result = await service.create(dto, 'teacher-1');

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'teacher-1' } });
      expect(classroomRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          teacherId: 'teacher-1',
          tags: ['ciencia', 'matemática'],
          invitedStudentEmails: ['alumno@mail.com'],
          settings: expect.objectContaining({ maxStudents: 80 }),
        }),
      );
      expect(classroomRepository.save).toHaveBeenCalledWith(classroomEntity);
      expect(result).toBe(classroomEntity);

      mathSpy.mockRestore();
    });

    it('lanza NotFoundException cuando el docente no existe', async () => {
      userRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.create({} as any, 'missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza ForbiddenException cuando el usuario no es docente ni admin', async () => {
      userRepository.findOne.mockResolvedValueOnce(buildUser({ role: UserRole.STUDENT }));

      await expect(service.create({} as any, 'student')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('findAll', () => {
    it('aplica filtros y paginación correctamente', async () => {
      const qb = setupQueryBuilder();
      const classroom = buildClassroom();
      qb.getManyAndCount.mockResolvedValue([[classroom], 1]);

      const result = await service.findAll({
        page: 2,
        limit: 5,
        search: 'Matemática',
        subject: 'Ciencia',
        grade: '5 Básico',
        teacherId: 'teacher-1',
      });

      expect(qb.where).toHaveBeenCalledWith('classroom.isActive = :isActive', { isActive: true });
      expect(qb.andWhere).toHaveBeenCalledWith(
        '(classroom.name ILIKE :search OR classroom.description ILIKE :search OR classroom.subject ILIKE :search)',
        { search: '%Matemática%' },
      );
      expect(qb.skip).toHaveBeenCalledWith(5);
      expect(result.pagination).toEqual({
        page: 2,
        limit: 5,
        total: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });
  });

  describe('findById', () => {
    it('retorna el aula cuando existe', async () => {
      const classroom = buildClassroom();
      classroomRepository.findOne.mockResolvedValueOnce(classroom);

      const result = await service.findById('classroom-1');

      expect(classroomRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'classroom-1' },
        relations: ['teacher', 'students', 'activities'],
      });
      expect(result).toBe(classroom);
    });

    it('lanza NotFoundException cuando no existe', async () => {
      classroomRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.findById('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('actualiza el aula cuando el docente es propietario', async () => {
      const classroom = buildClassroom({ tags: ['previa'], invitedStudentEmails: ['old@mail.com'] });
      const updated = buildClassroom({
        tags: ['previa', 'historia'],
        invitedStudentEmails: ['new@mail.com'],
      });

      classroomRepository.findOne
        .mockResolvedValueOnce(classroom)
        .mockResolvedValueOnce(updated);

      const dto = {
        description: 'Nueva',
        tags: [' Historia ', 'previa'],
        invitedStudentEmails: ['NEW@mail.com '],
        settings: { maxStudents: 60 },
      } as any;

      const result = await service.update('classroom-1', dto, 'teacher-1');

      expect(classroomRepository.update).toHaveBeenCalledWith(
        'classroom-1',
        expect.objectContaining({
          tags: ['historia', 'previa'],
          invitedStudentEmails: ['new@mail.com'],
          settings: expect.objectContaining({ maxStudents: 60 }),
        }),
      );
      expect(result).toBe(updated);
    });

    it('permite que un administrador actualice un aula ajena', async () => {
      const classroom = buildClassroom({ teacherId: 'teacher-1' });
      const updated = buildClassroom({ teacherId: 'teacher-1', description: 'Admin editó' });

      classroomRepository.findOne
        .mockResolvedValueOnce(classroom)
        .mockResolvedValueOnce(updated);
      userRepository.findOne.mockResolvedValueOnce(buildUser({ id: 'admin', role: UserRole.ADMIN }));

      const result = await service.update('classroom-1', { description: 'Admin editó' } as any, 'admin');

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { id: 'admin' } });
      expect(result).toBe(updated);
    });

    it('lanza ForbiddenException cuando no tiene permisos', async () => {
      const classroom = buildClassroom({ teacherId: 'teacher-1' });
      classroomRepository.findOne.mockResolvedValueOnce(classroom);
      userRepository.findOne.mockResolvedValueOnce(buildUser({ id: 'student', role: UserRole.STUDENT }));

      await expect(service.update('classroom-1', {} as any, 'student')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('desactiva el aula cuando el usuario es propietario', async () => {
      const classroom = buildClassroom();
      classroomRepository.findOne.mockResolvedValueOnce(classroom);

      await service.remove('classroom-1', 'teacher-1');

      expect(classroomRepository.update).toHaveBeenCalledWith('classroom-1', { isActive: false });
    });

    it('permite a un administrador eliminar el aula', async () => {
      const classroom = buildClassroom({ teacherId: 'teacher-1' });
      classroomRepository.findOne.mockResolvedValueOnce(classroom);
      userRepository.findOne.mockResolvedValueOnce(buildUser({ id: 'admin', role: UserRole.ADMIN }));

      await service.remove('classroom-1', 'admin');

      expect(classroomRepository.update).toHaveBeenCalledWith('classroom-1', { isActive: false });
    });

    it('lanza ForbiddenException cuando no tiene permisos', async () => {
      const classroom = buildClassroom({ teacherId: 'teacher-1' });
      classroomRepository.findOne.mockResolvedValueOnce(classroom);
      userRepository.findOne.mockResolvedValueOnce(buildUser({ id: 'user-2', role: UserRole.STUDENT }));

      await expect(service.remove('classroom-1', 'user-2')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('joinClassroom', () => {
    it('agrega al estudiante cuando hay cupos disponibles', async () => {
      const classroom = buildClassroom({ students: [], settings: { maxStudents: 2 } });
      const updatedClassroom = buildClassroom({ id: 'classroom-1', students: [buildUser({ id: 'student-1', role: UserRole.STUDENT })] });

      classroomRepository.findOne
        .mockResolvedValueOnce(classroom)
        .mockResolvedValueOnce(updatedClassroom);

      userRepository.findOne.mockResolvedValueOnce(buildUser({ id: 'student-1', role: UserRole.STUDENT }));
      classroomRepository.save.mockResolvedValue(classroom);

      const result = await service.joinClassroom({ inviteCode: 'INVITE1' }, 'student-1');

      expect(classroomRepository.save).toHaveBeenCalledWith(expect.objectContaining({
        students: expect.arrayContaining([expect.objectContaining({ id: 'student-1' })]),
      }));
      expect(result).toBe(updatedClassroom);
    });

    it('lanza NotFoundException cuando el código es inválido', async () => {
      classroomRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.joinClassroom({ inviteCode: 'INVALID' }, 'student-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza BadRequestException cuando el usuario no es estudiante', async () => {
      const classroom = buildClassroom({ students: [] });
      classroomRepository.findOne.mockResolvedValueOnce(classroom);
      userRepository.findOne.mockResolvedValueOnce(buildUser({ id: 'user-2', role: UserRole.TEACHER }));

      await expect(service.joinClassroom({ inviteCode: 'INVITE1' }, 'user-2')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza ConflictException cuando ya está inscrito', async () => {
      const classroom = buildClassroom({ students: [buildUser({ id: 'student-1', role: UserRole.STUDENT })] });
      classroomRepository.findOne.mockResolvedValueOnce(classroom);
      userRepository.findOne.mockResolvedValueOnce(buildUser({ id: 'student-1', role: UserRole.STUDENT }));

      await expect(service.joinClassroom({ inviteCode: 'INVITE1' }, 'student-1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('lanza BadRequestException cuando el aula está llena', async () => {
      const classroom = buildClassroom({
        students: [buildUser({ id: 'student-1', role: UserRole.STUDENT })],
        settings: { maxStudents: 1 },
      });
      classroomRepository.findOne.mockResolvedValueOnce(classroom);
      userRepository.findOne.mockResolvedValueOnce(buildUser({ id: 'student-2', role: UserRole.STUDENT }));

      await expect(service.joinClassroom({ inviteCode: 'INVITE1' }, 'student-2')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('leaveClassroom', () => {
    it('remueve al estudiante del aula', async () => {
      const classroom = buildClassroom({
        students: [buildUser({ id: 'student-1', role: UserRole.STUDENT })],
      });
      classroomRepository.findOne.mockResolvedValueOnce(classroom);

      await service.leaveClassroom('classroom-1', 'student-1');

      expect(classroomRepository.save).toHaveBeenCalledWith(expect.objectContaining({ students: [] }));
    });

    it('lanza NotFoundException cuando el aula no existe', async () => {
      classroomRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.leaveClassroom('classroom-1', 'student-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza BadRequestException cuando el estudiante no está inscrito', async () => {
      const classroom = buildClassroom({ students: [] });
      classroomRepository.findOne.mockResolvedValueOnce(classroom);

      await expect(service.leaveClassroom('classroom-1', 'student-1')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getTeacherClassrooms', () => {
    it('delegates to repository find', async () => {
      const classrooms = [buildClassroom({ id: 'c1' })];
      classroomRepository.find.mockResolvedValueOnce(classrooms);

      const result = await service.getTeacherClassrooms('teacher-1');

      expect(classroomRepository.find).toHaveBeenCalledWith({
        where: { teacherId: 'teacher-1', isActive: true },
        relations: ['students'],
        order: { createdAt: 'DESC' },
      });
      expect(result).toBe(classrooms);
    });
  });

  describe('getStudentClassrooms', () => {
    it('usa query builder para recuperar aulas activas', async () => {
      const qb = setupQueryBuilder();
      qb.getMany.mockResolvedValue(['list']);

      const result = await service.getStudentClassrooms('student-1');

      expect(qb.leftJoinAndSelect).toHaveBeenCalledWith('classroom.teacher', 'teacher');
      expect(qb.leftJoin).toHaveBeenCalledWith('classroom.students', 'student');
      expect(qb.getMany).toHaveBeenCalled();
      expect(result).toEqual(['list']);
    });
  });

  describe('regenerateInviteCode', () => {
    it('regenera el código cuando tiene permisos', async () => {
      const classroom = buildClassroom({ teacherId: 'teacher-1' });
      classroomRepository.findOne.mockResolvedValueOnce(classroom);

      const inviteCodeSpy = jest
        .spyOn<any, any>(service as any, 'generateUniqueInviteCode')
        .mockResolvedValue('NEWCODE');

      const result = await service.regenerateInviteCode('classroom-1', 'teacher-1');

      expect(inviteCodeSpy).toHaveBeenCalled();
      expect(classroomRepository.update).toHaveBeenCalledWith('classroom-1', { inviteCode: 'NEWCODE' });
      expect(result).toBe('NEWCODE');
    });

    it('lanza ForbiddenException cuando no tiene permisos', async () => {
      const classroom = buildClassroom({ teacherId: 'teacher-1' });
      classroomRepository.findOne.mockResolvedValueOnce(classroom);
      userRepository.findOne.mockResolvedValueOnce(buildUser({ id: 'user-2', role: UserRole.STUDENT }));

      await expect(service.regenerateInviteCode('classroom-1', 'user-2')).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('getClassroomStats', () => {
    it('calcula estadísticas básicas', async () => {
      const classroom = buildClassroom({
        students: [buildUser({ id: 's1' }), buildUser({ id: 's2' })],
        activities: [buildActivity({ id: 'a1', isActive: true }), buildActivity({ id: 'a2', isActive: false })],
      });
      classroomRepository.findOne.mockResolvedValueOnce(classroom);

      const stats = await service.getClassroomStats('classroom-1');

      expect(stats).toEqual({
        totalStudents: 2,
        totalActivities: 2,
        activeActivities: 1,
        createdAt: classroom.createdAt,
        isActive: classroom.isActive,
      });
    });

    it('lanza NotFoundException cuando el aula no existe', async () => {
      classroomRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.getClassroomStats('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('addActivity', () => {
    it('asocia la actividad al aula cuando cumple condiciones', async () => {
      const classroom = buildClassroom({ activities: [] });
      const updatedClassroom = buildClassroom({ activities: [buildActivity({ id: 'activity-1', classroomId: 'classroom-1' })] });
      const activity = buildActivity({ classroom: null as any });

      classroomRepository.findOne
        .mockResolvedValueOnce(classroom)
        .mockResolvedValueOnce(updatedClassroom);
      activityRepository.findOne.mockResolvedValueOnce(activity);
      activityRepository.save.mockResolvedValue(activity);

      const result = await service.addActivity('classroom-1', 'activity-1', 'teacher-1');

      expect(activityRepository.save).toHaveBeenCalledWith(expect.objectContaining({ classroomId: 'classroom-1' }));
      expect(result).toBe(updatedClassroom);
    });

    it('lanza NotFoundException cuando el aula no existe', async () => {
      classroomRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.addActivity('classroom-1', 'activity-1', 'teacher-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza NotFoundException cuando la actividad no existe', async () => {
      const classroom = buildClassroom();
      classroomRepository.findOne.mockResolvedValueOnce(classroom);
      activityRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.addActivity('classroom-1', 'activity-1', 'teacher-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza BadRequestException cuando la actividad está inactiva', async () => {
      const classroom = buildClassroom();
      const activity = buildActivity({ isActive: false });
      classroomRepository.findOne.mockResolvedValueOnce(classroom);
      activityRepository.findOne.mockResolvedValueOnce(activity);

      await expect(service.addActivity('classroom-1', 'activity-1', 'teacher-1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('lanza ConflictException cuando la actividad ya está en el aula', async () => {
      const classroom = buildClassroom({ activities: [buildActivity({ id: 'activity-1' })] });
      const activity = buildActivity();
      classroomRepository.findOne.mockResolvedValueOnce(classroom);
      activityRepository.findOne.mockResolvedValueOnce(activity);

      await expect(service.addActivity('classroom-1', 'activity-1', 'teacher-1')).rejects.toBeInstanceOf(ConflictException);
    });

    it('lanza ForbiddenException cuando la actividad fue creada por otro docente', async () => {
      const classroom = buildClassroom({ teacherId: 'teacher-1' });
      const activity = buildActivity({ createdById: 'teacher-2', createdBy: { id: 'teacher-2' } as User });
      classroomRepository.findOne.mockResolvedValueOnce(classroom);
      activityRepository.findOne.mockResolvedValueOnce(activity);
      userRepository.findOne.mockResolvedValueOnce(buildUser({ id: 'teacher-1', role: UserRole.TEACHER }));

      await expect(service.addActivity('classroom-1', 'activity-1', 'teacher-1')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lanza ConflictException cuando la actividad pertenece a otro aula', async () => {
      const classroom = buildClassroom({ teacherId: 'teacher-1' });
      const activity = buildActivity({ classroom: buildClassroom({ id: 'classroom-2' }), classroomId: 'classroom-2' });
      classroomRepository.findOne.mockResolvedValueOnce(classroom);
      activityRepository.findOne.mockResolvedValueOnce(activity);
      userRepository.findOne.mockResolvedValueOnce(buildUser({ id: 'teacher-1', role: UserRole.ADMIN }));

      await expect(service.addActivity('classroom-1', 'activity-1', 'admin')).rejects.toBeInstanceOf(ConflictException);
    });
  });

  describe('removeActivity', () => {
    it('desactiva la actividad dentro del aula', async () => {
      const activity = buildActivity({ id: 'activity-1' });
      const classroom = buildClassroom({ activities: [activity] });
      classroomRepository.findOne.mockResolvedValueOnce(classroom);

      await service.removeActivity('classroom-1', 'activity-1', 'teacher-1');

      expect(classroomRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          activities: [expect.objectContaining({ id: 'activity-1', isActive: false })],
        }),
      );
    });

    it('lanza NotFoundException cuando el aula no existe', async () => {
      classroomRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.removeActivity('classroom-1', 'activity-1', 'teacher-1')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza ForbiddenException cuando no tiene permisos', async () => {
      const classroom = buildClassroom({ teacherId: 'teacher-1' });
      classroomRepository.findOne.mockResolvedValueOnce(classroom);
      userRepository.findOne.mockResolvedValueOnce(buildUser({ id: 'user-2', role: UserRole.STUDENT }));

      await expect(service.removeActivity('classroom-1', 'activity-1', 'user-2')).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lanza NotFoundException cuando la actividad no está en el aula', async () => {
      const classroom = buildClassroom({ activities: [] });
      classroomRepository.findOne.mockResolvedValueOnce(classroom);

      await expect(service.removeActivity('classroom-1', 'activity-1', 'teacher-1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
