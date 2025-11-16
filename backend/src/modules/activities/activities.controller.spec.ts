import { Test, TestingModule } from '@nestjs/testing';
import { ActivitiesController } from './activities.controller';
import { ActivitiesService } from './activities.service';
import { ActivityType, DifficultyLevel } from './activity.entity';

const createMockRequest = (userId = 'user-id') => ({
  user: { id: userId },
});

describe('ActivitiesController', () => {
  let controller: ActivitiesController;
  let service: jest.Mocked<ActivitiesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivitiesController],
      providers: [
        {
          provide: ActivitiesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            getClassroomActivities: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            completeActivity: jest.fn(),
            getActivityStats: jest.fn(),
            publishActivity: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(ActivitiesController);
    service = module.get(ActivitiesService) as jest.Mocked<ActivitiesService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('crea una actividad delegando en el servicio con el id de usuario', async () => {
    const dto = { title: 'Nueva actividad' } as any;
    const mockActivity = { id: 'activity-1', title: dto.title } as any;
    service.create.mockResolvedValue(mockActivity);

    const result = await controller.create(dto, createMockRequest('teacher-1'));

    expect(service.create).toHaveBeenCalledWith(dto, 'teacher-1');
    expect(result).toBe(mockActivity);
  });

  it('normaliza paginación al obtener actividades y envía filtros al servicio', async () => {
    const mockResponse = { items: [], total: 0 } as any;
    service.findAll.mockResolvedValue(mockResponse);

    const result = await controller.findAll(
      '0' as unknown as number,
      '200' as unknown as number,
      'classroom-1',
      ActivityType.QUIZ,
      DifficultyLevel.MEDIUM,
      'matemáticas',
      true as unknown as boolean,
      createMockRequest('teacher-42'),
    );

    expect(service.findAll).toHaveBeenCalledWith({
      page: 1,
      limit: 50,
      classroomId: 'classroom-1',
      type: ActivityType.QUIZ,
      difficulty: DifficultyLevel.MEDIUM,
      search: 'matemáticas',
      isActive: true,
      userId: 'teacher-42',
    });
    expect(result).toBe(mockResponse);
  });

  it('completa actividad y devuelve payload adaptado', async () => {
    const completion = {
      id: 'completion-1',
      score: 95,
      attempts: 1,
      completedAt: new Date('2025-01-01T00:00:00Z'),
    } as any;
    service.completeActivity.mockResolvedValue(completion);

    const response = await controller.completeActivity(
      'activity-99',
      { attempt: 1 } as any,
      createMockRequest('student-7'),
    );

    expect(service.completeActivity).toHaveBeenCalledWith(
      'activity-99',
      { attempt: 1 },
      'student-7',
    );
    expect(response).toEqual({
      id: 'completion-1',
      score: 95,
      attempts: 1,
      completedAt: completion.completedAt,
      message: '¡Actividad completada exitosamente!',
    });
  });

  it('elimina una actividad delegando en el servicio', async () => {
    service.remove.mockResolvedValue(undefined);

    await controller.remove('activity-3', createMockRequest('admin-1'));

    expect(service.remove).toHaveBeenCalledWith('activity-3', 'admin-1');
  });
});
