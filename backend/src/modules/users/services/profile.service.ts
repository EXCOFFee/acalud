/**
 * 👤 SERVICIO DE PERFILES DE USUARIO - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Servicio responsable de la gestión completa de perfiles de usuario:
 * - Creación y actualización de perfiles
 * - Gestión de avatares y personalización
 * - Configuraciones de privacidad
 * - Estadísticas y logros
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Responsabilidad única de gestión de perfiles
 * - OCP: Extensible para nuevas funcionalidades de perfil
 * - LSP: Implementa contratos bien definidos
 * - ISP: Interfaces específicas por funcionalidad
 * - DIP: Depende de abstracciones (repositories, file service)
 */

import { 
  Injectable, 
  Logger, 
  NotFoundException, 
  ForbiddenException,
  ConflictException,
  InternalServerErrorException 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like } from 'typeorm';
import { UserProfile, ThemeType, PrivacyLevel, Language } from '../entities/user-profile.entity';
import { ProfileAuditOperation } from '../entities/user-profile-audit.entity';
import { User } from '../user.entity';
import { PaginatedResponse } from '../../../common/dto';
import { CreateProfileDto, UpdateProfileDto, ProfileFilterDto, UpdateStatsDto } from '../dto/profile.dto';
import { ProfileAuditService, LogProfileChangeParams } from './profile-audit.service';



/**
 * Interface para resultado de operaciones
 */
export interface ProfileOperationResult {
  success: boolean;
  message: string;
  profile?: UserProfile;
  data?: any;
}

/**
 * Servicio de gestión de perfiles de usuario
 * 
 * @description Este servicio maneja toda la lógica relacionada con perfiles de usuario,
 * incluyendo creación, actualización, personalización y configuraciones de privacidad.
 * 
 * @example
 * ```typescript
 * // Crear perfil
 * const profile = await profileService.createProfile(userId, {
 *   displayName: 'Juan Matemático',
 *   bio: 'Estudiante apasionado por las matemáticas',
 *   theme: ThemeType.DARK
 * });
 * 
 * // Actualizar estadísticas
 * await profileService.updateStats(userId, {
 *   activitiesCompleted: 50,
 *   pointsEarned: 1000
 * });
 * ```
 */
@Injectable()
export class ProfileService {
  /**
   * Logger para registrar operaciones
   */
  private readonly logger = new Logger(ProfileService.name);

  constructor(
    @InjectRepository(UserProfile)
    private readonly profileRepository: Repository<UserProfile>,
    
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    private readonly profileAuditService: ProfileAuditService,
  ) {
    this.logger.log('👤 Servicio de perfiles inicializado');
  }

  /**
   * Crea un nuevo perfil para un usuario
   * 
   * @param userId ID del usuario
   * @param createDto Datos del perfil a crear
   * @returns Promise<ProfileOperationResult> Resultado de la operación
   * 
   * @throws NotFoundException Si el usuario no existe
   * @throws ConflictException Si el usuario ya tiene un perfil
   * 
   * @example
   * ```typescript
   * const result = await profileService.createProfile('user-123', {
   *   displayName: 'Ana García',
   *   bio: 'Profesora de matemáticas',
   *   theme: ThemeType.BLUE
   * });
   * ```
   */
  async createProfile(userId: string, createDto: CreateProfileDto): Promise<ProfileOperationResult> {
    this.logger.log(`👤 Creando perfil para usuario: ${userId}`);

    try {
      // 1. Verificar que el usuario existe
      const user = await this.findUserById(userId);
      
      // 2. Verificar que no tenga perfil existente
      const existingProfile = await this.profileRepository.findOne({
        where: { userId }
      });

      if (existingProfile) {
        throw new ConflictException('El usuario ya tiene un perfil creado');
      }

      // 3. Crear el perfil con valores por defecto
      const profile = this.profileRepository.create({
        userId,
        user,
        displayName: createDto.displayName || user.name,
        bio: createDto.bio,
        birthDate: createDto.birthDate,
        location: createDto.location,
        website: createDto.website,
        socialLinks: createDto.socialLinks || {},
        theme: createDto.theme || ThemeType.AUTO,
        language: createDto.language || Language.ES,
        privacyLevel: createDto.privacyLevel || PrivacyLevel.PUBLIC,
        isPublic: true,
        privacySettings: {
          showEmail: false,
          showBirthDate: true,
          showLocation: true,
          showSocialLinks: true,
          showStats: true,
          allowMessages: true,
          allowFriendRequests: true,
        },
        notificationSettings: {
          email: true,
          push: true,
          in_app: true,
          newMessages: true,
          classroomUpdates: true,
          activityReminders: true,
          achievementUnlocked: true,
          friendRequests: true,
          weeklyDigest: false,
        },
        stats: {
          activitiesCompleted: 0,
          classroomsJoined: 0,
          badgesEarned: 0,
          pointsEarned: 0,
          streakDays: 0,
          totalStudyTime: 0,
          averageScore: 0,
          favoritesCount: 0,
          followersCount: 0,
          followingCount: 0,
        },
        featuredAchievements: [],
        customBadges: [],
        profileViews: 0,
        isVerified: false,
        lastProfileUpdate: new Date(),
      });

      const snapshotBefore = {};

      // 4. Guardar el perfil
      const savedProfile = await this.profileRepository.save(profile);

      const snapshotAfter = this.getAuditableSnapshot(savedProfile);
      const changes = this.diffSnapshots(snapshotBefore, snapshotAfter);

      await this.logProfileChangeSafe({
        userId,
        actorUserId: userId,
        operation: ProfileAuditOperation.PROFILE_CREATED,
        snapshotBefore,
        snapshotAfter,
        changes,
      });

      this.logger.log(`✅ Perfil creado exitosamente para usuario: ${userId}`);

      return {
        success: true,
        message: 'Perfil creado exitosamente',
        profile: savedProfile
      };

    } catch (error) {
      this.logger.error(`❌ Error creando perfil: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Error interno creando perfil');
    }
  }

  /**
   * Obtiene el perfil de un usuario
   * 
   * @param userId ID del usuario
   * @param viewerUserId ID del usuario que está viendo el perfil (opcional)
   * @returns Promise<UserProfile> Perfil del usuario
   * 
   * @throws NotFoundException Si el perfil no existe
   * @throws ForbiddenException Si no tiene permisos para ver el perfil
   */
  async getProfile(userId: string, viewerUserId?: string): Promise<UserProfile> {
    this.logger.log(`👁️ Obteniendo perfil de usuario: ${userId}`);

    try {
      const profile = await this.profileRepository.findOne({
        where: { userId },
        relations: ['user']
      });

      if (!profile) {
        throw new NotFoundException('Perfil no encontrado');
      }

      // Verificar permisos de visualización
      if (!profile.canBeViewedBy(viewerUserId)) {
        throw new ForbiddenException('No tienes permisos para ver este perfil');
      }

      // Incrementar contador de vistas (solo si no es el propio usuario)
      if (viewerUserId && viewerUserId !== userId) {
        profile.incrementViews();
        await this.profileRepository.save(profile);
      }

      this.logger.log(`✅ Perfil obtenido exitosamente: ${userId}`);
      return profile;

    } catch (error) {
      this.logger.error(`❌ Error obteniendo perfil: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Error interno obteniendo perfil');
    }
  }

  /**
   * Actualiza el perfil de un usuario
   * 
   * @param userId ID del usuario
   * @param updateDto Datos a actualizar
   * @param updaterUserId ID del usuario que actualiza (debe ser el mismo)
   * @returns Promise<ProfileOperationResult> Resultado de la operación
   * 
   * @throws NotFoundException Si el perfil no existe
   * @throws ForbiddenException Si no tiene permisos para actualizar
   */
  async updateProfile(
    userId: string, 
    updateDto: UpdateProfileDto,
    updaterUserId: string
  ): Promise<ProfileOperationResult> {
    this.logger.log(`✏️ Actualizando perfil de usuario: ${userId}`);

    try {
      // Verificar permisos (solo el propio usuario puede actualizar)
      if (userId !== updaterUserId) {
        throw new ForbiddenException('Solo puedes actualizar tu propio perfil');
      }

      const profile = await this.profileRepository.findOne({
        where: { userId },
        relations: ['user']
      });

      if (!profile) {
        throw new NotFoundException('Perfil no encontrado');
      }

      const snapshotBefore = this.getAuditableSnapshot(profile);

      // Actualizar campos básicos
      if (updateDto.displayName !== undefined) {
        profile.displayName = updateDto.displayName;
      }
      if (updateDto.bio !== undefined) {
        profile.bio = updateDto.bio;
      }
      if (updateDto.birthDate !== undefined) {
        profile.birthDate = updateDto.birthDate;
      }
      if (updateDto.location !== undefined) {
        profile.location = updateDto.location;
      }
      if (updateDto.website !== undefined) {
        profile.website = updateDto.website;
      }
      if (updateDto.socialLinks !== undefined) {
        profile.socialLinks = { ...profile.socialLinks, ...updateDto.socialLinks };
      }

      // Actualizar configuraciones de UI
      if (updateDto.theme !== undefined) {
        profile.theme = updateDto.theme;
      }
      if (updateDto.language !== undefined) {
        profile.language = updateDto.language;
      }
      if (updateDto.primaryColor !== undefined) {
        profile.primaryColor = updateDto.primaryColor;
      }
      if (updateDto.fontSettings !== undefined) {
        profile.fontSettings = updateDto.fontSettings;
      }

      // Actualizar configuraciones de privacidad
      if (updateDto.privacyLevel !== undefined) {
        profile.privacyLevel = updateDto.privacyLevel;
      }
      if (updateDto.privacySettings !== undefined) {
        profile.privacySettings = { ...profile.privacySettings, ...updateDto.privacySettings };
      }

      // Actualizar configuraciones de notificaciones
      if (updateDto.notificationSettings !== undefined) {
        profile.notificationSettings = { ...profile.notificationSettings, ...updateDto.notificationSettings };
      }

      // Actualizar configuraciones de accesibilidad
      if (updateDto.accessibilitySettings !== undefined) {
        profile.accessibilitySettings = { ...profile.accessibilitySettings, ...updateDto.accessibilitySettings };
      }

      // Actualizar timestamp
      profile.lastProfileUpdate = new Date();

      // Guardar cambios
      const updatedProfile = await this.profileRepository.save(profile);

      const snapshotAfter = this.getAuditableSnapshot(updatedProfile);
      const changes = this.diffSnapshots(snapshotBefore, snapshotAfter);

      if (Object.keys(changes).length > 0) {
        await this.logProfileChangeSafe({
          userId,
          actorUserId: updaterUserId,
          operation: ProfileAuditOperation.PROFILE_UPDATED,
          snapshotBefore,
          snapshotAfter,
          changes,
        });
      }

      this.logger.log(`✅ Perfil actualizado exitosamente: ${userId}`);

      return {
        success: true,
        message: 'Perfil actualizado exitosamente',
        profile: updatedProfile
      };

    } catch (error) {
      this.logger.error(`❌ Error actualizando perfil: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Error interno actualizando perfil');
    }
  }

  /**
   * Actualiza las estadísticas del perfil
   * 
   * @param userId ID del usuario
   * @param stats Estadísticas a actualizar
   * @returns Promise<ProfileOperationResult> Resultado de la operación
   * 
   * @example
   * ```typescript
   * await profileService.updateStats('user-123', {
   *   activitiesCompleted: 25,
   *   pointsEarned: 500,
   *   streakDays: 7
   * });
   * ```
   */
  async updateStats(userId: string, stats: UpdateStatsDto): Promise<ProfileOperationResult> {
    this.logger.log(`📊 Actualizando estadísticas de usuario: ${userId}`);

    try {
      const profile = await this.profileRepository.findOne({
        where: { userId }
      });

      if (!profile) {
        // Si no existe perfil, crear uno básico
        const user = await this.findUserById(userId);
        const newProfile = await this.createProfile(userId, {});
        if (newProfile.profile) {
          newProfile.profile.updateStats(stats);
          await this.profileRepository.save(newProfile.profile);

          const snapshotAfter = this.getAuditableSnapshot(newProfile.profile);
          await this.logProfileChangeSafe({
            userId,
            actorUserId: userId,
            operation: ProfileAuditOperation.STATS_UPDATED,
            snapshotBefore: {},
            snapshotAfter,
            changes: this.diffSnapshots({}, snapshotAfter),
            metadata: { origin: 'updateStats' },
          });
        }
        
        return {
          success: true,
          message: 'Perfil creado y estadísticas actualizadas'
        };
      }

      const snapshotBefore = this.getAuditableSnapshot(profile);

      // Actualizar estadísticas
      profile.updateStats(stats);
      const updatedProfile = await this.profileRepository.save(profile);

      const snapshotAfter = this.getAuditableSnapshot(updatedProfile);
      const changes = this.diffSnapshots(snapshotBefore, snapshotAfter);

      if (Object.keys(changes).length > 0) {
        await this.logProfileChangeSafe({
          userId,
          actorUserId: userId,
          operation: ProfileAuditOperation.STATS_UPDATED,
          snapshotBefore,
          snapshotAfter,
          changes,
          metadata: { origin: 'updateStats' },
        });
      }

      this.logger.log(`✅ Estadísticas actualizadas exitosamente: ${userId}`);

      return {
        success: true,
        message: 'Estadísticas actualizadas exitosamente'
      };

    } catch (error) {
      this.logger.error(`❌ Error actualizando estadísticas: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error interno actualizando estadísticas');
    }
  }

  /**
   * Busca perfiles públicos
   * 
   * @param filters Filtros de búsqueda
   * @returns Promise<PaginatedResponse<UserProfile>> Perfiles encontrados
   */
  async searchProfiles(filters: ProfileFilterDto): Promise<PaginatedResponse<UserProfile>> {
    this.logger.log(`🔍 Buscando perfiles con filtros:`, filters);

    try {
      const queryBuilder = this.profileRepository
        .createQueryBuilder('profile')
        .leftJoinAndSelect('profile.user', 'user')
        .where('profile.isPublic = :isPublic', { isPublic: true })
        .andWhere('profile.privacyLevel = :privacyLevel', { privacyLevel: PrivacyLevel.PUBLIC });

      // Aplicar filtros
      if (filters.displayName) {
        queryBuilder.andWhere('profile.displayName ILIKE :displayName', {
          displayName: `%${filters.displayName}%`
        });
      }

      if (filters.location) {
        queryBuilder.andWhere('profile.location ILIKE :location', {
          location: `%${filters.location}%`
        });
      }

      if (filters.isVerified !== undefined) {
        queryBuilder.andWhere('profile.isVerified = :isVerified', {
          isVerified: filters.isVerified
        });
      }

      if (filters.theme) {
        queryBuilder.andWhere('profile.theme = :theme', { theme: filters.theme });
      }

      if (filters.language) {
        queryBuilder.andWhere('profile.language = :language', { language: filters.language });
      }

      if (filters.minLevel) {
        queryBuilder.andWhere('user.level >= :minLevel', { minLevel: filters.minLevel });
      }

      if (filters.hasAvatar !== undefined) {
        if (filters.hasAvatar) {
          queryBuilder.andWhere('profile.avatarUrl IS NOT NULL');
        } else {
          queryBuilder.andWhere('profile.avatarUrl IS NULL');
        }
      }

      // Aplicar paginación y ordenamiento
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'DESC';
      const offset = (filters.page - 1) * filters.limit;
      
      queryBuilder
        .orderBy(`profile.${sortBy}`, sortOrder)
        .skip(offset)
        .take(filters.limit);

      // Ejecutar consulta
      const [profiles, total] = await queryBuilder.getManyAndCount();

      this.logger.log(`✅ Encontrados ${profiles.length} perfiles de ${total} total`);

      return {
        data: profiles,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          totalPages: Math.ceil(total / filters.limit),
          hasNext: filters.page < Math.ceil(total / filters.limit),
          hasPrev: filters.page > 1
        }
      };

    } catch (error) {
      this.logger.error(`❌ Error buscando perfiles: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error interno buscando perfiles');
    }
  }

  /**
   * Elimina un perfil de usuario
   * 
   * @param userId ID del usuario
   * @param deleterUserId ID del usuario que elimina (debe ser el mismo o admin)
   * @returns Promise<ProfileOperationResult> Resultado de la operación
   * 
   * @throws NotFoundException Si el perfil no existe
   * @throws ForbiddenException Si no tiene permisos
   */
  async deleteProfile(userId: string, deleterUserId: string): Promise<ProfileOperationResult> {
    this.logger.log(`🗑️ Eliminando perfil de usuario: ${userId}`);

    try {
      // TODO: Verificar si es admin cuando esté implementado el sistema de roles
      if (userId !== deleterUserId) {
        throw new ForbiddenException('Solo puedes eliminar tu propio perfil');
      }

      const profile = await this.profileRepository.findOne({
        where: { userId }
      });

      if (!profile) {
        throw new NotFoundException('Perfil no encontrado');
      }

      await this.profileRepository.remove(profile);

      this.logger.log(`✅ Perfil eliminado exitosamente: ${userId}`);

      return {
        success: true,
        message: 'Perfil eliminado exitosamente'
      };

    } catch (error) {
      this.logger.error(`❌ Error eliminando perfil: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      
      throw new InternalServerErrorException('Error interno eliminando perfil');
    }
  }

  // =============================================================================
  // MÉTODOS PRIVADOS
  // =============================================================================

  /**
   * Busca un usuario por ID
   * 
   * @private
   * @param userId ID del usuario
   * @returns Promise<User> Usuario encontrado
   * @throws NotFoundException Si el usuario no existe
   */
  private async findUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  /**
   * Obtiene una instantánea con los campos relevantes para auditoría.
   */
  private getAuditableSnapshot(profile?: UserProfile | null): Record<string, unknown> {
    if (!profile) {
      return {};
    }

    const clone = <T>(value: T): T => {
      if (value === null || value === undefined) {
        return value;
      }
      return JSON.parse(JSON.stringify(value));
    };

    return {
      displayName: profile.displayName ?? null,
      bio: profile.bio ?? null,
      location: profile.location ?? null,
      website: profile.website ?? null,
      socialLinks: clone(profile.socialLinks) ?? null,
      theme: profile.theme ?? null,
      language: profile.language ?? null,
      privacyLevel: profile.privacyLevel ?? null,
      privacySettings: clone(profile.privacySettings) ?? null,
      notificationSettings: clone(profile.notificationSettings) ?? null,
      accessibilitySettings: clone(profile.accessibilitySettings) ?? null,
      stats: clone(profile.stats) ?? null,
      isPublic: profile.isPublic ?? null,
      primaryColor: profile.primaryColor ?? null,
      avatarUrl: profile.avatarUrl ?? null,
      coverImageUrl: profile.coverImageUrl ?? null,
      featuredAchievements: clone(profile.featuredAchievements) ?? [],
      customBadges: clone(profile.customBadges) ?? [],
    };
  }

  /**
   * Calcula el diff entre dos snapshots.
   */
  private diffSnapshots(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): Record<string, { previous: unknown; current: unknown }> {
    const changes: Record<string, { previous: unknown; current: unknown }> = {};
    const keys = new Set([
      ...Object.keys(before ?? {}),
      ...Object.keys(after ?? {}),
    ]);

    for (const key of keys) {
      const previous = before?.[key];
      const current = after?.[key];

      if (!this.areValuesDeepEqual(previous, current)) {
        changes[key] = {
          previous: previous ?? null,
          current: current ?? null,
        };
      }
    }

    return changes;
  }

  private areValuesDeepEqual(a: unknown, b: unknown): boolean {
    return this.serializeValue(a) === this.serializeValue(b);
  }

  private serializeValue(value: unknown): string {
    const normalize = (input: unknown): unknown => {
      if (input === undefined || input === null) {
        return null;
      }
      if (input instanceof Date) {
        return input.toISOString();
      }
      if (Array.isArray(input)) {
        return input.map(item => normalize(item));
      }
      if (typeof input === 'object') {
        const sortedKeys = Object.keys(input as Record<string, unknown>).sort();
        return sortedKeys.reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = normalize((input as Record<string, unknown>)[key]);
          return acc;
        }, {});
      }
      return input;
    };

    return JSON.stringify(normalize(value));
  }

  private async logProfileChangeSafe(params: LogProfileChangeParams): Promise<void> {
    try {
      await this.profileAuditService.logProfileChange(params);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`No se pudo registrar la auditoría de perfil: ${message}`);
    }
  }
}