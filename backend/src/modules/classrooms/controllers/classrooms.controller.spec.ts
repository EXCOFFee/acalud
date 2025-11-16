import { Test, TestingModule } from '@nestjs/testing';
import { ClassroomsController } from '../classrooms.controller';
import { CLASSROOM_TOKENS } from '../tokens';
import { Classroom } from '../classroom.entity';
import { JoinClassroomDto } from '../dto/join-classroom.dto';
import { AddActivityDto } from '../dto/add-activity.dto';
import { CreateClassroomDto } from '../dto/create-classroom.dto';
import { UpdateClassroomDto } from '../dto/update-classroom.dto';
import { IClassroomService } from '../interfaces';

const buildRequest = (id = 'user-1', role: string = 'teacher') => ({
  user: { id, role },
});

describe('ClassroomsController', () => {
  let controller: ClassroomsController;
  let service: jest.Mocked<IClassroomService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClassroomsController],
      providers: [
        {
          provide: CLASSROOM_TOKENS.IClassroomService,
          useValue: {
            createClassroom: jest.fn(),
            findClassrooms: jest.fn(),
            findClassroomById: jest.fn(),
            findClassroomByInviteCode: jest.fn(),
            updateClassroom: jest.fn(),
            deleteClassroom: jest.fn(),
            joinClassroom: jest.fn(),
            leaveClassroom: jest.fn(),
            generateNewInviteCode: jest.fn(),
            getClassroomStats: jest.fn(),
            getTeacherClassrooms: jest.fn(),
            getStudentClassrooms: jest.fn(),
            addActivityToClassroom: jest.fn(),
            removeActivityFromClassroom: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(ClassroomsController);
    service = module.get(CLASSROOM_TOKENS.IClassroomService) as jest.Mocked<IClassroomService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('crea un aula delegando en el servicio', async () => {
    const payload = { name: 'Aula Demo' } as CreateClassroomDto;
    const classroom = { id: 'classroom-1' } as Classroom;
    service.createClassroom.mockResolvedValue(classroom);

    const result = await controller.create(payload, buildRequest('teacher-1'));

    expect(service.createClassroom).toHaveBeenCalledWith(payload, 'teacher-1');
    expect(result).toBe(classroom);
  });

  it('normaliza los parámetros de paginación en findAll', async () => {
    const response = { classrooms: [], pagination: { page: 1, limit: 10 } } as any;
    service.findClassrooms.mockResolvedValue(response);

    const result = await controller.findAll('0' as any, '120' as any, 'math', 'science', '5', 'teacher-9');

    expect(service.findClassrooms).toHaveBeenCalledWith({
      page: 1,
      limit: 50,
      search: 'math',
      subject: 'science',
      grade: '5',
      teacherId: 'teacher-9',
    });
    expect(result).toBe(response);
  });

  it('usa getTeacherClassrooms cuando el usuario es docente', async () => {
    const classrooms = [{ id: 'c1' }];
    service.getTeacherClassrooms.mockResolvedValue(classrooms as any);

    const result = await controller.getMyClassrooms(buildRequest('teacher-1', 'teacher'));

    expect(service.getTeacherClassrooms).toHaveBeenCalledWith('teacher-1');
    expect(result).toBe(classrooms as any);
  });

  it('usa getStudentClassrooms cuando el usuario es estudiante', async () => {
    const classrooms = [{ id: 'c1' }];
    service.getStudentClassrooms.mockResolvedValue(classrooms as any);

    const result = await controller.getMyClassrooms(buildRequest('student-1', 'student'));

    expect(service.getStudentClassrooms).toHaveBeenCalledWith('student-1');
    expect(result).toBe(classrooms as any);
  });

  it('permite unirse a un aula usando el servicio', async () => {
    const classroom = { id: 'classroom-1' } as Classroom;
    service.joinClassroom.mockResolvedValue(classroom);

    const dto = { inviteCode: 'INVITE' } as JoinClassroomDto;
    const result = await controller.joinClassroom(dto, buildRequest('student-1', 'student'));

    expect(service.joinClassroom).toHaveBeenCalledWith(dto, 'student-1');
    expect(result).toBe(classroom);
  });

  it('busca un aula por código para vista previa', async () => {
    const classroom = { id: 'preview' } as Classroom;
    service.findClassroomByInviteCode.mockResolvedValue(classroom);

    const result = await controller.previewClassroom('CODE123');

    expect(service.findClassroomByInviteCode).toHaveBeenCalledWith('CODE123');
    expect(result).toBe(classroom);
  });

  it('obtiene un aula por id', async () => {
    const classroom = { id: 'classroom-1' } as Classroom;
    service.findClassroomById.mockResolvedValue(classroom);

    const result = await controller.findOne('classroom-1');

    expect(service.findClassroomById).toHaveBeenCalledWith('classroom-1');
    expect(result).toBe(classroom);
  });

  it('actualiza un aula delegando en el servicio', async () => {
    const classroom = { id: 'classroom-1', name: 'Actualizada' } as Classroom;
    service.updateClassroom.mockResolvedValue(classroom);

    const result = await controller.update('classroom-1', { name: 'Actualizada' } as UpdateClassroomDto, buildRequest('teacher-1'));

    expect(service.updateClassroom).toHaveBeenCalledWith('classroom-1', { name: 'Actualizada' }, 'teacher-1');
    expect(result).toBe(classroom);
  });

  it('elimina un aula', async () => {
    service.deleteClassroom.mockResolvedValue(undefined);

    await controller.remove('classroom-1', buildRequest('teacher-1'));

    expect(service.deleteClassroom).toHaveBeenCalledWith('classroom-1', 'teacher-1');
  });

  it('permite abandonar un aula', async () => {
    service.leaveClassroom.mockResolvedValue(undefined);

    await controller.leaveClassroom('classroom-1', buildRequest('student-1', 'student'));

    expect(service.leaveClassroom).toHaveBeenCalledWith('classroom-1', 'student-1');
  });

  it('regenera el código de invitación y empaqueta la respuesta', async () => {
    service.generateNewInviteCode.mockResolvedValue('NEWCODE');

    const result = await controller.regenerateInviteCode('classroom-1', buildRequest('teacher-1'));

    expect(service.generateNewInviteCode).toHaveBeenCalledWith('classroom-1', 'teacher-1');
    expect(result).toEqual({ inviteCode: 'NEWCODE' });
  });

  it('obtiene estadísticas del aula', async () => {
    const stats = { totalStudents: 10 } as any;
    service.getClassroomStats.mockResolvedValue(stats);

    const result = await controller.getClassroomStats('classroom-1');

    expect(service.getClassroomStats).toHaveBeenCalledWith('classroom-1');
    expect(result).toBe(stats);
  });

  it('agrega una actividad al aula', async () => {
    const classroom = { id: 'classroom-1' } as Classroom;
    service.addActivityToClassroom.mockResolvedValue(classroom);

    const dto = { activityId: 'activity-1' } as AddActivityDto;
    const result = await controller.addActivityToClassroom('classroom-1', dto, buildRequest('teacher-1'));

    expect(service.addActivityToClassroom).toHaveBeenCalledWith('classroom-1', 'activity-1', 'teacher-1');
    expect(result).toBe(classroom);
  });

  it('remueve una actividad del aula', async () => {
    service.removeActivityFromClassroom.mockResolvedValue(undefined);

    await controller.removeActivityFromClassroom('classroom-1', 'activity-1', buildRequest('teacher-1'));

    expect(service.removeActivityFromClassroom).toHaveBeenCalledWith('classroom-1', 'activity-1', 'teacher-1');
  });
});
