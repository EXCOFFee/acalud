import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ActivityLibraryService } from './activity-library.service';
import { ActivityLibrary, ActivityVisibility, ActivityCategory, DifficultyLevel } from '../entities/activity-library.entity';
import { ActivityRating } from '../entities/activity-rating.entity';
import { ActivityTag } from '../entities/activity-tag.entity';
import { Activity, ActivityType } from '../../activities/activity.entity';
import { User, UserRole } from '../../users/user.entity';
import { createMockRepository } from '../../../test/setup';
import { Repository, UpdateResult } from 'typeorm';
import {
  ActivityLibraryFilterDto,
  CreateActivityLibraryDto,
  UpdateActivityLibraryDto,
  CreateActivityRatingDto,
  UpdateActivityRatingDto,
} from '../dto/activity-library.dto';

describe('ActivityLibraryService', () => {
  let service: ActivityLibraryService;
  let activityLibraryRepository: jest.Mocked<Repository<ActivityLibrary>>;
  let activityRatingRepository: jest.Mocked<Repository<ActivityRating>>;
  let activityTagRepository: jest.Mocked<Repository<ActivityTag>>;
  let activityRepository: jest.Mocked<Repository<Activity>>;
  let userRepository: jest.Mocked<Repository<User>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLibraryService,
        {
          provide: getRepositoryToken(ActivityLibrary),
          useFactory: createMockRepository,
        },
        {
          provide: getRepositoryToken(ActivityRating),
          useFactory: createMockRepository,
        },
        {
          provide: getRepositoryToken(ActivityTag),
          useFactory: createMockRepository,
        },
        {
          provide: getRepositoryToken(Activity),
          useFactory: createMockRepository,
        },
        {
          provide: getRepositoryToken(User),
          useFactory: createMockRepository,
        },
      ],
    }).compile();

    service = module.get(ActivityLibraryService);
    activityLibraryRepository = module.get(getRepositoryToken(ActivityLibrary));
    activityRatingRepository = module.get(getRepositoryToken(ActivityRating));
    activityTagRepository = module.get(getRepositoryToken(ActivityTag));
    activityRepository = module.get(getRepositoryToken(Activity));
    userRepository = module.get(getRepositoryToken(User));

    activityLibraryRepository.count = jest.fn();

    jest.spyOn(ActivityTag, 'getRandomColor').mockReturnValue('#123456');
  });

  afterEach(() => {
    jest.restoreAllMocks();
    activityLibraryRepository.createQueryBuilder.mockReset();
  });

  const buildCreateDto = (): CreateActivityLibraryDto => ({
    originalActivityId: 'activity-1',
    publicTitle: 'Título público de prueba',
    publicDescription: 'Descripción extensa de la actividad para compartir en biblioteca',
    category: ActivityCategory.SCIENCE,
    difficultyLevel: DifficultyLevel.INTERMEDIATE,
    recommendedAgeMin: 8,
    recommendedAgeMax: 12,
    tags: ['Gamificación', 'Creatividad'],
  });

  const buildQueryBuilder = () => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
    getRawMany: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(undefined),
  });

  const buildUpdateDto = (overrides: Partial<UpdateActivityLibraryDto> = {}): UpdateActivityLibraryDto => ({
    ...overrides,
  });

  describe('shareActivity', () => {
    const teacherId = 'teacher-1';

    it('debería compartir una actividad cuando el usuario es docente y la actividad es válida', async () => {
      const dto = buildCreateDto();
      const libraryEntry = { id: 'library-1' } as ActivityLibrary;

      userRepository.findOne.mockResolvedValue({ id: teacherId, role: UserRole.TEACHER, isActive: true } as User);
      activityRepository.findOne.mockResolvedValue({ id: dto.originalActivityId, createdById: teacherId, isActive: true } as Activity);
      activityLibraryRepository.findOne.mockResolvedValue(null);
      activityLibraryRepository.create.mockReturnValue(libraryEntry);
      activityLibraryRepository.save.mockResolvedValue(libraryEntry);
      (activityTagRepository.create as jest.Mock).mockImplementation((tag: Partial<ActivityTag>) => ({
        ...tag,
        id: 'tag-1',
      }) as ActivityTag);
      (activityTagRepository.save as jest.Mock).mockImplementation(async (input: ActivityTag | ActivityTag[]) => input);

      const result = await service.shareActivity(teacherId, dto);

      expect(result.success).toBe(true);
  expect(result.data).toBe(libraryEntry);
      expect(activityLibraryRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          authorId: teacherId,
          visibility: ActivityVisibility.UNDER_REVIEW,
        }),
      );
      expect(activityTagRepository.save).toHaveBeenCalled();
    });

    it('debería lanzar ForbiddenException cuando el usuario no es docente', async () => {
      const dto = buildCreateDto();
      userRepository.findOne.mockResolvedValue({ id: teacherId, role: UserRole.STUDENT, isActive: true } as User);

  await expect(service.shareActivity(teacherId, dto)).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('debería lanzar NotFoundException cuando la actividad original no existe', async () => {
      const dto = buildCreateDto();
      userRepository.findOne.mockResolvedValue({ id: teacherId, role: UserRole.TEACHER, isActive: true } as User);
      activityRepository.findOne.mockResolvedValue(null);

  await expect(service.shareActivity(teacherId, dto)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('debería lanzar BadRequestException cuando los rangos recomendados son inválidos', async () => {
      const dto: CreateActivityLibraryDto = {
        ...buildCreateDto(),
        recommendedAgeMin: 15,
        recommendedAgeMax: 10,
      };

      userRepository.findOne.mockResolvedValue({ id: teacherId, role: UserRole.TEACHER, isActive: true } as User);
      activityRepository.findOne.mockResolvedValue({ id: dto.originalActivityId, createdById: teacherId, isActive: true } as Activity);
      activityLibraryRepository.findOne.mockResolvedValue(null);

      await expect(service.shareActivity(teacherId, dto)).rejects.toBeInstanceOf(BadRequestException);
      expect(activityLibraryRepository.create).not.toHaveBeenCalled();
    });

    it('debería lanzar ConflictException cuando la actividad ya fue compartida', async () => {
      const dto = buildCreateDto();

      userRepository.findOne.mockResolvedValue({ id: teacherId, role: UserRole.TEACHER, isActive: true } as User);
      activityRepository.findOne.mockResolvedValue({ id: dto.originalActivityId, createdById: teacherId, isActive: true } as Activity);
  activityLibraryRepository.findOne.mockResolvedValue({ id: 'existing' } as ActivityLibrary);

  await expect(service.shareActivity(teacherId, dto)).rejects.toBeInstanceOf(ConflictException);
    });

    it('normaliza etiquetas antes de guardarlas', async () => {
      const dto: CreateActivityLibraryDto = {
        ...buildCreateDto(),
        tags: ['  Innovacion  ', 'STEM']
      };

      userRepository.findOne.mockResolvedValue({ id: teacherId, role: UserRole.TEACHER, isActive: true } as User);
      activityRepository.findOne.mockResolvedValue({ id: dto.originalActivityId, createdById: teacherId, isActive: true } as Activity);
      activityLibraryRepository.findOne.mockResolvedValue(null);
      activityLibraryRepository.create.mockReturnValue({ id: 'library-2' } as ActivityLibrary);
      activityLibraryRepository.save.mockResolvedValue({ id: 'library-2' } as ActivityLibrary);
      (activityTagRepository.create as jest.Mock).mockImplementation((payload: Partial<ActivityTag>) => ({
        ...payload,
        id: `tag-${Math.random()}`,
      }) as ActivityTag);
      (activityTagRepository.save as jest.Mock).mockImplementation(async (input: ActivityTag | ActivityTag[]) => input);

      await service.shareActivity(teacherId, dto);

      const savedTags = activityTagRepository.save.mock.calls[0][0];
      expect(savedTags).toHaveLength(2);
      expect(savedTags[0]).toMatchObject({ tagName: 'innovacion', color: '#123456' });
      expect(savedTags[1]).toMatchObject({ tagName: 'stem' });
    });
  });

  describe('updateSharedActivity', () => {
    const ownerId = 'owner-1';
    const libraryId = 'library-1';

    it('lanza NotFoundException cuando la actividad no existe', async () => {
      activityLibraryRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateSharedActivity(ownerId, libraryId, buildUpdateDto()),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza ForbiddenException cuando otro usuario intenta actualizar', async () => {
      activityLibraryRepository.findOne.mockResolvedValue({
        id: libraryId,
        isActive: true,
        authorId: ownerId,
        author: { id: ownerId },
      } as ActivityLibrary);

      await expect(
        service.updateSharedActivity('intruder', libraryId, buildUpdateDto()),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('restablece visibilidad a UNDER_REVIEW cuando se re publica una actividad rechazada', async () => {
      const existing = {
        id: libraryId,
        isActive: true,
        authorId: ownerId,
        author: { id: ownerId },
        visibility: ActivityVisibility.REJECTED,
      } as ActivityLibrary;

      activityLibraryRepository.findOne.mockResolvedValue(existing);
      activityLibraryRepository.save.mockResolvedValue(existing);

      const updateDto = buildUpdateDto({ visibility: ActivityVisibility.PUBLIC });

      await service.updateSharedActivity(ownerId, libraryId, updateDto);

      expect(activityLibraryRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ visibility: ActivityVisibility.UNDER_REVIEW }),
      );
    });

    it('actualiza etiquetas reemplazándolas por las nuevas', async () => {
      const existing = {
        id: libraryId,
        isActive: true,
        authorId: ownerId,
        author: { id: ownerId },
        visibility: ActivityVisibility.PUBLIC,
      } as ActivityLibrary;

      activityLibraryRepository.findOne.mockResolvedValue(existing);
      activityLibraryRepository.save.mockResolvedValue(existing);
      const updateResult: UpdateResult = { generatedMaps: [], raw: [], affected: 2 };
      activityTagRepository.update.mockResolvedValue(updateResult);
      activityTagRepository.create.mockImplementation((payload: Partial<ActivityTag>) => ({
        id: `tag-${Math.random()}`,
        libraryActivityId: payload.libraryActivityId ?? libraryId,
        tagName: payload.tagName ?? '',
        color: payload.color ?? '#123456',
        isActive: payload.isActive ?? true,
        createdAt: payload.createdAt ?? new Date(),
        libraryActivity: payload.libraryActivity ?? undefined,
      } as ActivityTag));

      const updateDto = buildUpdateDto({
        tags: [' Proyecto ', 'STEAM'],
      });

      await service.updateSharedActivity(ownerId, libraryId, updateDto);

      expect(activityTagRepository.update).toHaveBeenCalledWith(
        { libraryActivityId: libraryId, isActive: true },
        { isActive: false },
      );

      const savedTags = activityTagRepository.save.mock.calls[0][0];
      expect(savedTags).toHaveLength(2);
      expect(savedTags[0]).toMatchObject({ libraryActivityId: libraryId, tagName: 'proyecto' });
      expect(savedTags[1]).toMatchObject({ tagName: 'steam' });
    });
  });

  describe('rateActivity', () => {
    it('lanza ConflictException si el usuario ya valoró la actividad', async () => {
      const libraryActivity = {
        id: 'library-1',
        isActive: true,
        authorId: 'author-1',
        canBeRatedBy: jest.fn().mockReturnValue(true),
        updateAverageRating: jest.fn(),
      } as unknown as ActivityLibrary;

      activityLibraryRepository.findOne.mockResolvedValue(libraryActivity);
      activityRatingRepository.findOne.mockResolvedValue({ id: 'rating-1' } as ActivityRating);

      const ratingDto: CreateActivityRatingDto = { libraryActivityId: 'library-1', rating: 4 };

      await expect(service.rateActivity('user-1', ratingDto)).rejects.toBeInstanceOf(ConflictException);
      expect(activityRatingRepository.create).not.toHaveBeenCalled();
    });

    it('lanza ForbiddenException cuando el autor intenta valorarse', async () => {
      const libraryActivity = {
        id: 'library-1',
        isActive: true,
        authorId: 'author-1',
        canBeRatedBy: jest.fn().mockReturnValue(false),
        updateAverageRating: jest.fn(),
      } as unknown as ActivityLibrary;

      activityLibraryRepository.findOne.mockResolvedValue(libraryActivity);

      const ratingDto: CreateActivityRatingDto = { libraryActivityId: 'library-1', rating: 5 };

      await expect(service.rateActivity('author-1', ratingDto)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('updateRating', () => {
    it('lanza ForbiddenException si la valoración no puede editarse', async () => {
      const rating = {
        id: 'rating-1',
        userId: 'user-1',
        isActive: true,
        canBeEdited: jest.fn().mockReturnValue(false),
        libraryActivity: { removeFromAverageRating: jest.fn(), updateAverageRating: jest.fn() },
      } as unknown as ActivityRating;

      activityRatingRepository.findOne.mockResolvedValue(rating);

      const updateDto: UpdateActivityRatingDto = { rating: 3 };

      await expect(service.updateRating('user-1', 'rating-1', updateDto)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('copyActivityToClassroom', () => {
    const teacherId = 'teacher-owner';
    const libraryId = 'library-to-copy';
    const classroomId = 'classroom-1';

    const originalActivity = {
      title: 'Actividad Original',
      description: 'Descripción',
      type: ActivityType.QUIZ,
      difficulty: DifficultyLevel.BEGINNER,
      subject: 'Science',
      content: { steps: [] },
      rewards: { coins: 10, experience: 50 },
      tags: ['stem'],
      estimatedTime: 15,
      baseExperience: 100,
      maxAttempts: 3,
      settings: { timed: false },
    } as unknown as Activity;

    it('clona la actividad y actualiza estadísticas cuando el docente es propietario del aula', async () => {
      const libraryActivity = {
        id: libraryId,
        isActive: true,
        canBeCopied: jest.fn().mockReturnValue(true),
        originalActivity,
        incrementCopies: jest.fn(),
        incrementViews: jest.fn(),
      } as unknown as ActivityLibrary;

      activityLibraryRepository.findOne.mockResolvedValue(libraryActivity);
      userRepository.findOne.mockResolvedValue({
        id: teacherId,
        role: UserRole.TEACHER,
        ownedClassrooms: [{ id: classroomId }],
        enrolledClassrooms: [],
      } as unknown as User);

      activityRepository.create.mockImplementation((payload: Partial<Activity>) => payload as Activity);
      activityRepository.save.mockResolvedValue({ id: 'copied-1' } as Activity);
      activityLibraryRepository.save.mockResolvedValue(libraryActivity);

      const result = await service.copyActivityToClassroom(teacherId, libraryId, classroomId);

      expect(activityRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Actividad Original (Copia)',
          classroomId,
          createdById: teacherId,
          isPublic: false,
        }),
      );
      expect(libraryActivity.incrementCopies).toHaveBeenCalled();
      expect(libraryActivity.incrementViews).toHaveBeenCalled();
      expect(result.success).toBe(true);
        const payload = result as { data?: { copiedActivity?: Activity } };
        expect(payload.data?.copiedActivity).toMatchObject({ id: 'copied-1' });
    });

    it('lanza ForbiddenException si el docente no posee el aula y no es admin', async () => {
      const libraryActivity = {
        id: libraryId,
        isActive: true,
        canBeCopied: jest.fn().mockReturnValue(true),
        originalActivity,
        incrementCopies: jest.fn(),
        incrementViews: jest.fn(),
      } as unknown as ActivityLibrary;

      activityLibraryRepository.findOne.mockResolvedValue(libraryActivity);
      userRepository.findOne.mockResolvedValue({
        id: teacherId,
        role: UserRole.TEACHER,
        ownedClassrooms: [],
        enrolledClassrooms: [],
      } as unknown as User);

      await expect(
        service.copyActivityToClassroom(teacherId, libraryId, classroomId),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(activityRepository.create).not.toHaveBeenCalled();
    });

    it('permite copiar cuando el usuario es administrador', async () => {
      const libraryActivity = {
        id: libraryId,
        isActive: true,
        canBeCopied: jest.fn().mockReturnValue(true),
        originalActivity,
        incrementCopies: jest.fn(),
        incrementViews: jest.fn(),
      } as unknown as ActivityLibrary;

      activityLibraryRepository.findOne.mockResolvedValue(libraryActivity);
      userRepository.findOne.mockResolvedValue({
        id: 'admin-1',
        role: UserRole.ADMIN,
        ownedClassrooms: [],
        enrolledClassrooms: [],
      } as unknown as User);

      activityRepository.create.mockImplementation((payload: Partial<Activity>) => payload as Activity);
      activityRepository.save.mockResolvedValue({ id: 'copied-2' } as Activity);
      activityLibraryRepository.save.mockResolvedValue(libraryActivity);

      const result = await service.copyActivityToClassroom('admin-1', libraryId, classroomId);

      expect(result.success).toBe(true);
      expect(activityRepository.create).toHaveBeenCalled();
    });
  });

  describe('getMySharedActivities', () => {
    it('retorna resultados paginados aplicando filtros', async () => {
      const qb = buildQueryBuilder();
      qb.getManyAndCount.mockResolvedValue([[{ id: 'library-1' } as ActivityLibrary], 1]);
      (activityLibraryRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const filters = new ActivityLibraryFilterDto();
      filters.page = 2;
      filters.limit = 5;
      filters.sortBy = 'totalViews';
      filters.sortOrder = 'ASC';
      filters.search = 'laboratorio';
      filters.tags = ['steam'];

      const result = await service.getMySharedActivities('owner-1', filters);

      expect(qb.orderBy).toHaveBeenCalledWith('library.totalViews', 'ASC');
      expect(qb.skip).toHaveBeenCalledWith(filters.getOffset());
      expect(result.items).toHaveLength(1);
      expect(result.totalPages).toBe(1);
      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('tag.tagName'),
        expect.objectContaining({ tags: ['steam'] }),
      );
    });
  });

  describe('searchPublicActivities', () => {
    it('aplica filtros y aumenta vistas cuando hay resultados', async () => {
      const searchQB = buildQueryBuilder();
      const updateQB = buildQueryBuilder();
      const items = [{ id: 'library-7' } as ActivityLibrary];
      searchQB.getManyAndCount.mockResolvedValue([items, items.length]);
      (activityLibraryRepository.createQueryBuilder as jest.Mock).mockImplementation((alias?: string) =>
        alias ? searchQB : updateQB,
      );

      const filters = new ActivityLibraryFilterDto();
      filters.page = 1;
      filters.limit = 10;
      filters.sortBy = 'averageRating';
      filters.sortOrder = 'ASC';
      filters.tags = ['steam'];

      const result = await service.searchPublicActivities(filters);

      expect(searchQB.orderBy).toHaveBeenCalledWith('library.averageRating', 'ASC');
      expect(updateQB.update).toHaveBeenCalledWith(ActivityLibrary);
      expect(updateQB.set).toHaveBeenCalledWith({ totalViews: expect.any(Function) });
      expect(updateQB.where).toHaveBeenCalledWith('id IN (:...ids)', { ids: ['library-7'] });
      expect(updateQB.execute).toHaveBeenCalled();
      expect(result.items).toEqual(items);
      expect(searchQB.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('tag.tagName'),
        expect.objectContaining({ tags: ['steam'] }),
      );
    });

    it('no incrementa vistas cuando la búsqueda no devuelve resultados', async () => {
      const searchQB = buildQueryBuilder();
      const updateQB = buildQueryBuilder();
      searchQB.getManyAndCount.mockResolvedValue([[], 0]);
      (activityLibraryRepository.createQueryBuilder as jest.Mock).mockImplementation((alias?: string) =>
        alias ? searchQB : updateQB,
      );

      const filters = new ActivityLibraryFilterDto();
      filters.page = 1;
      filters.limit = 10;

      const result = await service.searchPublicActivities(filters);

      expect(result.items).toHaveLength(0);
      expect(updateQB.execute).not.toHaveBeenCalled();
    });
  });

  describe('getPublicActivityDetails', () => {
    it('retorna la actividad pública e incrementa la vista', async () => {
      const activity = {
        id: 'library-42',
        totalViews: 2,
        authorId: 'teacher-7',
        originalActivityId: 'activity-9',
        visibility: ActivityVisibility.PUBLIC,
      } as ActivityLibrary;

      activityLibraryRepository.findOne.mockResolvedValue(activity);
      const updateQB = buildQueryBuilder();
      (activityLibraryRepository.createQueryBuilder as jest.Mock).mockReturnValue(updateQB);

      const result = await service.getPublicActivityDetails('library-42');

      expect(activityLibraryRepository.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: 'library-42',
            isActive: true,
          }),
        }),
      );
      expect(updateQB.update).toHaveBeenCalledWith(ActivityLibrary);
      expect(updateQB.where).toHaveBeenCalledWith('id IN (:...ids)', { ids: ['library-42'] });
      expect(updateQB.execute).toHaveBeenCalled();
      expect(result).toBe(activity);
      expect(result.totalViews).toBe(3);
    });

    it('lanza NotFoundException si la actividad no está disponible públicamente', async () => {
      activityLibraryRepository.findOne.mockResolvedValue(null);

      await expect(service.getPublicActivityDetails('library-missing')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza BadRequestException si ocurre un error inesperado al consultar', async () => {
      activityLibraryRepository.findOne.mockRejectedValue(new Error('DB down'));

      await expect(service.getPublicActivityDetails('library-500')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('getLibraryStats', () => {
    it('agrega métricas de manera consistente', async () => {
      activityLibraryRepository.count.mockResolvedValue(4);

      const categoryQB = buildQueryBuilder();
      categoryQB.getRawMany.mockResolvedValue([
        { category: ActivityCategory.SCIENCE, count: '2' },
      ]);

      const difficultyQB = buildQueryBuilder();
      difficultyQB.getRawMany.mockResolvedValue([
        { difficulty: DifficultyLevel.BEGINNER, count: '3' },
      ]);

      const topRatedQB = buildQueryBuilder();
      topRatedQB.getMany.mockResolvedValue([
        { id: 'library-rated', averageRating: 4.8 } as ActivityLibrary,
      ]);

      const mostCopiedQB = buildQueryBuilder();
      mostCopiedQB.getMany.mockResolvedValue([
        { id: 'library-copied', totalCopies: 6 } as ActivityLibrary,
      ]);

      const contributorsQB = buildQueryBuilder();
      contributorsQB.getRawMany.mockResolvedValue([
        {
          userId: 'user-1',
          firstName: 'Ana',
          lastName: 'López',
          activitiesShared: '3',
          avgRating: '4.5',
          totalCopies: '7',
        },
      ]);

      const queue = [categoryQB, difficultyQB, topRatedQB, mostCopiedQB, contributorsQB];
      (activityLibraryRepository.createQueryBuilder as jest.Mock).mockImplementation(() => queue.shift());

      const stats = await service.getLibraryStats();

      expect(stats.totalPublicActivities).toBe(4);
      expect(stats.activitiesByCategory[ActivityCategory.SCIENCE]).toBe(2);
      expect(stats.activitiesByDifficulty[DifficultyLevel.BEGINNER]).toBe(3);
      expect(stats.topRatedActivities[0].id).toBe('library-rated');
      expect(stats.mostCopiedActivities[0].id).toBe('library-copied');
      expect(stats.topContributors[0].userId).toBe('user-1');
      expect(activityLibraryRepository.createQueryBuilder).toHaveBeenCalledTimes(5);
    });
  });
});
