import { ClassroomValidator } from '../../modules/classrooms/validators/classroom.validator';
import { ValidationException } from '../../common/exceptions/business.exception';
import { Classroom as ClassroomEntity } from '../../modules/classrooms/classroom.entity';
import {
  Classroom as ClassroomType,
  ClassroomFilters,
  CreateClassroomDto,
  JoinClassroomDto,
  UpdateClassroomDto,
} from '../../modules/classrooms/interfaces';

describe('ClassroomValidator', () => {
  let validator: ClassroomValidator;

  beforeEach(() => {
    validator = new ClassroomValidator();
  });

  const buildCreateDto = (overrides: Partial<CreateClassroomDto> = {}): CreateClassroomDto => ({
    name: 'Aula de Matemáticas',
    description: 'Espacio para explorar problemas y retos matemáticos.',
    subject: 'Matemáticas',
    grade: '5A',
    color: '#00FF00',
    ...overrides,
  });

  const buildUpdateDto = (overrides: Partial<UpdateClassroomDto> = {}): UpdateClassroomDto => ({
    name: 'Aula Actualizada',
    description: 'Descripción suficientemente larga para pasar la validación.',
    color: '#123456',
    ...overrides,
  });

  const buildJoinDto = (overrides: Partial<JoinClassroomDto> = {}): JoinClassroomDto => ({
    inviteCode: 'ABC12345',
    ...overrides,
  });

  const buildClassroom = (overrides: Partial<ClassroomType> = {}): ClassroomType => {
    const classroom = Object.assign(new ClassroomEntity(), {
      id: 'classroom-id',
      name: 'Aula',
      description: 'Descripción válida',
      subject: 'Matemáticas',
      grade: '5A',
      inviteCode: 'ABCDEFGH',
      color: '#FFFFFF',
      settings: {},
      isActive: true,
      level: 'intermedio' as const,
      timezone: 'America/Santiago',
      language: 'es' as const,
      teacherId: 'teacher-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      students: [],
    });

    return Object.assign(classroom, overrides);
  };

  it('no lanza excepción con datos válidos al crear un aula', async () => {
    await expect(validator.validateCreateData(buildCreateDto())).resolves.toBeUndefined();
  });

  it('lanza ValidationException cuando el nombre es demasiado corto al crear', async () => {
    await expect(
      validator.validateCreateData(buildCreateDto({ name: 'A' })),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('lanza ValidationException cuando el color no es hexadecimal válido al crear', async () => {
    await expect(
      validator.validateCreateData(buildCreateDto({ color: 'color-malo' })),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('no lanza excepción con datos parciales válidos al actualizar', async () => {
    await expect(validator.validateUpdateData(buildUpdateDto({ description: undefined }))).resolves.toBeUndefined();
  });

  it('lanza ValidationException cuando el color es inválido al actualizar', async () => {
    await expect(
      validator.validateUpdateData(buildUpdateDto({ color: '#GGGGGG' })),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('lanza ValidationException cuando el código de invitación es incorrecto', async () => {
    await expect(
      validator.validateJoinData(buildJoinDto({ inviteCode: 'abc' })),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('lanza ValidationException cuando los filtros tienen límite inválido', async () => {
    const filters: ClassroomFilters = { page: 1, limit: 0 };

    await expect(validator.validateFilters(filters)).rejects.toBeInstanceOf(ValidationException);
  });

  it('lanza ValidationException si el aula está inactiva o llena al unirse', async () => {
    const classroom = buildClassroom({
      isActive: false,
      students: Array.from({ length: 100 }, (_, index) => ({
        id: `student-${index}`,
      })) as any,
    });

    await expect(
      validator.validateCanJoinSpecificClassroom(classroom, 'student-101'),
    ).rejects.toBeInstanceOf(ValidationException);
  });

  it('lanza ValidationException si el docente intenta unirse como estudiante', async () => {
    const classroom = buildClassroom({ students: [] });

    await expect(
      validator.validateCanJoinSpecificClassroom(classroom, classroom.teacherId),
    ).rejects.toBeInstanceOf(ValidationException);
  });
});

