import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ActivityLibraryController } from './activity-library.controller';
import { ActivityLibraryService } from '../services/activity-library.service';
import { ActivityLibrary, ActivityCategory, DifficultyLevel } from '../entities/activity-library.entity';
import {
  CreateActivityLibraryDto,
  CreateActivityRatingDto,
  ActivityLibraryResponseDto,
} from '../dto/activity-library.dto';

type AuthenticatedRequest = Parameters<ActivityLibraryController['shareActivity']>[0];

const createMockRequest = (userId = 'user-id'): AuthenticatedRequest =>
  ({ user: { id: userId } } as AuthenticatedRequest);

const buildCreateDto = (): CreateActivityLibraryDto => ({
  originalActivityId: 'activity-1',
  publicTitle: 'Título público',
  publicDescription: 'Descripción extensa de la actividad compartida',
  category: ActivityCategory.SCIENCE,
  difficultyLevel: DifficultyLevel.INTERMEDIATE,
});

describe('ActivityLibraryController', () => {
  let controller: ActivityLibraryController;
  let service: jest.Mocked<ActivityLibraryService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityLibraryController],
      providers: [
        {
          provide: ActivityLibraryService,
          useValue: {
            shareActivity: jest.fn(),
            updateSharedActivity: jest.fn(),
            rateActivity: jest.fn(),
            updateRating: jest.fn(),
            copyActivityToClassroom: jest.fn(),
            getMySharedActivities: jest.fn(),
            removeSharedActivity: jest.fn(),
            searchPublicActivities: jest.fn(),
            getPublicActivityDetails: jest.fn(),
            getLibraryStats: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(ActivityLibraryController);
    service = module.get(ActivityLibraryService) as jest.Mocked<ActivityLibraryService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('comparte una actividad y adapta la respuesta del servicio', async () => {
    const dto = buildCreateDto();
    const serviceResult: ActivityLibraryResponseDto = {
      success: true,
      message: 'Compartido',
      data: { id: 'library-1' },
      error: undefined,
    };
    service.shareActivity.mockResolvedValue(serviceResult);

    const response = await controller.shareActivity(createMockRequest('teacher-9'), dto);

    expect(service.shareActivity).toHaveBeenCalledWith('teacher-9', dto);
    expect(response).toEqual(serviceResult);
  });

  it('copia actividad a un aula delegando en el servicio', async () => {
    const resultPayload: ActivityLibraryResponseDto = {
      success: true,
      message: 'Copiada',
      data: { id: 'copy-1' },
      error: undefined,
    };
    service.copyActivityToClassroom.mockResolvedValue(resultPayload);

    const response = await controller.copyActivityToClassroom(
      createMockRequest('teacher-5'),
      'library-3',
      'classroom-7',
    );

    expect(service.copyActivityToClassroom).toHaveBeenCalledWith('teacher-5', 'library-3', 'classroom-7');
    expect(response).toEqual(resultPayload);
  });

  it('obtiene detalles de actividad delegando en el servicio', async () => {
    const libraryActivity = { id: 'library-9' } as ActivityLibrary;
    service.getPublicActivityDetails.mockResolvedValue(libraryActivity);

    const result = await controller.getActivityDetails('library-9');

    expect(service.getPublicActivityDetails).toHaveBeenCalledWith('library-9');
    expect(result).toBe(libraryActivity);
  });

  it('lanza NotFoundException cuando la actividad no existe', async () => {
    service.getPublicActivityDetails.mockRejectedValue(new NotFoundException());

    await expect(controller.getActivityDetails('library-404')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('asigna libraryActivityId antes de delegar la valoración', async () => {
    const ratingDto: CreateActivityRatingDto = {
      libraryActivityId: 'placeholder',
      rating: 5,
    };
    const resultPayload: ActivityLibraryResponseDto = {
      success: true,
      message: 'Valorada',
      data: undefined,
      error: undefined,
    };
    service.rateActivity.mockResolvedValue(resultPayload);

    const response = await controller.rateActivity(
      createMockRequest('student-3'),
      'library-55',
      ratingDto,
    );

    expect(service.rateActivity).toHaveBeenCalledWith(
      'student-3',
      expect.objectContaining({ libraryActivityId: 'library-55', rating: 5 }),
    );
    expect(ratingDto.libraryActivityId).toBe('library-55');
    expect(response).toEqual(resultPayload);
  });
});
