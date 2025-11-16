import { Repository } from 'typeorm';
import { ClassroomBusinessService } from '../services/classroom-business.service';
import {
  AuthorizationException,
  DataConflictException,
  OperationNotAllowedException,
  ResourceNotFoundException,
  ValidationException,
} from '../../../common/exceptions/business.exception';
import {
  IClassroomRepository,
  IClassroomValidator,
  IPermissionValidator,
  IInviteCodeGenerator,
  IClassroomInvitationService,
} from '../interfaces';
import { Classroom } from '../classroom.entity';
import { Activity, ActivityType, DifficultyLevel } from '../../activities/activity.entity';
import { User, UserRole } from '../../users/user.entity';

type MockTypeOrmRepository<T> = Partial<Record<keyof Repository<T>, jest.Mock>>;

describe('ClassroomBusinessService', () => {
  let service: ClassroomBusinessService;
  let classroomRepository: jest.Mocked<IClassroomRepository>;
  let classroomValidator: jest.Mocked<IClassroomValidator>;
  let permissionValidator: jest.Mocked<IPermissionValidator>;
  let inviteCodeGenerator: jest.Mocked<IInviteCodeGenerator>;
  let invitationService: jest.Mocked<IClassroomInvitationService>;
  let activityRepository: MockTypeOrmRepository<Activity>;
  let userRepository: MockTypeOrmRepository<User>;

  const teacherId = 'teacher-uuid';
  const otherTeacherId = 'other-teacher-uuid';
  const adminId = 'admin-uuid';
  const classroomId = 'classroom-uuid';
  const otherClassroomId = 'other-classroom-uuid';
  const activityId = 'activity-uuid';

  const buildClassroom = (overrides: Partial<Classroom> = {}): Classroom =>
    Object.assign(new Classroom(), {
      id: classroomId,
      name: 'Aula de prueba',
      description: 'Descripcion de prueba',
      subject: 'Matematica',
      grade: '5 Basico',
      inviteCode: 'INV1234',
      color: '#6366f1',
      settings: {},
      level: 'intermedio' as const,
      timezone: 'America/Santiago',
      language: 'es' as const,
      isActive: true,
      teacherId,
      teacher: { id: teacherId } as any,
      students: [],
      activities: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: [],
      invitedStudentEmails: [],
      coverImage: null as any,
      ...overrides,
    });

  const buildActivity = (overrides: Partial<Activity> = {}): Activity =>
    Object.assign(new Activity(), {
      id: activityId,
      title: 'Actividad de prueba',
      description: 'Descripcion extensa para pruebas',
      type: ActivityType.QUIZ,
      difficulty: DifficultyLevel.MEDIUM,
      subject: 'Matematica',
      content: { questions: [{ question: 'Q1', options: ['A', 'B'], correctAnswer: 0 }] },
      rewards: { coins: 10, experience: 100 },
      tags: [],
      estimatedTime: 15,
      baseExperience: 100,
      isPublic: false,
      isActive: true,
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      classroomId,
      classroom: null as any,
      createdById: teacherId,
      createdBy: { id: teacherId } as any,
      completions: [],
      libraryEntries: [],
      dueDate: null,
      maxAttempts: null,
      ...overrides,
    });

  beforeEach(() => {
    classroomRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByInviteCode: jest.fn(),
      findWithFilters: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      addStudent: jest.fn(),
      removeStudent: jest.fn(),
      getStudentCount: jest.fn(),
      findTeacherClassrooms: jest.fn(),
      findStudentClassrooms: jest.fn(),
    } as unknown as jest.Mocked<IClassroomRepository>;

    classroomValidator = {
      validateCreateData: jest.fn().mockResolvedValue(undefined),
      validateUpdateData: jest.fn().mockResolvedValue(undefined),
      validateJoinData: jest.fn().mockResolvedValue(undefined),
      validateFilters: jest.fn().mockResolvedValue(undefined),
      validateCanJoinSpecificClassroom: jest.fn().mockResolvedValue(undefined),
      validateClassroomCapacity: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IClassroomValidator>;

    permissionValidator = {
      validateCanCreateClassroom: jest.fn().mockResolvedValue(undefined),
      validateCanModifyClassroom: jest.fn().mockResolvedValue(undefined),
      validateCanDeleteClassroom: jest.fn().mockResolvedValue(undefined),
      validateCanJoinClassroom: jest.fn().mockResolvedValue(undefined),
      validateCanViewClassroom: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<IPermissionValidator>;

    inviteCodeGenerator = {
      generateUniqueCode: jest.fn().mockResolvedValue('CODE123'),
      validateCodeFormat: jest.fn().mockReturnValue(true),
      isCodeExpired: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<IInviteCodeGenerator>;

    invitationService = {
      sendInvitations: jest.fn().mockResolvedValue({ classroomId: classroomId, requested: 0, processed: [] }),
      listInvitations: jest.fn().mockResolvedValue([]),
      validateInvitationToken: jest.fn(),
      consumeInvitationToken: jest.fn(),
    } as unknown as jest.Mocked<IClassroomInvitationService>;

    activityRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    userRepository = {
      findOne: jest.fn(),
    };

    service = new ClassroomBusinessService(
      classroomRepository,
      classroomValidator,
      permissionValidator,
      inviteCodeGenerator,
      invitationService,
      activityRepository as unknown as Repository<Activity>,
      userRepository as unknown as Repository<User>,
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('addActivityToClassroom', () => {
    it('permite al docente propietario agregar una actividad activa que creó', async () => {
    const classroom = buildClassroom();
    const activity = buildActivity({ classroomId: null as unknown as string, classroom: null as any });
    const classroomWithActivity = buildClassroom({ activities: [buildActivity()] });

    (classroomRepository.findById as jest.Mock)
      .mockResolvedValueOnce(classroom)
      .mockResolvedValueOnce(classroomWithActivity);

    (activityRepository.findOne as jest.Mock).mockResolvedValue(activity);
    (activityRepository.save as jest.Mock).mockImplementation(async (entity) => entity);
    (userRepository.findOne as jest.Mock).mockResolvedValue({ id: teacherId, role: UserRole.TEACHER });

    const result = await service.addActivityToClassroom(classroomId, activityId, teacherId);

      expect(activityRepository.save).toHaveBeenCalledWith(expect.objectContaining({ classroomId }));
      expect(result.activities).toHaveLength(1);
      expect(result.activities?.[0].id).toBe(activityId);
    });

    it('permite a un administrador agregar una actividad que no creó', async () => {
      const classroom = buildClassroom({
        teacherId: otherTeacherId,
        teacher: { id: otherTeacherId } as any,
      });
      const activity = buildActivity({
        createdById: otherTeacherId,
        createdBy: { id: otherTeacherId } as any,
        classroomId: null as unknown as string,
        classroom: null as any,
      });
      const classroomWithActivity = buildClassroom({
        teacherId: otherTeacherId,
        teacher: { id: otherTeacherId } as any,
        activities: [
          buildActivity({
            createdById: otherTeacherId,
            createdBy: { id: otherTeacherId } as any,
          }),
        ],
      });

      (classroomRepository.findById as jest.Mock)
        .mockResolvedValueOnce(classroom)
        .mockResolvedValueOnce(classroomWithActivity);

      (activityRepository.findOne as jest.Mock).mockResolvedValue(activity);
      (activityRepository.save as jest.Mock).mockImplementation(async (entity) => entity);
      (userRepository.findOne as jest.Mock).mockResolvedValue({ id: adminId, role: UserRole.ADMIN });

      const result = await service.addActivityToClassroom(classroomId, activityId, adminId);

      expect(userRepository.findOne).toHaveBeenCalled();
      expect(result.activities?.[0].id).toBe(activityId);
    });

    it('lanza AuthorizationException si los permisos fallan', async () => {
      permissionValidator.validateCanModifyClassroom.mockRejectedValueOnce(
        new AuthorizationException('modificar aula', 'aula', teacherId),
      );

      await expect(service.addActivityToClassroom(classroomId, activityId, teacherId)).rejects.toBeInstanceOf(
        AuthorizationException,
      );
      expect(activityRepository.findOne).not.toHaveBeenCalled();
    });

    it('lanza ResourceNotFoundException si el aula no existe', async () => {
      (classroomRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.addActivityToClassroom(classroomId, activityId, teacherId)).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );
    });

    it('lanza ResourceNotFoundException si la actividad no existe', async () => {
      const classroom = buildClassroom();

      (classroomRepository.findById as jest.Mock).mockResolvedValueOnce(classroom);
      (activityRepository.findOne as jest.Mock).mockResolvedValue(null);
      (userRepository.findOne as jest.Mock).mockResolvedValue({ id: teacherId, role: UserRole.TEACHER });

      await expect(service.addActivityToClassroom(classroomId, activityId, teacherId)).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );
    });

    it('lanza OperationNotAllowedException si la actividad está inactiva', async () => {
      const classroom = buildClassroom();
      const activity = buildActivity({ isActive: false, classroomId: null as unknown as string });

      (classroomRepository.findById as jest.Mock).mockResolvedValueOnce(classroom);
      (activityRepository.findOne as jest.Mock).mockResolvedValue(activity);
      (userRepository.findOne as jest.Mock).mockResolvedValue({ id: teacherId, role: UserRole.TEACHER });

      await expect(service.addActivityToClassroom(classroomId, activityId, teacherId)).rejects.toBeInstanceOf(
        OperationNotAllowedException,
      );
    });

    it('lanza DataConflictException si la actividad ya está en el aula', async () => {
      const classroom = buildClassroom({ activities: [buildActivity()] });
      const activity = buildActivity({ classroomId: null as unknown as string });

      (classroomRepository.findById as jest.Mock).mockResolvedValueOnce(classroom);
      (activityRepository.findOne as jest.Mock).mockResolvedValue(activity);
      (userRepository.findOne as jest.Mock).mockResolvedValue({ id: teacherId, role: UserRole.TEACHER });

      await expect(service.addActivityToClassroom(classroomId, activityId, teacherId)).rejects.toBeInstanceOf(
        DataConflictException,
      );
    });

    it('lanza AuthorizationException si la actividad fue creada por otro docente y no es administrador', async () => {
      const classroom = buildClassroom();
      const activity = buildActivity({
        createdById: otherTeacherId,
        createdBy: { id: otherTeacherId } as any,
        classroomId: null as unknown as string,
        classroom: null as any,
      });

      (classroomRepository.findById as jest.Mock).mockResolvedValueOnce(classroom);
      (activityRepository.findOne as jest.Mock).mockResolvedValue(activity);
      (userRepository.findOne as jest.Mock).mockResolvedValue({ id: teacherId, role: UserRole.TEACHER });

      await expect(service.addActivityToClassroom(classroomId, activityId, teacherId)).rejects.toBeInstanceOf(
        AuthorizationException,
      );
    });

    it('lanza DataConflictException si la actividad pertenece a otro aula', async () => {
      const classroom = buildClassroom();
      const activity = buildActivity({ classroomId: otherClassroomId, classroom: { id: otherClassroomId } as any });

      (classroomRepository.findById as jest.Mock).mockResolvedValueOnce(classroom);
      (activityRepository.findOne as jest.Mock).mockResolvedValue(activity);
      (userRepository.findOne as jest.Mock).mockResolvedValue({ id: teacherId, role: UserRole.TEACHER });

      await expect(service.addActivityToClassroom(classroomId, activityId, teacherId)).rejects.toBeInstanceOf(
        DataConflictException,
      );
    });
  });

  describe('removeActivityFromClassroom', () => {
    it('marca la actividad como inactiva y la desvincula del aula', async () => {
      permissionValidator.validateCanModifyClassroom.mockResolvedValue(undefined);
      const activity = buildActivity({ classroomId, classroom: { id: classroomId } as any });

      (activityRepository.findOne as jest.Mock).mockResolvedValue(activity);
      (activityRepository.save as jest.Mock).mockImplementation(async (entity) => entity);

      await service.removeActivityFromClassroom(classroomId, activityId, teacherId);

      expect(permissionValidator.validateCanModifyClassroom).toHaveBeenCalledWith(classroomId, teacherId);
      expect(activityRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: activityId, classroomId: null, isActive: false }),
      );
    });

    it('lanza AuthorizationException cuando no tiene permisos', async () => {
      permissionValidator.validateCanModifyClassroom.mockRejectedValueOnce(
        new AuthorizationException('remover actividad del aula', 'aula', teacherId),
      );

      await expect(service.removeActivityFromClassroom(classroomId, activityId, teacherId)).rejects.toBeInstanceOf(
        AuthorizationException,
      );
      expect(activityRepository.findOne).not.toHaveBeenCalled();
    });

    it('lanza ResourceNotFoundException si la actividad no existe', async () => {
      permissionValidator.validateCanModifyClassroom.mockResolvedValue(undefined);
      (activityRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.removeActivityFromClassroom(classroomId, activityId, teacherId)).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );
    });
  });

  describe('generateNewInviteCode', () => {
    it('genera un nuevo código y actualiza el aula', async () => {
      permissionValidator.validateCanModifyClassroom.mockResolvedValue(undefined);
      (classroomRepository.findById as jest.Mock).mockResolvedValue(buildClassroom());
      (inviteCodeGenerator.generateUniqueCode as jest.Mock).mockResolvedValue('NEWCODE');
      (classroomRepository.update as jest.Mock).mockResolvedValue(undefined);

      const result = await service.generateNewInviteCode(classroomId, teacherId);

      expect(permissionValidator.validateCanModifyClassroom).toHaveBeenCalledWith(classroomId, teacherId);
      expect(classroomRepository.update).toHaveBeenCalledWith(classroomId, { inviteCode: 'NEWCODE' });
      expect(result).toBe('NEWCODE');
    });

    it('propaga AuthorizationException cuando no tiene permisos', async () => {
      permissionValidator.validateCanModifyClassroom.mockRejectedValueOnce(
        new AuthorizationException('actualizar código de invitación', 'aula', teacherId),
      );

      await expect(service.generateNewInviteCode(classroomId, teacherId)).rejects.toBeInstanceOf(
        AuthorizationException,
      );
      expect(classroomRepository.findById).not.toHaveBeenCalled();
    });

    it('lanza ResourceNotFoundException si el aula no existe', async () => {
      permissionValidator.validateCanModifyClassroom.mockResolvedValue(undefined);
      (classroomRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.generateNewInviteCode(classroomId, teacherId)).rejects.toBeInstanceOf(
        ResourceNotFoundException,
      );
      expect(classroomRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('createClassroom', () => {
    it('normaliza datos y crea el aula cuando todo es válido', async () => {
      const input = {
        name: 'Aula Integraciones',
        description: 'Descripción Larga',
        subject: 'Ciencias',
        grade: '6 Básico',
        tags: [' Matemática ', 'matemática', 'Ciencias'],
        invitedStudentEmails: ['Alumno@Email.com ', ' alumno@email.com'],
        settings: {
          maxStudents: 80,
          notifications: { announcements: false },
        },
      } as any;

      const createdClassroom = buildClassroom({ id: 'created-classroom' });

      permissionValidator.validateCanCreateClassroom.mockResolvedValue(undefined);
      classroomValidator.validateCreateData.mockResolvedValue(undefined);
      (inviteCodeGenerator.generateUniqueCode as jest.Mock).mockResolvedValue('NEWCODE');
      (classroomRepository.create as jest.Mock).mockResolvedValue(createdClassroom);

      const result = await service.createClassroom(input, teacherId);

      expect(permissionValidator.validateCanCreateClassroom).toHaveBeenCalledWith(teacherId);
      expect(classroomValidator.validateCreateData).toHaveBeenCalledWith(input);
      expect(inviteCodeGenerator.generateUniqueCode).toHaveBeenCalled();
      expect(classroomRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          teacherId,
          inviteCode: 'NEWCODE',
          tags: ['matemática', 'ciencias'],
          invitedStudentEmails: ['alumno@email.com'],
          settings: expect.objectContaining({
            maxStudents: 80,
            notifications: expect.objectContaining({ announcements: false }),
          }),
        }),
      );
      expect(invitationService.sendInvitations).toHaveBeenCalledWith('created-classroom', teacherId, ['alumno@email.com']);
      expect(result).toBe(createdClassroom);
    });

    it('propaga AuthorizationException cuando no tiene permisos para crear', async () => {
      permissionValidator.validateCanCreateClassroom.mockRejectedValueOnce(
        new AuthorizationException('crear aula', 'aula', teacherId),
      );

      await expect(
        service.createClassroom(
          {
            name: 'Demo',
            description: 'Test',
            subject: 'Arte',
            grade: '2 Medio',
          } as any,
          teacherId,
        ),
      ).rejects.toBeInstanceOf(AuthorizationException);

      expect(classroomValidator.validateCreateData).not.toHaveBeenCalled();
      expect(classroomRepository.create).not.toHaveBeenCalled();
      expect(invitationService.sendInvitations).not.toHaveBeenCalled();
    });

    it('propaga ValidationException cuando los datos son inválidos', async () => {
      permissionValidator.validateCanCreateClassroom.mockResolvedValue(undefined);
      classroomValidator.validateCreateData.mockRejectedValueOnce(
        new ValidationException('Datos inválidos', { name: ['Requerido'] }),
      );

      await expect(
        service.createClassroom(
          {
            name: '',
            description: 'Test',
            subject: 'Arte',
            grade: '2 Medio',
          } as any,
          teacherId,
        ),
      ).rejects.toBeInstanceOf(ValidationException);

      expect(classroomRepository.create).not.toHaveBeenCalled();
      expect(invitationService.sendInvitations).not.toHaveBeenCalled();
    });
  });

  describe('updateClassroom', () => {
    it('mezcla configuraciones y etiquetas al actualizar', async () => {
      permissionValidator.validateCanModifyClassroom.mockResolvedValue(undefined);
      classroomValidator.validateUpdateData.mockResolvedValue(undefined);

      const existingClassroom = buildClassroom({
        settings: {
          allowStudentDiscussion: true,
          requireApprovalForJoin: false,
          maxStudents: 40,
          timezone: 'America/Santiago',
          language: 'es',
          notifications: { newStudent: true, activityCompleted: true, announcements: true },
        },
        tags: ['matemática'],
        invitedStudentEmails: ['previo@email.com'],
      });

      const updatePayload = {
        description: 'Actualizada',
        tags: [' Matemática ', 'Historia'],
        invitedStudentEmails: ['nuevo@email.com', 'NUEVO@EMAIL.COM'],
        settings: {
          maxStudents: 60,
          notifications: { announcements: false },
        },
      } as any;

      (classroomRepository.findById as jest.Mock).mockResolvedValue(existingClassroom);
      (classroomRepository.update as jest.Mock).mockResolvedValue(existingClassroom);

      const result = await service.updateClassroom(classroomId, updatePayload, teacherId);

      expect(permissionValidator.validateCanModifyClassroom).toHaveBeenCalledWith(classroomId, teacherId);
      expect(classroomValidator.validateUpdateData).toHaveBeenCalledWith(updatePayload);
      expect(classroomRepository.update).toHaveBeenCalledWith(
        classroomId,
        expect.objectContaining({
          description: 'Actualizada',
          tags: ['matemática', 'historia'],
          invitedStudentEmails: ['nuevo@email.com'],
          settings: expect.objectContaining({
            maxStudents: 60,
            notifications: expect.objectContaining({ announcements: false }),
          }),
        }),
      );
      expect(invitationService.sendInvitations).toHaveBeenCalledWith(classroomId, teacherId, ['nuevo@email.com']);
      expect(result).toBe(existingClassroom);
    });

    it('propaga AuthorizationException cuando no tiene permisos', async () => {
      permissionValidator.validateCanModifyClassroom.mockRejectedValueOnce(
        new AuthorizationException('editar aula', 'aula', teacherId),
      );

      await expect(
        service.updateClassroom(
          classroomId,
          { description: 'Actualizada' } as any,
          teacherId,
        ),
      ).rejects.toBeInstanceOf(AuthorizationException);

      expect(classroomValidator.validateUpdateData).not.toHaveBeenCalled();
      expect(classroomRepository.update).not.toHaveBeenCalled();
      expect(invitationService.sendInvitations).not.toHaveBeenCalled();
    });

    it('propaga ResourceNotFoundException cuando el aula no existe', async () => {
      permissionValidator.validateCanModifyClassroom.mockResolvedValue(undefined);
      classroomValidator.validateUpdateData.mockResolvedValue(undefined);
      (classroomRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateClassroom(
          classroomId,
          { description: 'Actualizada' } as any,
          teacherId,
        ),
      ).rejects.toBeInstanceOf(ResourceNotFoundException);

      expect(classroomRepository.update).not.toHaveBeenCalled();
      expect(invitationService.sendInvitations).not.toHaveBeenCalled();
    });
  });

  describe('findClassrooms', () => {
    it('normaliza filtros y delega en el repositorio', async () => {
      const rawFilters = {
        page: 0,
        limit: 500,
        search: '  Ciencia  ',
        teacherId: ' docente ',
      } as any;

      const paginatedResult = {
        data: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      } as any;

      (classroomRepository.findWithFilters as jest.Mock).mockResolvedValue(paginatedResult);

      const result = await service.findClassrooms(rawFilters);

      expect(classroomValidator.validateFilters).toHaveBeenCalledWith(rawFilters);
      expect(classroomRepository.findWithFilters).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          limit: 100,
          search: 'Ciencia',
          teacherId: 'docente',
          isActive: true,
        }),
      );
      expect(result).toBe(paginatedResult);
    });

    it('propaga ValidationException cuando los filtros no son válidos', async () => {
      classroomValidator.validateFilters.mockRejectedValueOnce(
        new ValidationException('Filtros inválidos', { page: ['Debe ser positivo'] }),
      );

      await expect(service.findClassrooms({ page: -1 } as any)).rejects.toBeInstanceOf(ValidationException);
      expect(classroomRepository.findWithFilters).not.toHaveBeenCalled();
    });
  });

  describe('findClassroomById', () => {
    it('retorna el aula activa', async () => {
      const classroom = buildClassroom();
      (classroomRepository.findById as jest.Mock).mockResolvedValue(classroom);

      const result = await service.findClassroomById(classroomId);

      expect(classroomRepository.findById).toHaveBeenCalledWith(classroomId);
      expect(result).toBe(classroom);
    });

    it('lanza ResourceNotFoundException cuando no existe', async () => {
      (classroomRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(service.findClassroomById(classroomId)).rejects.toBeInstanceOf(ResourceNotFoundException);
    });

    it('lanza OperationNotAllowedException cuando el aula está inactiva', async () => {
      const classroom = buildClassroom({ isActive: false });
      (classroomRepository.findById as jest.Mock).mockResolvedValue(classroom);

      await expect(service.findClassroomById(classroomId)).rejects.toBeInstanceOf(OperationNotAllowedException);
    });
  });

  describe('findClassroomByInviteCode', () => {
    it('retorna el aula encontrada', async () => {
      const classroom = buildClassroom();
      (classroomRepository.findByInviteCode as jest.Mock).mockResolvedValue(classroom);

      const result = await service.findClassroomByInviteCode('INV123');

      expect(classroomRepository.findByInviteCode).toHaveBeenCalledWith('INV123');
      expect(result).toBe(classroom);
    });

    it('lanza ResourceNotFoundException cuando no se encuentra', async () => {
      (classroomRepository.findByInviteCode as jest.Mock).mockResolvedValue(null);

      await expect(service.findClassroomByInviteCode('INV123')).rejects.toBeInstanceOf(ResourceNotFoundException);
    });
  });

  describe('deleteClassroom', () => {
    it('elimina el aula cuando no tiene estudiantes', async () => {
      permissionValidator.validateCanDeleteClassroom.mockResolvedValue(undefined);
      (classroomRepository.findById as jest.Mock).mockResolvedValue(buildClassroom());
      (classroomRepository.getStudentCount as jest.Mock).mockResolvedValue(0);

      await service.deleteClassroom(classroomId, teacherId);

      expect(permissionValidator.validateCanDeleteClassroom).toHaveBeenCalledWith(classroomId, teacherId);
      expect(classroomRepository.delete).toHaveBeenCalledWith(classroomId);
    });

    it('lanza OperationNotAllowedException cuando el aula tiene estudiantes inscritos', async () => {
      permissionValidator.validateCanDeleteClassroom.mockResolvedValue(undefined);
      (classroomRepository.findById as jest.Mock).mockResolvedValue(buildClassroom());
      (classroomRepository.getStudentCount as jest.Mock).mockResolvedValue(5);

      await expect(service.deleteClassroom(classroomId, teacherId)).rejects.toBeInstanceOf(
        OperationNotAllowedException,
      );
      expect(classroomRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('joinClassroom', () => {
    it('agrega al estudiante cuando hay capacidad', async () => {
      permissionValidator.validateCanJoinClassroom.mockResolvedValue(undefined);
      classroomValidator.validateJoinData.mockResolvedValue(undefined);
      classroomValidator.validateCanJoinSpecificClassroom.mockResolvedValue(undefined);

      const classroom = buildClassroom({
        settings: {
          allowStudentDiscussion: true,
          requireApprovalForJoin: false,
          maxStudents: 30,
          timezone: 'America/Santiago',
          language: 'es',
          notifications: { newStudent: true, activityCompleted: true, announcements: true },
        },
      });
      const updatedClassroom = buildClassroom({ id: 'updated-classroom' });

      (classroomRepository.findByInviteCode as jest.Mock).mockResolvedValue(classroom);
      (classroomRepository.getStudentCount as jest.Mock).mockResolvedValue(10);
      (classroomRepository.addStudent as jest.Mock).mockResolvedValue(updatedClassroom);

      const result = await service.joinClassroom({ inviteCode: classroom.inviteCode }, 'student-uuid');

      expect(classroomRepository.addStudent).toHaveBeenCalledWith(classroom.id, 'student-uuid');
      expect(result).toBe(updatedClassroom);
    });

    it('lanza ValidationException cuando el código es inválido', async () => {
      permissionValidator.validateCanJoinClassroom.mockResolvedValue(undefined);
      classroomValidator.validateJoinData.mockResolvedValue(undefined);
      (classroomRepository.findByInviteCode as jest.Mock).mockResolvedValue(null);

      await expect(service.joinClassroom({ inviteCode: 'INVALID' }, 'student-uuid')).rejects.toBeInstanceOf(
        ValidationException,
      );
      expect(classroomRepository.addStudent).not.toHaveBeenCalled();
    });

    it('lanza OperationNotAllowedException cuando el aula está llena', async () => {
      permissionValidator.validateCanJoinClassroom.mockResolvedValue(undefined);
      classroomValidator.validateJoinData.mockResolvedValue(undefined);
      classroomValidator.validateCanJoinSpecificClassroom.mockResolvedValue(undefined);

      const classroom = buildClassroom({
        settings: {
          allowStudentDiscussion: true,
          requireApprovalForJoin: false,
          maxStudents: 20,
          timezone: 'America/Santiago',
          language: 'es',
          notifications: { newStudent: true, activityCompleted: true, announcements: true },
        },
      });

      (classroomRepository.findByInviteCode as jest.Mock).mockResolvedValue(classroom);
      (classroomRepository.getStudentCount as jest.Mock).mockResolvedValue(20);

      await expect(service.joinClassroom({ inviteCode: classroom.inviteCode }, 'student-uuid')).rejects.toBeInstanceOf(
        OperationNotAllowedException,
      );
      expect(classroomRepository.addStudent).not.toHaveBeenCalled();
    });
  });

  describe('leaveClassroom', () => {
    it('remueve al estudiante del aula', async () => {
      (classroomRepository.findById as jest.Mock).mockResolvedValue(buildClassroom());
      (classroomRepository.removeStudent as jest.Mock).mockResolvedValue(buildClassroom());

      await service.leaveClassroom(classroomId, 'student-uuid');

      expect(classroomRepository.findById).toHaveBeenCalledWith(classroomId);
      expect(classroomRepository.removeStudent).toHaveBeenCalledWith(classroomId, 'student-uuid');
    });
  });

  describe('getClassroomStats', () => {
    it('devuelve métricas básicas del aula', async () => {
      const classroom = buildClassroom({
        activities: [
          buildActivity({ id: 'a1', isActive: true }),
          buildActivity({ id: 'a2', isActive: false }),
        ],
      });

      (classroomRepository.findById as jest.Mock).mockResolvedValue(classroom);
      (classroomRepository.getStudentCount as jest.Mock).mockResolvedValue(15);

      const result = await service.getClassroomStats(classroomId);

      expect(result).toEqual({
        totalStudents: 15,
        totalActivities: 2,
        activeActivities: 1,
        averageCompletion: 0,
        lastActivity: null,
        createdAt: classroom.createdAt,
        isActive: classroom.isActive,
      });
    });
  });

  describe('getTeacherClassrooms', () => {
    it('valida permisos y retorna las aulas del docente', async () => {
      const classrooms = [buildClassroom({ id: 'c1' })];
      (classroomRepository.findTeacherClassrooms as jest.Mock).mockResolvedValue(classrooms);

      const result = await service.getTeacherClassrooms(teacherId);

      expect(permissionValidator.validateCanCreateClassroom).toHaveBeenCalledWith(teacherId);
      expect(classroomRepository.findTeacherClassrooms).toHaveBeenCalledWith(teacherId);
      expect(result).toBe(classrooms);
    });
  });

  describe('getStudentClassrooms', () => {
    it('valida permisos y retorna las aulas del estudiante', async () => {
      const classrooms = [buildClassroom({ id: 'c1' })];
      (classroomRepository.findStudentClassrooms as jest.Mock).mockResolvedValue(classrooms);

      const result = await service.getStudentClassrooms('student-uuid');

      expect(permissionValidator.validateCanJoinClassroom).toHaveBeenCalledWith('student-uuid');
      expect(classroomRepository.findStudentClassrooms).toHaveBeenCalledWith('student-uuid');
      expect(result).toBe(classrooms);
    });
  });
});
