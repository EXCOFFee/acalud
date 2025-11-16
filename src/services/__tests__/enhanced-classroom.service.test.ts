import {
  ClassroomError,
  ClassroomErrorType,
  CreateClassroomData,
  EnhancedClassroomService,
  IClassroomRepository,
  type ClassroomStats,
} from '../enhanced-classroom.service';
import type { Classroom, User } from '../../types';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  firstName: 'Test',
  lastName: 'User',
  email: 'test.user@example.com',
  name: 'Test User',
  role: 'student',
  avatar: undefined,
  coins: 0,
  level: 1,
  experience: 0,
  achievements: [],
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

const createMockClassroom = (overrides: Partial<Classroom> = {}): Classroom => ({
  id: 'classroom-1',
  name: 'Matemáticas 5ºA',
  description: 'Aula de prueba',
  subject: 'Matemáticas',
  grade: '5º',
  teacherId: 'teacher-1',
  teacher: createMockUser({ id: 'teacher-1', role: 'teacher', name: 'Docente Demo' }),
  students: [],
  activities: [],
  inviteCode: 'ABC123',
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  ...overrides,
});

const createMockRepository = (): jest.Mocked<IClassroomRepository> => ({
  getAll: jest.fn(),
  getById: jest.fn(),
  getByInviteCode: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  addStudent: jest.fn(),
  removeStudent: jest.fn(),
  getStats: jest.fn(),
  generateNewInviteCode: jest.fn(),
});

describe('EnhancedClassroomService', () => {
  let repository: jest.Mocked<IClassroomRepository>;
  let service: EnhancedClassroomService;

  beforeEach(() => {
    repository = createMockRepository();
    service = new EnhancedClassroomService(repository);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('crea un aula nuevo y normaliza los datos antes de delegar en el repositorio', async () => {
    const input: CreateClassroomData = {
      name: '  Aula Avanzada  ',
      description: '  Espacio para actividades  ',
      subject: '  Matemáticas  ',
      grade: ' 5º ',
      teacherId: 'teacher-1',
    };

    const storedClassroom = createMockClassroom({
      name: 'Aula Avanzada',
      description: 'Espacio para actividades',
      subject: 'Matemáticas',
      grade: '5º',
    });

    repository.create.mockResolvedValue(storedClassroom);

    const result = await service.createClassroom(input);

    expect(repository.create).toHaveBeenCalledWith({
      name: 'Aula Avanzada',
      description: 'Espacio para actividades',
      subject: 'Matemáticas',
      grade: '5º',
      teacherId: 'teacher-1',
    });
    expect(result).toEqual(storedClassroom);
  });

  it('lanza ClassroomError con detalles de validación cuando los datos de creación son inválidos', async () => {
    const invalidData = {
      name: 'ab',
      subject: '',
      grade: '',
      teacherId: '',
    } as unknown as CreateClassroomData;

    let caughtError: ClassroomError | null = null;

    try {
      await service.createClassroom(invalidData);
    } catch (error) {
      caughtError = error as ClassroomError;
    }

    if (!caughtError) {
      throw new Error('Se esperaba ClassroomError pero no se lanzó');
    }

    expect(caughtError).toBeInstanceOf(ClassroomError);
    expect(caughtError).toMatchObject({
      type: ClassroomErrorType.INVALID_DATA,
      statusCode: 422,
    });
    expect(caughtError.details?.validationErrors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('nombre'),
        expect.stringContaining('materia'),
        expect.stringContaining('grado'),
        expect.stringContaining('docente'),
      ]),
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('valida la longitud y formato del código de invitación antes de intentar unirse', async () => {
    await expect(service.joinClassroomByCode('abc', 'student-1')).rejects.toThrow(
      expect.objectContaining({
        type: ClassroomErrorType.INVALID_INVITE_CODE,
      }),
    );

    expect(repository.getByInviteCode).not.toHaveBeenCalled();
  });

  it('detecta cuando el estudiante ya pertenece al aula y evita la llamada al repositorio', async () => {
    const classroom = createMockClassroom({
      students: [createMockUser({ id: 'student-1', role: 'student', name: 'Alumno Demo' })],
    });

    repository.getByInviteCode.mockResolvedValue(classroom);

    const result = await service.joinClassroomByCode('abc123', 'student-1');

    expect(repository.getByInviteCode).toHaveBeenCalledWith('ABC123');
    expect(repository.addStudent).not.toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        classroom,
        isNewMember: false,
        message: 'Ya eres miembro de esta aula',
      }),
    );
  });

  it('agrega al estudiante al aula cuando el código es válido y todavía no es miembro', async () => {
    const classroom = createMockClassroom({ students: [] });
    const updatedClassroom = createMockClassroom({
      students: [createMockUser({ id: 'student-1', role: 'student', name: 'Estudiante Nuevo' })],
    });

    repository.getByInviteCode.mockResolvedValue(classroom);
    repository.addStudent.mockResolvedValue(updatedClassroom);

    const result = await service.joinClassroomByCode('abc123', 'student-1');

    expect(repository.getByInviteCode).toHaveBeenCalledWith('ABC123');
    expect(repository.addStudent).toHaveBeenCalledWith('classroom-1', 'student-1');
    expect(result).toEqual(
      expect.objectContaining({
        classroom: updatedClassroom,
        isNewMember: true,
        message: 'Te has unido exitosamente al aula',
      }),
    );
  });

  it('permite que un estudiante salga del aula y delega en el repositorio', async () => {
    repository.removeStudent.mockResolvedValue(createMockClassroom());

    await service.leaveClassroom('classroom-1', 'student-1');

    expect(repository.removeStudent).toHaveBeenCalledWith('classroom-1', 'student-1');
  });

  it('propaga errores del repositorio cuando el estudiante no puede salir del aula', async () => {
    const classroomError = new ClassroomError(
      ClassroomErrorType.NOT_MEMBER,
      'El estudiante no pertenece al aula',
      400,
    );
    repository.removeStudent.mockRejectedValue(classroomError);

    await expect(service.leaveClassroom('classroom-1', 'student-99')).rejects.toBe(classroomError);
  });

  it('impide que un usuario sin permisos remueva estudiantes del aula', async () => {
    repository.getById.mockResolvedValue(createMockClassroom({ teacherId: 'teacher-1' }));

    await expect(
      service.removeStudentFromClassroom('classroom-1', 'student-1', 'teacher-99'),
    ).rejects.toMatchObject({ type: ClassroomErrorType.PERMISSION_DENIED });

    expect(repository.removeStudent).not.toHaveBeenCalled();
  });

  it('permite al docente remover estudiantes del aula', async () => {
    repository.getById.mockResolvedValue(createMockClassroom({ teacherId: 'teacher-1' }));
    repository.removeStudent.mockResolvedValue(createMockClassroom());

    await service.removeStudentFromClassroom('classroom-1', 'student-1', 'teacher-1');

    expect(repository.removeStudent).toHaveBeenCalledWith('classroom-1', 'student-1');
  });

  it('genera un nuevo código de invitación cuando lo solicita el docente propietario', async () => {
    repository.getById.mockResolvedValue(createMockClassroom({ teacherId: 'teacher-1' }));
    repository.generateNewInviteCode.mockResolvedValue('XYZ789');

    const newCode = await service.generateNewInviteCode('classroom-1', 'teacher-1');

    expect(repository.generateNewInviteCode).toHaveBeenCalledWith('classroom-1');
    expect(newCode).toBe('XYZ789');
  });

  it('rechaza la generación de códigos si el solicitante no es el docente del aula', async () => {
    repository.getById.mockResolvedValue(createMockClassroom({ teacherId: 'teacher-1' }));

    await expect(
      service.generateNewInviteCode('classroom-1', 'teacher-99'),
    ).rejects.toMatchObject({ type: ClassroomErrorType.PERMISSION_DENIED });

    expect(repository.generateNewInviteCode).not.toHaveBeenCalled();
  });

  it('obtiene estadísticas del aula cuando el usuario tiene acceso autorizado', async () => {
    const stats: ClassroomStats = {
      totalStudents: 10,
      totalActivities: 5,
      completedActivities: 4,
      averageScore: 85,
      averageCompletion: 0.8,
      lastActivity: new Date('2024-02-01T00:00:00Z'),
      studentsProgress: [],
    };

    jest.spyOn(service, 'validateClassroomAccess').mockResolvedValue(true);
    repository.getStats.mockResolvedValue(stats);

    const result = await service.getClassroomStats('classroom-1', 'teacher-1');

    expect(service.validateClassroomAccess).toHaveBeenCalledWith('classroom-1', 'teacher-1');
    expect(repository.getStats).toHaveBeenCalledWith('classroom-1');
    expect(result).toBe(stats);
  });

  it('deniega el acceso a estadísticas cuando el usuario no pertenece al aula', async () => {
    jest.spyOn(service, 'validateClassroomAccess').mockResolvedValue(false);

    await expect(service.getClassroomStats('classroom-1', 'student-99')).rejects.toMatchObject({
      type: ClassroomErrorType.PERMISSION_DENIED,
    });

    expect(repository.getStats).not.toHaveBeenCalled();
  });
});