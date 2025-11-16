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
  ParseUUIDPipe,
  ValidationPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiBody
} from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ActivityLibrary } from '../entities/activity-library.entity';
import { ActivityLibraryService, PaginatedResult } from '../services/activity-library.service';
import {
  CreateActivityLibraryDto,
  UpdateActivityLibraryDto,
  ActivityLibraryFilterDto,
  CreateActivityRatingDto,
  UpdateActivityRatingDto,
  ActivityLibraryResponseDto,
  LibraryStatsDto
} from '../dto/activity-library.dto';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    id: string;
    email?: string;
    role?: string;
  };
}

/**
 * Controlador para la gestión de la Biblioteca de Actividades
 * Implementa todos los endpoints necesarios para los casos de uso:
 * - CU-32: Compartir actividades en biblioteca pública
 * - CU-33: Valorar actividades de otros profesores
 * - CU-34: Copiar actividades de la biblioteca
 * - CU-35: Gestionar mis actividades públicas
 * 
 * @author Sistema de Gestión Educativa AcaLud
 * @version 1.0.0
 */
@ApiTags('Biblioteca de Actividades')
@Controller('activity-library')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ActivityLibraryController {
  constructor(
    private readonly activityLibraryService: ActivityLibraryService,
  ) {}

  // =====================================
  // CU-32: COMPARTIR ACTIVIDADES EN BIBLIOTECA PÚBLICA
  // =====================================

  /**
   * Comparte una actividad del usuario en la biblioteca pública
   * Implementa CU-32: Permite a los profesores compartir sus actividades
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Compartir actividad en biblioteca pública',
    description: 'Permite a un profesor compartir una de sus actividades en la biblioteca pública'
  })
  @ApiBody({ type: CreateActivityLibraryDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Actividad compartida exitosamente',
    type: ActivityLibraryResponseDto
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos inválidos o restricciones no cumplidas'
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Usuario no autorizado (no es profesor)'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Actividad original no encontrada'
  })
  async shareActivity(
    @Request() request: AuthenticatedRequest,
    @Body(ValidationPipe) createDto: CreateActivityLibraryDto,
  ): Promise<ActivityLibraryResponseDto> {
    const result = await this.activityLibraryService.shareActivity(
      request.user.id,
      createDto
    );

    return {
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    };
  }

  /**
   * Actualiza una actividad compartida en la biblioteca
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Actualizar actividad compartida',
    description: 'Permite al autor actualizar su actividad compartida'
  })
  @ApiParam({ name: 'id', description: 'ID de la actividad en biblioteca', type: 'string' })
  @ApiBody({ type: UpdateActivityLibraryDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Actividad actualizada exitosamente',
    type: ActivityLibraryResponseDto
  })
  async updateSharedActivity(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) libraryActivityId: string,
    @Body(ValidationPipe) updateDto: UpdateActivityLibraryDto,
  ): Promise<ActivityLibraryResponseDto> {
    const result = await this.activityLibraryService.updateSharedActivity(
      request.user.id,
      libraryActivityId,
      updateDto
    );

    return {
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    };
  }

  // =====================================
  // CU-33: VALORAR ACTIVIDADES DE OTROS PROFESORES
  // =====================================

  /**
   * Permite valorar una actividad de la biblioteca
   * Implementa CU-33: Sistema de puntuaciones y comentarios
   */
  @Post(':id/rate')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Valorar actividad de la biblioteca',
    description: 'Permite valorar una actividad con puntuación del 1 al 5 y comentario opcional'
  })
  @ApiParam({ name: 'id', description: 'ID de la actividad a valorar', type: 'string' })
  @ApiBody({ type: CreateActivityRatingDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Valoración registrada exitosamente',
    type: ActivityLibraryResponseDto
  })
  async rateActivity(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) libraryActivityId: string,
    @Body(ValidationPipe) ratingDto: CreateActivityRatingDto,
  ): Promise<ActivityLibraryResponseDto> {
    ratingDto.libraryActivityId = libraryActivityId;

    const result = await this.activityLibraryService.rateActivity(
      request.user.id,
      ratingDto
    );

    return {
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    };
  }

  /**
   * Actualiza una valoración existente
   */
  @Put('ratings/:ratingId')
  @ApiOperation({
    summary: 'Actualizar valoración existente',
    description: 'Permite modificar una valoración dentro del tiempo límite'
  })
  @ApiParam({ name: 'ratingId', description: 'ID de la valoración', type: 'string' })
  @ApiBody({ type: UpdateActivityRatingDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Valoración actualizada exitosamente',
    type: ActivityLibraryResponseDto
  })
  async updateRating(
    @Request() request: AuthenticatedRequest,
    @Param('ratingId', ParseUUIDPipe) ratingId: string,
    @Body(ValidationPipe) updateDto: UpdateActivityRatingDto,
  ): Promise<ActivityLibraryResponseDto> {
    const result = await this.activityLibraryService.updateRating(
      request.user.id,
      ratingId,
      updateDto
    );

    return {
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    };
  }

  // =====================================
  // CU-34: COPIAR ACTIVIDADES DE LA BIBLIOTECA
  // =====================================

  /**
   * Copia una actividad de la biblioteca al aula del usuario
   * Implementa CU-34: Permite reutilizar actividades públicas
   */
  @Post(':id/copy')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Copiar actividad a mi aula',
    description: 'Permite copiar una actividad pública a una de las aulas del usuario'
  })
  @ApiParam({ name: 'id', description: 'ID de la actividad a copiar', type: 'string' })
  @ApiQuery({ name: 'classroomId', description: 'ID del aula destino', type: 'string', required: true })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Actividad copiada exitosamente',
    type: ActivityLibraryResponseDto
  })
  async copyActivityToClassroom(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) libraryActivityId: string,
    @Query('classroomId', ParseUUIDPipe) targetClassroomId: string,
  ): Promise<ActivityLibraryResponseDto> {
    const result = await this.activityLibraryService.copyActivityToClassroom(
      request.user.id,
      libraryActivityId,
      targetClassroomId
    );

    return {
      success: result.success,
      message: result.message,
      data: result.data,
      error: result.error
    };
  }

  // =====================================
  // CU-35: GESTIONAR MIS ACTIVIDADES PÚBLICAS
  // =====================================

  /**
   * Obtiene todas las actividades compartidas por el usuario autenticado
   * Implementa CU-35: Gestión de actividades propias compartidas
   */
  @Get('my-activities')
  @ApiOperation({
    summary: 'Obtener mis actividades compartidas',
    description: 'Lista todas las actividades que el usuario ha compartido en la biblioteca'
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Búsqueda en título' })
  @ApiQuery({ name: 'visibility', required: false, description: 'Filtrar por visibilidad' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Campo para ordenar' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Orden ASC/DESC' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de actividades compartidas obtenida exitosamente'
  })
  async getMySharedActivities(
    @Request() request: AuthenticatedRequest,
    @Query(ValidationPipe) filters: ActivityLibraryFilterDto,
  ): Promise<PaginatedResult<ActivityLibrary>> {
    return await this.activityLibraryService.getMySharedActivities(
      request.user.id,
      filters
    );
  }

  /**
   * Elimina (desactiva) una actividad compartida del usuario
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Eliminar actividad compartida',
    description: 'Elimina lógicamente una actividad de la biblioteca'
  })
  @ApiParam({ name: 'id', description: 'ID de la actividad a eliminar', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Actividad eliminada exitosamente',
    type: ActivityLibraryResponseDto
  })
  async removeSharedActivity(
    @Request() request: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) libraryActivityId: string,
  ): Promise<ActivityLibraryResponseDto> {
    const result = await this.activityLibraryService.removeSharedActivity(
      request.user.id,
      libraryActivityId
    );

    return {
      success: result.success,
      message: result.message,
      error: result.error
    };
  }

  // =====================================
  // ENDPOINTS DE BÚSQUEDA Y EXPLORACIÓN
  // =====================================

  /**
   * Busca actividades públicas en la biblioteca
   * Búsqueda avanzada con múltiples filtros para descubrir actividades
   */
  @Get('search')
  @ApiOperation({
    summary: 'Buscar actividades públicas',
    description: 'Busca actividades públicas con múltiples filtros'
  })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Término de búsqueda' })
  @ApiQuery({ name: 'category', required: false, description: 'Categoría de actividad' })
  @ApiQuery({ name: 'difficultyLevel', required: false, description: 'Nivel de dificultad' })
  @ApiQuery({ name: 'targetAge', required: false, type: Number, description: 'Edad objetivo' })
  @ApiQuery({ name: 'maxDuration', required: false, type: Number, description: 'Duración máxima' })
  @ApiQuery({ name: 'minRating', required: false, type: Number, description: 'Puntuación mínima' })
  @ApiQuery({ name: 'tags', required: false, type: String, description: 'Etiquetas' })
  @ApiQuery({ name: 'authorId', required: false, type: String, description: 'ID del autor' })
  @ApiQuery({ name: 'onlyFeatured', required: false, type: Boolean, description: 'Solo destacadas' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Campo para ordenar' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Orden de clasificación' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resultados de búsqueda obtenidos exitosamente'
  })
  async searchPublicActivities(
    @Query(ValidationPipe) filters: ActivityLibraryFilterDto,
  ): Promise<PaginatedResult<ActivityLibrary>> {
    return await this.activityLibraryService.searchPublicActivities(filters);
  }

  /**
   * Obtiene estadísticas generales de la biblioteca
   */
  @Get('stats')
  @ApiOperation({
    summary: 'Obtener estadísticas de la biblioteca',
    description: 'Proporciona métricas y estadísticas generales de la biblioteca'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estadísticas obtenidas exitosamente',
    type: LibraryStatsDto
  })
  async getLibraryStats(): Promise<LibraryStatsDto> {
    return await this.activityLibraryService.getLibraryStats();
  }

  /**
   * Obtiene una actividad específica de la biblioteca con detalles completos
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Obtener detalles de actividad específica',
    description: 'Proporciona información completa de una actividad específica'
  })
  @ApiParam({ name: 'id', description: 'ID de la actividad', type: 'string' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Detalles de actividad obtenidos exitosamente'
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Actividad no encontrada o no disponible públicamente'
  })
  async getActivityDetails(
    @Param('id', ParseUUIDPipe) libraryActivityId: string,
  ): Promise<ActivityLibrary> {
    return await this.activityLibraryService.getPublicActivityDetails(libraryActivityId);
  }
}