/**
 * 👤 CONTROLADOR DE PERFILES DE USUARIO - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Controlador REST que expone endpoints para gestión de perfiles:
 * - CRUD de perfiles de usuario
 * - Configuraciones de personalización
 * - Búsqueda y filtrado de perfiles
 * - Gestión de privacidad
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Responsabilidad única de manejar requests de perfiles
 * - OCP: Extensible para nuevos endpoints
 * - LSP: Implementa correctamente el patrón de controlador
 * - ISP: Endpoints específicos y bien definidos
 * - DIP: Depende de abstracciones (services, DTOs)
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ProfileService } from '../services/profile.service';
import { CreateProfileDto, UpdateProfileDto, ProfileFilterDto, UpdateStatsDto } from '../dto/profile.dto';
import { UserProfile, ThemeType, PrivacyLevel } from '../entities/user-profile.entity';

/**
 * Controlador de perfiles de usuario
 * 
 * @description Maneja todas las operaciones REST relacionadas con perfiles de usuario,
 * incluyendo creación, actualización, búsqueda y configuraciones de privacidad.
 * 
 * @example
 * ```
 * GET /api/users/profiles/me - Obtener perfil propio
 * PUT /api/users/profiles/me - Actualizar perfil propio
 * GET /api/users/profiles/:userId - Ver perfil de otro usuario
 * POST /api/users/profiles - Crear perfil
 * ```
 */
@ApiTags('User Profiles')
@Controller('users/profiles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // =============================================================================
  // ENDPOINTS DE PERFIL PROPIO
  // =============================================================================

  @ApiOperation({ 
    summary: 'Crear perfil de usuario',
    description: 'Crea un nuevo perfil para el usuario autenticado. Solo se puede crear un perfil por usuario.'
  })
  @ApiResponse({
    status: 201,
    description: 'Perfil creado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Perfil creado exitosamente' },
        profile: {
          type: 'object',
          description: 'Datos del perfil creado'
        }
      }
    }
  })
  @ApiResponse({
    status: 409,
    description: 'El usuario ya tiene un perfil creado'
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado'
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ transform: true }))
  async createProfile(
    @Body() createDto: CreateProfileDto,
    @Request() req: any
  ) {
    return this.profileService.createProfile(req.user.id, createDto);
  }

  @ApiOperation({ 
    summary: 'Obtener perfil propio',
    description: 'Obtiene el perfil completo del usuario autenticado, incluyendo todas las configuraciones y estadísticas.'
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil obtenido exitosamente',
    type: UserProfile
  })
  @ApiResponse({
    status: 404,
    description: 'Perfil no encontrado'
  })
  @Get('me')
  async getMyProfile(@Request() req: any): Promise<UserProfile> {
    return this.profileService.getProfile(req.user.id, req.user.id);
  }

  @ApiOperation({ 
    summary: 'Actualizar perfil propio',
    description: 'Actualiza el perfil del usuario autenticado. Solo el propietario puede actualizar su perfil.'
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil actualizado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Perfil actualizado exitosamente' },
        profile: {
          type: 'object',
          description: 'Perfil actualizado'
        }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Perfil no encontrado'
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permisos para actualizar este perfil'
  })
  @Put('me')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateMyProfile(
    @Body() updateDto: UpdateProfileDto,
    @Request() req: any
  ) {
    return this.profileService.updateProfile(req.user.id, updateDto, req.user.id);
  }

  @ApiOperation({ 
    summary: 'Eliminar perfil propio',
    description: 'Elimina permanentemente el perfil del usuario autenticado. Esta acción no se puede deshacer.'
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil eliminado exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Perfil eliminado exitosamente' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Perfil no encontrado'
  })
  @Delete('me')
  async deleteMyProfile(@Request() req: any) {
    return this.profileService.deleteProfile(req.user.id, req.user.id);
  }

  // =============================================================================
  // ENDPOINTS DE PERFILES DE OTROS USUARIOS
  // =============================================================================

  @ApiOperation({ 
    summary: 'Obtener perfil de usuario',
    description: 'Obtiene el perfil público de otro usuario. La información mostrada depende de las configuraciones de privacidad del usuario.'
  })
  @ApiParam({
    name: 'userId',
    description: 'ID único del usuario',
    type: 'string',
    format: 'uuid'
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil obtenido exitosamente',
    type: UserProfile
  })
  @ApiResponse({
    status: 404,
    description: 'Perfil no encontrado'
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permisos para ver este perfil'
  })
  @Get(':userId')
  async getProfile(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Request() req: any
  ): Promise<UserProfile> {
    return this.profileService.getProfile(userId, req.user.id);
  }

  // =============================================================================
  // ENDPOINTS DE BÚSQUEDA Y EXPLORACIÓN
  // =============================================================================

  @ApiOperation({ 
    summary: 'Buscar perfiles públicos',
    description: 'Busca perfiles públicos usando diversos filtros. Solo retorna perfiles con configuración pública.'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número de página (empezando en 1)',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Elementos por página (máximo 100)',
    example: 10
  })
  @ApiQuery({
    name: 'displayName',
    required: false,
    type: String,
    description: 'Buscar por nombre para mostrar'
  })
  @ApiQuery({
    name: 'location',
    required: false,
    type: String,
    description: 'Buscar por ubicación'
  })
  @ApiQuery({
    name: 'isVerified',
    required: false,
    type: Boolean,
    description: 'Filtrar por usuarios verificados'
  })
  @ApiQuery({
    name: 'hasAvatar',
    required: false,
    type: Boolean,
    description: 'Filtrar por usuarios con avatar personalizado'
  })
  @ApiQuery({
    name: 'minLevel',
    required: false,
    type: Number,
    description: 'Nivel mínimo del usuario'
  })
  @ApiResponse({
    status: 200,
    description: 'Perfiles encontrados exitosamente',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/UserProfile' }
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            total: { type: 'number', example: 150 },
            totalPages: { type: 'number', example: 15 },
            hasNext: { type: 'boolean', example: true },
            hasPrev: { type: 'boolean', example: false }
          }
        }
      }
    }
  })
  @Get()
  async searchProfiles(@Query() filters: ProfileFilterDto) {
    return this.profileService.searchProfiles(filters);
  }

  // =============================================================================
  // ENDPOINTS DE ESTADÍSTICAS
  // =============================================================================

  @ApiOperation({ 
    summary: 'Actualizar estadísticas de perfil',
    description: 'Actualiza las estadísticas del perfil del usuario autenticado. Usado internamente por el sistema de gamificación.'
  })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas actualizadas exitosamente',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Estadísticas actualizadas exitosamente' }
      }
    }
  })
  @Put('me/stats')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateMyStats(
    @Body() stats: UpdateStatsDto,
    @Request() req: any
  ) {
    return this.profileService.updateStats(req.user.id, stats);
  }

  // =============================================================================
  // ENDPOINTS DE CONFIGURACIÓN ESPECÍFICA
  // =============================================================================

  @ApiOperation({ 
    summary: 'Actualizar configuraciones de privacidad',
    description: 'Actualiza solo las configuraciones de privacidad del perfil del usuario autenticado.'
  })
  @ApiResponse({
    status: 200,
    description: 'Configuraciones de privacidad actualizadas exitosamente'
  })
  @Put('me/privacy')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updatePrivacySettings(
    @Body() privacySettings: {
      privacyLevel?: PrivacyLevel;
      privacySettings?: {
        showEmail?: boolean;
        showBirthDate?: boolean;
        showLocation?: boolean;
        showSocialLinks?: boolean;
        showStats?: boolean;
        allowMessages?: boolean;
        allowFriendRequests?: boolean;
      };
    },
    @Request() req: any
  ) {
    return this.profileService.updateProfile(req.user.id, privacySettings as UpdateProfileDto, req.user.id);
  }

  @ApiOperation({ 
    summary: 'Actualizar configuraciones de notificaciones',
    description: 'Actualiza solo las configuraciones de notificaciones del perfil del usuario autenticado.'
  })
  @ApiResponse({
    status: 200,
    description: 'Configuraciones de notificaciones actualizadas exitosamente'
  })
  @Put('me/notifications')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateNotificationSettings(
    @Body() notificationSettings: {
      email?: boolean;
      push?: boolean;
      in_app?: boolean;
      newMessages?: boolean;
      classroomUpdates?: boolean;
      activityReminders?: boolean;
      achievementUnlocked?: boolean;
      friendRequests?: boolean;
      weeklyDigest?: boolean;
    },
    @Request() req: any
  ) {
    return this.profileService.updateProfile(
      req.user.id, 
      { notificationSettings }, 
      req.user.id
    );
  }

  @ApiOperation({ 
    summary: 'Actualizar configuraciones de accesibilidad',
    description: 'Actualiza solo las configuraciones de accesibilidad del perfil del usuario autenticado.'
  })
  @ApiResponse({
    status: 200,
    description: 'Configuraciones de accesibilidad actualizadas exitosamente'
  })
  @Put('me/accessibility')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateAccessibilitySettings(
    @Body() accessibilitySettings: {
      highContrast?: boolean;
      reducedMotion?: boolean;
      screenReaderOptimized?: boolean;
      keyboardNavigation?: boolean;
    },
    @Request() req: any
  ) {
    return this.profileService.updateProfile(
      req.user.id, 
      { accessibilitySettings }, 
      req.user.id
    );
  }

  @ApiOperation({ 
    summary: 'Actualizar configuraciones de tema',
    description: 'Actualiza solo las configuraciones visuales y de tema del perfil del usuario autenticado.'
  })
  @ApiResponse({
    status: 200,
    description: 'Configuraciones de tema actualizadas exitosamente'
  })
  @Put('me/theme')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateThemeSettings(
    @Body() themeSettings: {
      theme?: ThemeType;
      primaryColor?: string;
      fontSettings?: {
        size: 'small' | 'medium' | 'large';
        family: string;
      };
    },
    @Request() req: any
  ) {
    return this.profileService.updateProfile(
      req.user.id, 
      themeSettings as UpdateProfileDto, 
      req.user.id
    );
  }

  // =============================================================================
  // ENDPOINTS DE LOGROS Y INSIGNIAS
  // =============================================================================

  @ApiOperation({ 
    summary: 'Actualizar logros destacados',
    description: 'Selecciona qué logros mostrar de forma destacada en el perfil público.'
  })
  @ApiResponse({
    status: 200,
    description: 'Logros destacados actualizados exitosamente'
  })
  @Put('me/featured-achievements')
  @UsePipes(new ValidationPipe({ transform: true }))
  async updateFeaturedAchievements(
    @Body() body: { featuredAchievements: string[] },
    @Request() req: any
  ) {
    // TODO: Validar que los logros existen y pertenecen al usuario
    const profile = await this.profileService.getProfile(req.user.id, req.user.id);
    profile.featuredAchievements = body.featuredAchievements.slice(0, 5); // Máximo 5 logros destacados
    
    return this.profileService.updateProfile(
      req.user.id, 
      { featuredAchievements: profile.featuredAchievements } as UpdateProfileDto, 
      req.user.id
    );
  }
}