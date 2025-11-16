import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, In } from 'typeorm';
import { ActivityLibrary, ActivityVisibility, ActivityCategory, DifficultyLevel } from '../entities/activity-library.entity';
import { ActivityRating } from '../entities/activity-rating.entity';
import { ActivityTag } from '../entities/activity-tag.entity';
import { Activity } from '../../activities/activity.entity';
import { User, UserRole } from '../../users/user.entity';
import {
  CreateActivityLibraryDto,
  UpdateActivityLibraryDto,
  ActivityLibraryFilterDto,
  CreateActivityRatingDto,
  UpdateActivityRatingDto,
  LibraryStatsDto
} from '../dto/activity-library.dto';

/**
 * Interfaz para resultados de operaciones de biblioteca
 * Define la estructura estándar de respuestas del servicio
 */
interface LibraryOperationResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

interface RangeValidatable {
  recommendedAgeMin?: number | null;
  recommendedAgeMax?: number | null;
  recommendedStudentsMin?: number | null;
  recommendedStudentsMax?: number | null;
}

/**
 * Interfaz para resultados paginados
 * Estructura estándar para respuestas con paginación
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Servicio para gestión de la Biblioteca de Actividades
 * Implementa todos los casos de uso relacionados con compartir, valorar y gestionar actividades públicas
 * 
 * Casos de Uso Implementados:
 * - CU-32: Compartir actividades en biblioteca pública
 * - CU-33: Valorar actividades de otros profesores
 * - CU-34: Copiar actividades de la biblioteca
 * - CU-35: Gestionar mis actividades públicas
 * 
 * Principios SOLID Aplicados:
 * - Single Responsibility: Cada método tiene una responsabilidad específica
 * - Open/Closed: Extensible para nuevas funcionalidades sin modificar existentes
 * - Liskov Substitution: Interfaces bien definidas para intercambiabilidad
 * - Interface Segregation: Interfaces específicas para cada tipo de operación
 * - Dependency Inversion: Depende de abstracciones (Repository pattern)
 * 
 * @author Sistema de Gestión Educativa AcaLud
 * @version 1.0.0
 */
@Injectable()
export class ActivityLibraryService {
  constructor(
    /**
     * Repositorio para gestión de actividades en biblioteca
     * Abstracción del acceso a datos siguiendo Repository Pattern
     */
    @InjectRepository(ActivityLibrary)
    private readonly activityLibraryRepository: Repository<ActivityLibrary>,

    /**
     * Repositorio para gestión de valoraciones
     * Manejo independiente de las puntuaciones de actividades
     */
    @InjectRepository(ActivityRating)
    private readonly activityRatingRepository: Repository<ActivityRating>,

    /**
     * Repositorio para gestión de etiquetas
     * Sistema flexible de categorización mediante tags
     */
    @InjectRepository(ActivityTag)
    private readonly activityTagRepository: Repository<ActivityTag>,

    /**
     * Repositorio de actividades originales
     * Acceso a las actividades base del sistema
     */
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,

    /**
     * Repositorio de usuarios
     * Validación de autorización y permisos
     */
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // =====================================
  // CU-32: COMPARTIR ACTIVIDADES EN BIBLIOTECA PÚBLICA
  // =====================================

  /**
   * Comparte una actividad en la biblioteca pública
   * Implementa CU-32: Permite a los profesores compartir sus actividades
   * 
   * Validaciones implementadas:
   * - Usuario debe ser profesor (rol TEACHER)
   * - Actividad debe existir y pertenecer al usuario
   * - No se puede compartir la misma actividad dos veces
   * - Datos de compartición deben ser válidos
   * 
   * @param userId - ID del usuario que comparte la actividad
   * @param createDto - Datos para la creación de la entrada en biblioteca
   * @returns Resultado de la operación con la actividad compartida
   */
  async shareActivity(userId: string, createDto: CreateActivityLibraryDto): Promise<LibraryOperationResult> {
    try {
      // Validar que el usuario existe y es profesor
      const user = await this.userRepository.findOne({ 
        where: { id: userId, isActive: true } 
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      if (user.role !== UserRole.TEACHER) {
        throw new ForbiddenException('Solo los profesores pueden compartir actividades');
      }

      // Validar que la actividad original existe y pertenece al usuario
      const originalActivity = await this.activityRepository.findOne({
        where: { 
          id: createDto.originalActivityId, 
          createdById: userId,
          isActive: true 
        }
      });

      if (!originalActivity) {
        throw new NotFoundException('Actividad no encontrada o no tienes permisos para compartirla');
      }

      // Verificar que no se haya compartido ya esta actividad
      const existingShare = await this.activityLibraryRepository.findOne({
        where: { 
          originalActivityId: createDto.originalActivityId,
          authorId: userId,
          isActive: true
        }
      });

      if (existingShare) {
        throw new ConflictException('Esta actividad ya ha sido compartida en la biblioteca');
      }

      // Validar coherencia en rangos de edad y estudiantes
      this.validateRanges(createDto);

      // Extraer tags del DTO para manejarlas por separado
      const { tags, ...libraryData } = createDto;

      // Crear entrada en la biblioteca
      const libraryEntry = this.activityLibraryRepository.create({
        ...libraryData,
        authorId: userId,
        visibility: ActivityVisibility.UNDER_REVIEW, // Todas las actividades empiezan en revisión
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const savedEntry = await this.activityLibraryRepository.save(libraryEntry);

      // Crear etiquetas si se proporcionaron
      if (tags && tags.length > 0) {
        await this.createTagsForActivity(savedEntry.id, tags);
      }

      return {
        success: true,
        message: 'Actividad compartida exitosamente. Se encuentra en revisión para publicación.',
        data: savedEntry
      };

    } catch (error) {
      if (error instanceof NotFoundException || 
          error instanceof ForbiddenException || 
          error instanceof ConflictException ||
          error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(`Error al compartir actividad: ${error.message}`);
    }
  }

  /**
   * Actualiza una actividad compartida en la biblioteca
   * Permite modificar información de actividades ya compartidas
   * 
   * @param userId - ID del usuario propietario
   * @param libraryActivityId - ID de la actividad en biblioteca
   * @param updateDto - Datos de actualización
   * @returns Resultado de la operación de actualización
   */
  async updateSharedActivity(
    userId: string, 
    libraryActivityId: string, 
    updateDto: UpdateActivityLibraryDto
  ): Promise<LibraryOperationResult> {
    try {
      // Buscar la actividad en biblioteca
      const libraryActivity = await this.activityLibraryRepository.findOne({
        where: { id: libraryActivityId, isActive: true },
        relations: ['author']
      });

      if (!libraryActivity) {
        throw new NotFoundException('Actividad no encontrada en la biblioteca');
      }

      // Verificar permisos de edición
      if (libraryActivity.authorId !== userId) {
        throw new ForbiddenException('No tienes permisos para editar esta actividad');
      }

      // Validar coherencia si se actualizan rangos
      if (
        updateDto.recommendedAgeMin !== undefined ||
        updateDto.recommendedAgeMax !== undefined ||
        updateDto.recommendedStudentsMin !== undefined ||
        updateDto.recommendedStudentsMax !== undefined
      ) {
        this.validateRanges({
          recommendedAgeMin: updateDto.recommendedAgeMin ?? libraryActivity.recommendedAgeMin,
          recommendedAgeMax: updateDto.recommendedAgeMax ?? libraryActivity.recommendedAgeMax,
          recommendedStudentsMin: updateDto.recommendedStudentsMin ?? libraryActivity.recommendedStudentsMin,
          recommendedStudentsMax: updateDto.recommendedStudentsMax ?? libraryActivity.recommendedStudentsMax,
        });
      }

      // Si se cambia la visibilidad a público, validar que no esté rechazada
      if (updateDto.visibility === ActivityVisibility.PUBLIC && 
          libraryActivity.visibility === ActivityVisibility.REJECTED) {
        // Cambiar a revisión para nueva evaluación
        updateDto.visibility = ActivityVisibility.UNDER_REVIEW;
      }

      // Extraer tags del DTO para manejarlas por separado
      const { tags, ...updateData } = updateDto;

      // Actualizar campos
      Object.assign(libraryActivity, updateData, { updatedAt: new Date() });
      const updatedActivity = await this.activityLibraryRepository.save(libraryActivity);

      // Actualizar etiquetas si se proporcionaron
      if (tags) {
        await this.updateActivityTags(libraryActivityId, tags);
      }

      return {
        success: true,
        message: 'Actividad actualizada exitosamente',
        data: updatedActivity
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException(`Error al actualizar actividad: ${error.message}`);
    }
  }

  // =====================================
  // CU-33: VALORAR ACTIVIDADES DE OTROS PROFESORES
  // =====================================

  /**
   * Permite a un usuario valorar una actividad de la biblioteca
   * Implementa CU-33: Sistema de puntuaciones y comentarios
   * 
   * Validaciones:
   * - Usuario no puede valorar sus propias actividades
   * - Solo una valoración por usuario por actividad
   * - Actividad debe estar públicamente visible
   * - Puntuación debe estar en rango válido (1-5)
   * 
   * @param userId - ID del usuario que valora
   * @param ratingDto - Datos de la valoración
   * @returns Resultado de la operación de valoración
   */
  async rateActivity(userId: string, ratingDto: CreateActivityRatingDto): Promise<LibraryOperationResult> {
    try {
      // Validar que la actividad existe y es pública
      const libraryActivity = await this.activityLibraryRepository.findOne({
        where: { 
          id: ratingDto.libraryActivityId,
          isActive: true
        }
      });

      if (!libraryActivity) {
        throw new NotFoundException('Actividad no encontrada');
      }

      if (!libraryActivity.canBeRatedBy(userId)) {
        if (libraryActivity.authorId === userId) {
          throw new ForbiddenException('No puedes valorar tus propias actividades');
        } else {
          throw new ForbiddenException('Esta actividad no puede ser valorada en este momento');
        }
      }

      // Verificar que el usuario no haya valorado ya esta actividad
      const existingRating = await this.activityRatingRepository.findOne({
        where: { 
          userId, 
          libraryActivityId: ratingDto.libraryActivityId,
          isActive: true 
        }
      });

      if (existingRating) {
        throw new ConflictException('Ya has valorado esta actividad');
      }

      // Crear la valoración
      const rating = this.activityRatingRepository.create({
        userId,
        libraryActivityId: ratingDto.libraryActivityId,
        rating: ratingDto.rating,
        comment: ratingDto.comment,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const savedRating = await this.activityRatingRepository.save(rating);

      // Actualizar estadísticas de la actividad
      libraryActivity.updateAverageRating(ratingDto.rating);
      await this.activityLibraryRepository.save(libraryActivity);

      return {
        success: true,
        message: 'Valoración registrada exitosamente',
        data: savedRating
      };

    } catch (error) {
      if (error instanceof NotFoundException || 
          error instanceof ForbiddenException || 
          error instanceof ConflictException) {
        throw error;
      }

      throw new BadRequestException(`Error al valorar actividad: ${error.message}`);
    }
  }

  /**
   * Actualiza una valoración existente
   * Permite modificar puntuación y comentario dentro del tiempo límite
   * 
   * @param userId - ID del usuario propietario de la valoración
   * @param ratingId - ID de la valoración a actualizar
   * @param updateDto - Nuevos datos de la valoración
   * @returns Resultado de la operación de actualización
   */
  async updateRating(
    userId: string, 
    ratingId: string, 
    updateDto: UpdateActivityRatingDto
  ): Promise<LibraryOperationResult> {
    try {
      // Buscar la valoración
      const rating = await this.activityRatingRepository.findOne({
        where: { id: ratingId, userId, isActive: true },
        relations: ['libraryActivity']
      });

      if (!rating) {
        throw new NotFoundException('Valoración no encontrada');
      }

      // Verificar si puede ser editada (dentro del tiempo límite)
      if (!rating.canBeEdited()) {
        throw new ForbiddenException('Ya no puedes editar esta valoración (tiempo límite excedido)');
      }

  const oldRating = rating.rating;

      // Actualizar valoración
      if (updateDto.rating !== undefined) {
        rating.rating = updateDto.rating;
      }
      if (updateDto.comment !== undefined) {
        rating.comment = updateDto.comment || null;
      }

      rating.updatedAt = new Date();
      const updatedRating = await this.activityRatingRepository.save(rating);

      // Recalcular promedio de la actividad si cambió la puntuación
      if (updateDto.rating !== undefined && updateDto.rating !== oldRating) {
        const libraryActivity = rating.libraryActivity;
        libraryActivity.removeFromAverageRating(oldRating);
        libraryActivity.updateAverageRating(updateDto.rating);
        await this.activityLibraryRepository.save(libraryActivity);
      }

      return {
        success: true,
        message: 'Valoración actualizada exitosamente',
        data: updatedRating
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException(`Error al actualizar valoración: ${error.message}`);
    }
  }

  // =====================================
  // CU-34: COPIAR ACTIVIDADES DE LA BIBLIOTECA
  // =====================================

  /**
   * Copia una actividad de la biblioteca al aula del usuario
   * Implementa CU-34: Permite reutilizar actividades públicas
   * 
   * Proceso de copia:
   * 1. Validar permisos y acceso
   * 2. Clonar actividad original
   * 3. Asignar al aula del usuario
   * 4. Actualizar estadísticas de copia
   * 5. Incrementar contador de vistas
   * 
   * @param userId - ID del usuario que copia
   * @param libraryActivityId - ID de la actividad en biblioteca
   * @param targetClassroomId - ID del aula destino
   * @returns Resultado con la actividad copiada
   */
  async copyActivityToClassroom(
    userId: string, 
    libraryActivityId: string, 
    targetClassroomId: string
  ): Promise<LibraryOperationResult> {
    try {
      // Validar que la actividad existe y puede ser copiada
      const libraryActivity = await this.activityLibraryRepository.findOne({
        where: { id: libraryActivityId, isActive: true },
        relations: ['originalActivity', 'author']
      });

      if (!libraryActivity) {
        throw new NotFoundException('Actividad no encontrada en la biblioteca');
      }

      if (!libraryActivity.canBeCopied()) {
        throw new ForbiddenException('Esta actividad no puede ser copiada en este momento');
      }

      // Validar que el usuario tiene acceso al aula destino
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['ownedClassrooms', 'enrolledClassrooms']
      });

      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }

      // Verificar permisos sobre el aula (profesor propietario o administrador)
      const hasAccessToClassroom = user.role === UserRole.TEACHER && 
        user.ownedClassrooms?.some(classroom => classroom.id === targetClassroomId);

      const isAdmin = user.role === UserRole.ADMIN;

      if (!hasAccessToClassroom && !isAdmin) {
        throw new ForbiddenException('No tienes permisos para agregar actividades a esta aula');
      }

      // Clonar la actividad original
      const originalActivity = libraryActivity.originalActivity;
      const copiedActivity = this.activityRepository.create({
        title: `${originalActivity.title} (Copia)`,
        description: originalActivity.description,
        type: originalActivity.type,
        difficulty: originalActivity.difficulty,
        subject: originalActivity.subject,
        content: originalActivity.content,
        rewards: originalActivity.rewards,
        tags: originalActivity.tags,
        estimatedTime: originalActivity.estimatedTime,
        baseExperience: originalActivity.baseExperience,
        maxAttempts: originalActivity.maxAttempts,
        settings: originalActivity.settings,
        classroomId: targetClassroomId,
        createdById: userId,
        isPublic: false, // Las copias son privadas por defecto
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const savedActivity = await this.activityRepository.save(copiedActivity);

      // Actualizar estadísticas de la actividad en biblioteca
      libraryActivity.incrementCopies();
      libraryActivity.incrementViews(); // También cuenta como vista
      await this.activityLibraryRepository.save(libraryActivity);

      return {
        success: true,
        message: 'Actividad copiada exitosamente a tu aula',
        data: {
          copiedActivity: savedActivity,
          originalLibraryActivity: libraryActivity
        }
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }

      throw new BadRequestException(`Error al copiar actividad: ${error.message}`);
    }
  }

  // =====================================
  // CU-35: GESTIONAR MIS ACTIVIDADES PÚBLICAS
  // =====================================

  /**
   * Obtiene todas las actividades compartidas por un usuario
   * Implementa CU-35: Gestión de actividades propias compartidas
   * 
   * @param userId - ID del usuario propietario
   * @param filters - Filtros adicionales opcionales
   * @returns Lista paginada de actividades del usuario
   */
  async getMySharedActivities(
    userId: string, 
    filters: ActivityLibraryFilterDto
  ): Promise<PaginatedResult<ActivityLibrary>> {
    try {
      const queryBuilder = this.activityLibraryRepository
        .createQueryBuilder('library')
        .leftJoinAndSelect('library.originalActivity', 'activity')
        .leftJoinAndSelect('library.tags', 'tags')
        .where('library.authorId = :userId', { userId })
        .andWhere('library.isActive = :isActive', { isActive: true });

      // Aplicar filtros adicionales
      this.applyFiltersToQuery(queryBuilder, filters);

      // Aplicar ordenamiento
      const sortField = this.getSortField(filters.sortBy);
      queryBuilder.orderBy(`library.${sortField}`, filters.sortOrder || 'DESC');

      // Aplicar paginación
      const offset = filters.getOffset();
      queryBuilder.skip(offset).take(filters.limit);

      // Ejecutar consulta
      const [items, total] = await queryBuilder.getManyAndCount();

      return this.buildPaginatedResult(items, total, filters.page, filters.limit);

    } catch (error) {
      throw new BadRequestException(`Error al obtener actividades compartidas: ${error.message}`);
    }
  }

  /**
   * Elimina (desactiva) una actividad compartida
   * No elimina físicamente para mantener integridad referencial
   * 
   * @param userId - ID del usuario propietario
   * @param libraryActivityId - ID de la actividad a eliminar
   * @returns Resultado de la operación de eliminación
   */
  async removeSharedActivity(userId: string, libraryActivityId: string): Promise<LibraryOperationResult> {
    try {
      const libraryActivity = await this.activityLibraryRepository.findOne({
        where: { 
          id: libraryActivityId, 
          authorId: userId,
          isActive: true 
        }
      });

      if (!libraryActivity) {
        throw new NotFoundException('Actividad no encontrada o no tienes permisos para eliminarla');
      }

      // Desactivar en lugar de eliminar físicamente
      libraryActivity.isActive = false;
      libraryActivity.updatedAt = new Date();
      
      await this.activityLibraryRepository.save(libraryActivity);

      return {
        success: true,
        message: 'Actividad eliminada de la biblioteca exitosamente'
      };

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException(`Error al eliminar actividad: ${error.message}`);
    }
  }

  /**
   * Obtiene los detalles públicos de una actividad específica
   * Incluye relaciones clave para retornar información completa
   *
   * @param libraryActivityId - ID de la actividad en la biblioteca
   * @returns Detalles completos de la actividad pública
   */
  async getPublicActivityDetails(libraryActivityId: string): Promise<ActivityLibrary> {
    try {
      const activity = await this.activityLibraryRepository.findOne({
        where: {
          id: libraryActivityId,
          isActive: true,
          visibility: In([ActivityVisibility.PUBLIC, ActivityVisibility.FEATURED])
        },
        relations: ['originalActivity', 'author', 'tags']
      });

      if (!activity) {
        throw new NotFoundException('Actividad no encontrada o no disponible públicamente');
      }

      await this.incrementViewsForActivities([activity.id]);
      activity.totalViews = (activity.totalViews ?? 0) + 1;

      return activity;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException(`Error al obtener detalles de actividad: ${error.message}`);
    }
  }

  // =====================================
  // MÉTODOS DE BÚSQUEDA Y FILTRADO
  // =====================================

  /**
   * Busca actividades públicas en la biblioteca
   * Implementa búsqueda avanzada con múltiples filtros
   * 
   * @param filters - Criterios de búsqueda y filtrado
   * @returns Lista paginada de actividades que coinciden con los filtros
   */
  async searchPublicActivities(filters: ActivityLibraryFilterDto): Promise<PaginatedResult<ActivityLibrary>> {
    try {
      const queryBuilder = this.activityLibraryRepository
        .createQueryBuilder('library')
        .leftJoinAndSelect('library.originalActivity', 'activity')
        .leftJoinAndSelect('library.author', 'author')
        .leftJoinAndSelect('library.tags', 'tags')
        .where('library.isActive = :isActive', { isActive: true })
        .andWhere('library.visibility IN (:...visibilities)', { 
          visibilities: [ActivityVisibility.PUBLIC, ActivityVisibility.FEATURED] 
        });

      // Aplicar filtros
      this.applyFiltersToQuery(queryBuilder, filters);

      // Aplicar ordenamiento
      const sortField = this.getSortField(filters.sortBy);
      queryBuilder.orderBy(`library.${sortField}`, filters.sortOrder || 'DESC');

      // Aplicar paginación
      const offset = filters.getOffset();
      queryBuilder.skip(offset).take(filters.limit);

      // Ejecutar consulta
      const [items, total] = await queryBuilder.getManyAndCount();

      // Incrementar vistas para actividades retornadas
      if (items.length > 0) {
        await this.incrementViewsForActivities(items.map(item => item.id));
      }

      return this.buildPaginatedResult(items, total, filters.page, filters.limit);

    } catch (error) {
      throw new BadRequestException(`Error en búsqueda de actividades: ${error.message}`);
    }
  }

  /**
   * Obtiene estadísticas generales de la biblioteca
   * Proporciona métricas útiles para análisis y dashboards
   * 
   * @returns Estadísticas completas de la biblioteca
   */
  async getLibraryStats(): Promise<LibraryStatsDto> {
    try {
      // Total de actividades públicas
      const totalPublicActivities = await this.activityLibraryRepository.count({
        where: { 
          isActive: true,
          visibility: In([ActivityVisibility.PUBLIC, ActivityVisibility.FEATURED])
        }
      });

      // Actividades por categoría
      const categoryCounts = await this.activityLibraryRepository
        .createQueryBuilder('library')
        .select('library.category', 'category')
        .addSelect('COUNT(*)', 'count')
        .where('library.isActive = :isActive', { isActive: true })
        .andWhere('library.visibility IN (:...visibilities)', { 
          visibilities: [ActivityVisibility.PUBLIC, ActivityVisibility.FEATURED] 
        })
        .groupBy('library.category')
        .getRawMany();

      const activitiesByCategory = Object.values(ActivityCategory).reduce((acc, category) => {
        acc[category] = 0;
        return acc;
      }, {} as Record<ActivityCategory, number>);

      categoryCounts.forEach(count => {
        activitiesByCategory[count.category as ActivityCategory] = parseInt(count.count);
      });

      // Actividades por dificultad
      const difficultyCounts = await this.activityLibraryRepository
        .createQueryBuilder('library')
        .select('library.difficultyLevel', 'difficulty')
        .addSelect('COUNT(*)', 'count')
        .where('library.isActive = :isActive', { isActive: true })
        .andWhere('library.visibility IN (:...visibilities)', { 
          visibilities: [ActivityVisibility.PUBLIC, ActivityVisibility.FEATURED] 
        })
        .groupBy('library.difficultyLevel')
        .getRawMany();

      const activitiesByDifficulty = Object.values(DifficultyLevel).reduce((acc, difficulty) => {
        acc[difficulty] = 0;
        return acc;
      }, {} as Record<DifficultyLevel, number>);

      difficultyCounts.forEach(count => {
        activitiesByDifficulty[count.difficulty as DifficultyLevel] = parseInt(count.count);
      });

  // Top 5 actividades más valoradas
  const topRatedActivitiesEntities = await this.activityLibraryRepository
        .createQueryBuilder('library')
        .leftJoinAndSelect('library.author', 'author')
        .where('library.isActive = :isActive', { isActive: true })
        .andWhere('library.visibility IN (:...visibilities)', { 
          visibilities: [ActivityVisibility.PUBLIC, ActivityVisibility.FEATURED] 
        })
        .andWhere('library.totalRatings >= :minRatings', { minRatings: 3 })
        .orderBy('library.averageRating', 'DESC')
        .addOrderBy('library.totalRatings', 'DESC')
        .take(5)
        .getMany();

  // Top 5 actividades más copiadas
  const mostCopiedActivitiesEntities = await this.activityLibraryRepository
        .createQueryBuilder('library')
        .leftJoinAndSelect('library.author', 'author')
        .where('library.isActive = :isActive', { isActive: true })
        .andWhere('library.visibility IN (:...visibilities)', { 
          visibilities: [ActivityVisibility.PUBLIC, ActivityVisibility.FEATURED] 
        })
        .orderBy('library.totalCopies', 'DESC')
        .take(5)
        .getMany();

  // Top contribuidores
  const topContributorsRaw = await this.activityLibraryRepository
        .createQueryBuilder('library')
        .leftJoinAndSelect('library.author', 'author')
        .select('author.id', 'userId')
        .addSelect('author.firstName', 'firstName')
        .addSelect('author.lastName', 'lastName')
        .addSelect('COUNT(*)', 'activitiesShared')
        .addSelect('AVG(library.averageRating)', 'avgRating')
        .addSelect('SUM(library.totalCopies)', 'totalCopies')
        .where('library.isActive = :isActive', { isActive: true })
        .andWhere('library.visibility IN (:...visibilities)', { 
          visibilities: [ActivityVisibility.PUBLIC, ActivityVisibility.FEATURED] 
        })
        .groupBy('author.id, author.firstName, author.lastName')
        .orderBy('COUNT(*)', 'DESC')
        .addOrderBy('AVG(library.averageRating)', 'DESC')
        .take(5)
        .getRawMany();

      const topRatedActivities = topRatedActivitiesEntities.map(activity => this.buildActivitySummary(activity));
      const mostCopiedActivities = mostCopiedActivitiesEntities.map(activity => this.buildActivitySummary(activity));
      const topContributors = topContributorsRaw.map(contributor => this.mapContributorRecord(contributor));

      return {
        totalPublicActivities,
        activitiesByCategory,
        activitiesByDifficulty,
        topRatedActivities,
        mostCopiedActivities,
        topContributors
      };

    } catch (error) {
      throw new BadRequestException(`Error al obtener estadísticas: ${error.message}`);
    }
  }

  // =====================================
  // MÉTODOS AUXILIARES PRIVADOS
  // =====================================

  private buildActivitySummary(activity: ActivityLibrary): Record<string, unknown> {
    const author = activity.author
      ? {
          id: activity.author.id,
          firstName: activity.author.firstName,
          lastName: activity.author.lastName,
        }
      : null;

    return {
      id: activity.id,
      publicTitle: activity.publicTitle,
      averageRating: Number(activity.averageRating ?? 0),
      totalRatings: activity.totalRatings ?? 0,
      totalCopies: activity.totalCopies ?? 0,
      totalViews: activity.totalViews ?? 0,
      authorId: activity.authorId,
      originalActivityId: activity.originalActivityId,
      visibility: activity.visibility,
      category: activity.category,
      difficultyLevel: activity.difficultyLevel,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
      author,
    };
  }

  private mapContributorRecord(contributor: Record<string, unknown>): Record<string, unknown> {
    const activitiesShared = Number(contributor['activitiesShared'] ?? 0);
    const avgRating = contributor['avgRating'];
    const totalCopies = Number(contributor['totalCopies'] ?? 0);

    return {
      userId: contributor['userId'],
      firstName: contributor['firstName'],
      lastName: contributor['lastName'],
      activitiesShared,
      avgRating: avgRating !== undefined && avgRating !== null ? Number(avgRating) : null,
      totalCopies,
    };
  }

  /**
   * Valida que los rangos de edad y estudiantes sean coherentes
   * Implementa lógica de negocio para validación de datos
   * 
   * @private
   * @param data - Objeto con datos a validar
   * @throws BadRequestException si los rangos no son válidos
   */
  private validateRanges(data: RangeValidatable): void {
    // Validar rango de edades
    if (data.recommendedAgeMin && data.recommendedAgeMax) {
      if (data.recommendedAgeMin > data.recommendedAgeMax) {
        throw new BadRequestException('La edad mínima no puede ser mayor que la edad máxima');
      }
    }

    // Validar rango de estudiantes
    if (data.recommendedStudentsMin && data.recommendedStudentsMax) {
      if (data.recommendedStudentsMin > data.recommendedStudentsMax) {
        throw new BadRequestException('El número mínimo de estudiantes no puede ser mayor que el máximo');
      }
    }
  }

  /**
   * Aplica filtros a un query builder de biblioteca de actividades
   * Centraliza la lógica de filtrado para reutilización
   * 
   * @private
   * @param queryBuilder - Query builder a modificar
   * @param filters - Filtros a aplicar
   */
  private applyFiltersToQuery(
    queryBuilder: SelectQueryBuilder<ActivityLibrary>, 
    filters: ActivityLibraryFilterDto
  ): void {
    // Filtro de búsqueda por texto
    if (filters.search) {
      queryBuilder.andWhere(
        '(LOWER(library.publicTitle) LIKE LOWER(:search) OR LOWER(library.publicDescription) LIKE LOWER(:search))',
        { search: `%${filters.search}%` }
      );
    }

    // Filtro por categoría
    if (filters.category) {
      queryBuilder.andWhere('library.category = :category', { category: filters.category });
    }

    // Filtro por dificultad
    if (filters.difficultyLevel) {
      queryBuilder.andWhere('library.difficultyLevel = :difficulty', { difficulty: filters.difficultyLevel });
    }

    // Filtro por visibilidad
    if (filters.visibility) {
      queryBuilder.andWhere('library.visibility = :visibility', { visibility: filters.visibility });
    }

    // Filtro por edad objetivo
    if (filters.targetAge) {
      queryBuilder.andWhere(
        '((library.recommendedAgeMin IS NULL OR library.recommendedAgeMin <= :targetAge) AND ' +
        '(library.recommendedAgeMax IS NULL OR library.recommendedAgeMax >= :targetAge))',
        { targetAge: filters.targetAge }
      );
    }

    // Filtro por duración máxima
    if (filters.maxDuration) {
      queryBuilder.andWhere(
        '(library.estimatedDurationMinutes IS NULL OR library.estimatedDurationMinutes <= :maxDuration)',
        { maxDuration: filters.maxDuration }
      );
    }

    // Filtro por puntuación mínima
    if (filters.minRating) {
      queryBuilder.andWhere('library.averageRating >= :minRating', { minRating: filters.minRating });
    }

    // Filtro por autor
    if (filters.authorId) {
      queryBuilder.andWhere('library.authorId = :authorId', { authorId: filters.authorId });
    }

    // Filtro solo destacadas
    if (filters.onlyFeatured) {
      queryBuilder.andWhere('library.isFeatured = :featured', { featured: true });
    }

    // Filtro por etiquetas
    if (filters.tags && filters.tags.length > 0) {
      queryBuilder.andWhere(
        'EXISTS (SELECT 1 FROM activity_tags tag WHERE tag.libraryActivityId = library.id AND tag.tagName IN (:...tags) AND tag.isActive = true)',
        { tags: filters.tags }
      );
    }
  }

  /**
   * Obtiene el campo válido para ordenamiento
   * Previene inyección SQL y mapea campos permitidos
   * 
   * @private
   * @param sortBy - Campo solicitado para ordenamiento
   * @returns Campo válido para la consulta
   */
  private getSortField(sortBy?: string): string {
    const allowedFields = {
      'createdAt': 'createdAt',
      'averageRating': 'averageRating',
      'totalRatings': 'totalRatings',
      'totalCopies': 'totalCopies',
      'totalViews': 'totalViews',
      'publicTitle': 'publicTitle'
    };

    return allowedFields[sortBy] || 'createdAt';
  }

  /**
   * Construye el resultado paginado estándar
   * Estandariza la estructura de respuestas paginadas
   * 
   * @private
   * @param items - Elementos de la página actual
   * @param total - Total de elementos disponibles
   * @param page - Página actual
   * @param limit - Elementos por página
   * @returns Resultado paginado estructurado
   */
  private buildPaginatedResult<T>(
    items: T[], 
    total: number, 
    page: number, 
    limit: number
  ): PaginatedResult<T> {
    const totalPages = Math.ceil(total / limit);
    
    return {
      items,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrevious: page > 1
    };
  }

  /**
   * Crea etiquetas para una actividad de biblioteca
   * Gestiona la creación inicial de tags
   * 
   * @private
   * @param libraryActivityId - ID de la actividad
   * @param tagNames - Nombres de las etiquetas a crear
   */
  private async createTagsForActivity(libraryActivityId: string, tagNames: string[]): Promise<void> {
    const tags = tagNames.map(tagName => 
      this.activityTagRepository.create({
        libraryActivityId,
        tagName: tagName.toLowerCase().trim(),
        color: ActivityTag.getRandomColor(),
        isActive: true,
        createdAt: new Date()
      })
    );

    await this.activityTagRepository.save(tags);
  }

  /**
   * Actualiza las etiquetas de una actividad
   * Gestiona la modificación de tags existentes
   * 
   * @private
   * @param libraryActivityId - ID de la actividad
   * @param newTagNames - Nuevos nombres de etiquetas
   */
  private async updateActivityTags(libraryActivityId: string, newTagNames: string[]): Promise<void> {
    // Desactivar etiquetas existentes
    await this.activityTagRepository.update(
      { libraryActivityId, isActive: true },
      { isActive: false }
    );

    // Crear nuevas etiquetas
    if (newTagNames.length > 0) {
      await this.createTagsForActivity(libraryActivityId, newTagNames);
    }
  }

  /**
   * Incrementa el contador de vistas para múltiples actividades
   * Optimiza las actualizaciones de vistas en lote
   * 
   * @private
   * @param activityIds - IDs de las actividades a actualizar
   */
  private async incrementViewsForActivities(activityIds: string[]): Promise<void> {
    if (activityIds.length === 0) return;

    await this.activityLibraryRepository
      .createQueryBuilder()
      .update(ActivityLibrary)
      .set({ totalViews: () => 'totalViews + 1' })
      .where('id IN (:...ids)', { ids: activityIds })
      .execute();
  }
}