import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassroomService } from './classroom.service.refactored';
import { Classroom } from '../classroom.entity';
import { User, UserRole } from '../../users/user.entity';
import { 
  ResourceNotFoundException,
  ValidationException,
  OperationNotAllowedException
} from '../../../common/exceptions/business.exception';
import { CLASSROOM_TOKENS } from '../tokens';

import { createMockRepository } from '../../../test/setup';

// Esta suite comprueba el comportamiento del servicio ClassroomService con sus dependencias mockeadas.
describe('ClassroomService', () => {
  let service: ClassroomService;
  let classroomRepository: jest.Mocked<any>;
  let validator: jest.Mocked<any>;
  let codeGenerator: jest.Mocked<any>;
  let permissionValidator: jest.Mocked<any>;

  const mockTeacher = {
    id: 'teacher-1',
    email: 'teacher@test.com',
    firstName: 'Teacher',
    lastName: 'User',
    name: 'Teacher User',
    password: 'hashedpassword',
    role: UserRole.TEACHER,
    isActive: true,
    avatar: null,
    coins: 0,
    level: 1,
    experience: 0,
    loginAttempts: 0,
    preferences: {},
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    ownedClassrooms: [],
    enrolledClassrooms: [],
    createdActivities: [],
    activityCompletions: [],
    achievements: [],
    inventory: []
  } as User;

  const mockClassroom: Classroom = {
    id: 'classroom-1',
    name: 'Matemáticas 5to A',
    description: 'Aula de matemáticas para quinto grado',
    subject: 'Matemáticas',
    grade: '5to Primaria',
    teacherId: 'teacher-1',
    inviteCode: 'ABC123',
    color: '#6366f1',
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    settings: {},
    teacher: mockTeacher,
    students: [],
    validateClassroom: jest.fn(),
    getStudentCount: jest.fn(() => 0),
    getActivityCount: jest.fn(() => 0),
    hasStudent: jest.fn(() => false),
    isTeacherOf: jest.fn(() => true),
  } as any;

  // Antes de cada prueba recreamos el módulo con las dependencias simuladas.
  beforeEach(async () => {
    const mockClassroomRepository = createMockRepository();
    const mockValidator = {
      validateCreateData: jest.fn(),
      validateUpdateData: jest.fn(),
      validateFilters: jest.fn(),
      validateJoinData: jest.fn(),
      validateCanJoinSpecificClassroom: jest.fn(),
    };
    const mockCodeGenerator = {
      generateUniqueCode: jest.fn(),
    };
    const mockPermissionValidator = {
      validateCanCreateClassroom: jest.fn(),
      validateCanModifyClassroom: jest.fn(),
      validateCanDeleteClassroom: jest.fn(),
      validateCanJoinClassroom: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClassroomService,
        {
          provide: CLASSROOM_TOKENS.IClassroomRepository,
          useValue: mockClassroomRepository,
        },
        {
          provide: CLASSROOM_TOKENS.IClassroomValidator,
          useValue: mockValidator,
        },
        {
          provide: CLASSROOM_TOKENS.IInviteCodeGenerator,
          useValue: mockCodeGenerator,
        },
        {
          provide: CLASSROOM_TOKENS.IPermissionValidator,
          useValue: mockPermissionValidator,
        },
      ],
    }).compile();

    service = module.get<ClassroomService>(ClassroomService);
    classroomRepository = module.get(CLASSROOM_TOKENS.IClassroomRepository);
    validator = module.get(CLASSROOM_TOKENS.IClassroomValidator);
    codeGenerator = module.get(CLASSROOM_TOKENS.IInviteCodeGenerator);
    permissionValidator = module.get(CLASSROOM_TOKENS.IPermissionValidator);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Validamos los escenarios relacionados con la creación de aulas.
  describe('createClassroom', () => {
    const createDto = {
      name: 'Matemáticas 5to A',
      description: 'Aula de matemáticas',
      subject: 'Matemáticas',
      grade: '5to Primaria',
    };
    const teacherId = 'teacher-1';

    it('should create a classroom successfully', async () => {
      // Preparación
      validator.validateCreateData.mockResolvedValue(undefined);
      permissionValidator.validateCanCreateClassroom.mockResolvedValue(undefined);
      codeGenerator.generateUniqueCode.mockResolvedValue('ABC123');
      classroomRepository.create.mockResolvedValue(mockClassroom);

      // Acción
      const result = await service.createClassroom(createDto, teacherId);

      // Verificación
      expect(validator.validateCreateData).toHaveBeenCalledWith(createDto);
      expect(permissionValidator.validateCanCreateClassroom).toHaveBeenCalledWith(teacherId);
      expect(codeGenerator.generateUniqueCode).toHaveBeenCalled();
      expect(classroomRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ...createDto,
          teacherId,
          inviteCode: 'ABC123',
          isActive: true,
        })
      );
      expect(result).toEqual(mockClassroom);
    });

    it('should throw validation error when data is invalid', async () => {
      // Preparación
      const validationError = new ValidationException('Invalid data', {});
      validator.validateCreateData.mockRejectedValue(validationError);

      // Acción y verificación
      await expect(service.createClassroom(createDto, teacherId))
        .rejects.toThrow(ValidationException);
      expect(permissionValidator.validateCanCreateClassroom).not.toHaveBeenCalled();
    });

    it('should throw permission error when user cannot create classroom', async () => {
      // Preparación
      validator.validateCreateData.mockResolvedValue(undefined);
      const permissionError = new OperationNotAllowedException('create', 'insufficient permissions');
      permissionValidator.validateCanCreateClassroom.mockRejectedValue(permissionError);

      // Acción y verificación
      await expect(service.createClassroom(createDto, teacherId))
        .rejects.toThrow(OperationNotAllowedException);
      expect(codeGenerator.generateUniqueCode).not.toHaveBeenCalled();
    });
  });

  // Verificamos la recuperación de aulas por identificador y manejo de errores.
  describe('findClassroomById', () => {
    it('should return classroom when found and active', async () => {
      // Preparación
      classroomRepository.findById.mockResolvedValue(mockClassroom);

      // Acción
      const result = await service.findClassroomById('classroom-1');

      // Verificación
      expect(classroomRepository.findById).toHaveBeenCalledWith('classroom-1');
      expect(result).toEqual(mockClassroom);
    });

    it('should throw ResourceNotFoundException when classroom not found', async () => {
      // Preparación
      classroomRepository.findById.mockResolvedValue(null);

      // Acción y verificación
      await expect(service.findClassroomById('classroom-1'))
        .rejects.toThrow(ResourceNotFoundException);
    });

    it('should throw OperationNotAllowedException when classroom is inactive', async () => {
      // Preparación
      const inactiveClassroom = { ...mockClassroom, isActive: false };
      classroomRepository.findById.mockResolvedValue(inactiveClassroom);

      // Acción y verificación
      await expect(service.findClassroomById('classroom-1'))
        .rejects.toThrow(OperationNotAllowedException);
    });
  });

  // Cubrimos los flujos de unión de estudiantes a un aula mediante código de invitación.
  describe('joinClassroom', () => {
    const joinDto = { inviteCode: 'ABC123' };
    const studentId = 'student-1';

    it('should join classroom successfully', async () => {
      // Preparación
      validator.validateJoinData.mockResolvedValue(undefined);
      permissionValidator.validateCanJoinClassroom.mockResolvedValue(undefined);
      classroomRepository.findByInviteCode.mockResolvedValue(mockClassroom);
      validator.validateCanJoinSpecificClassroom.mockResolvedValue(undefined);
      classroomRepository.addStudent.mockResolvedValue(mockClassroom);

      // Acción
      const result = await service.joinClassroom(joinDto, studentId);

      // Verificación
      expect(validator.validateJoinData).toHaveBeenCalledWith(joinDto);
      expect(permissionValidator.validateCanJoinClassroom).toHaveBeenCalledWith(studentId);
      expect(classroomRepository.findByInviteCode).toHaveBeenCalledWith('ABC123');
      expect(validator.validateCanJoinSpecificClassroom).toHaveBeenCalledWith(mockClassroom, studentId);
      expect(classroomRepository.addStudent).toHaveBeenCalledWith('classroom-1', studentId);
      expect(result).toEqual(mockClassroom);
    });

    it('should throw ValidationException when invite code is invalid', async () => {
      // Preparación
      validator.validateJoinData.mockResolvedValue(undefined);
      permissionValidator.validateCanJoinClassroom.mockResolvedValue(undefined);
      classroomRepository.findByInviteCode.mockResolvedValue(null);

      // Acción y verificación
      await expect(service.joinClassroom(joinDto, studentId))
        .rejects.toThrow(ValidationException);
      expect(validator.validateCanJoinSpecificClassroom).not.toHaveBeenCalled();
    });
  });

  // Probamos los caminos de eliminación de aulas y sus restricciones.
  describe('deleteClassroom', () => {
    const classroomId = 'classroom-1';
    const userId = 'teacher-1';

    it('should delete classroom when no students enrolled', async () => {
      // Preparación
      permissionValidator.validateCanDeleteClassroom.mockResolvedValue(undefined);
      classroomRepository.getStudentCount.mockResolvedValue(0);
      classroomRepository.delete.mockResolvedValue(undefined);

      // Acción
      await service.deleteClassroom(classroomId, userId);

      // Verificación
      expect(permissionValidator.validateCanDeleteClassroom).toHaveBeenCalledWith(classroomId, userId);
      expect(classroomRepository.getStudentCount).toHaveBeenCalledWith(classroomId);
      expect(classroomRepository.delete).toHaveBeenCalledWith(classroomId);
    });

    it('should throw OperationNotAllowedException when students are enrolled', async () => {
      // Preparación
      permissionValidator.validateCanDeleteClassroom.mockResolvedValue(undefined);
      classroomRepository.getStudentCount.mockResolvedValue(5);

      // Acción y verificación
      await expect(service.deleteClassroom(classroomId, userId))
        .rejects.toThrow(OperationNotAllowedException);
      expect(classroomRepository.delete).not.toHaveBeenCalled();
    });
  });

  // Analizamos la generación de nuevos códigos de invitación para un aula.
  describe('generateNewInviteCode', () => {
    const classroomId = 'classroom-1';
    const userId = 'teacher-1';

    it('should generate new invite code successfully', async () => {
      // Preparación
      permissionValidator.validateCanModifyClassroom.mockResolvedValue(undefined);
      classroomRepository.findById.mockResolvedValue(mockClassroom);
      codeGenerator.generateUniqueCode.mockResolvedValue('XYZ789');
      classroomRepository.update.mockResolvedValue(undefined);

      // Acción
      const result = await service.generateNewInviteCode(classroomId, userId);

      // Verificación
      expect(permissionValidator.validateCanModifyClassroom).toHaveBeenCalledWith(classroomId, userId);
      expect(codeGenerator.generateUniqueCode).toHaveBeenCalled();
      expect(classroomRepository.update).toHaveBeenCalledWith(classroomId, { inviteCode: 'XYZ789' });
      expect(result).toBe('XYZ789');
    });

    it('should throw OperationNotAllowedException when user lacks permission', async () => {
      const permissionError = new OperationNotAllowedException('actualizar aula', 'sin permisos');
      permissionValidator.validateCanModifyClassroom.mockRejectedValue(permissionError);

      // Acción y verificación
      await expect(service.generateNewInviteCode(classroomId, userId))
        .rejects.toThrow(OperationNotAllowedException);
      expect(classroomRepository.findById).not.toHaveBeenCalled();
      expect(codeGenerator.generateUniqueCode).not.toHaveBeenCalled();
      expect(classroomRepository.update).not.toHaveBeenCalled();
    });
  });

  // Confirmamos que los estudiantes pueden abandonar un aula y que los errores se propagan.
  describe('leaveClassroom', () => {
    const classroomId = 'classroom-1';
    const studentId = 'student-1';

    it('should remove student from classroom when it exists', async () => {
      // Preparación
      classroomRepository.findById.mockResolvedValue(mockClassroom);
      classroomRepository.removeStudent.mockResolvedValue(undefined);

      // Acción
      await service.leaveClassroom(classroomId, studentId);

      // Verificación
      expect(classroomRepository.findById).toHaveBeenCalledWith(classroomId);
      expect(classroomRepository.removeStudent).toHaveBeenCalledWith(classroomId, studentId);
    });

    it('should throw ResourceNotFoundException when classroom does not exist', async () => {
      // Preparación
      classroomRepository.findById.mockResolvedValue(null);

      // Acción y verificación
      await expect(service.leaveClassroom(classroomId, studentId))
        .rejects.toThrow(ResourceNotFoundException);
      expect(classroomRepository.removeStudent).not.toHaveBeenCalled();
    });
  });

  // Evaluamos el cálculo de estadísticas generales de un aula.
  describe('getClassroomStats', () => {
    it('should return classroom statistics', async () => {
      // Preparación
      const classroomWithActivities = {
        ...mockClassroom,
        activities: [
          { id: '1', isActive: true },
          { id: '2', isActive: true },
          { id: '3', isActive: false },
        ],
      };
      classroomRepository.findById.mockResolvedValue(classroomWithActivities);
      classroomRepository.getStudentCount.mockResolvedValue(15);

      // Acción
      const result = await service.getClassroomStats('classroom-1');

      // Verificación
      expect(result).toEqual({
        totalStudents: 15,
        totalActivities: 3,
        activeActivities: 2,
        averageCompletion: 0,
        lastActivity: null,
        createdAt: mockClassroom.createdAt,
        isActive: true,
      });
    });
  });
});
