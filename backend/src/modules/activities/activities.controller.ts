import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { CompleteActivityDto } from './dto/complete-activity.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Activity, ActivityType, DifficultyLevel } from './activity.entity';

/**
 * Controlador para la gestión de actividades educativas
 * Maneja todas las operaciones relacionadas con actividades, completamientos y evaluaciones
 */
@ApiTags('activities')
@Controller('activities')
@UseGuards(JwtAuthGuard) // Protege todas las rutas con autenticación JWT
@ApiBearerAuth()
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  /**
   * Crea una nueva actividad (solo docentes)
   */
  @Post()
  @ApiOperation({ summary: 'Crear una nueva actividad educativa' })
  @ApiResponse({
    status: 201,
    description: 'Actividad creada exitosamente',
    type: Activity,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo los docentes pueden crear actividades',
  })
  @ApiResponse({
    status: 404,
    description: 'Aula no encontrada',
  })
  async create(
    @Body() createActivityDto: CreateActivityDto,
    @Request() req,
  ): Promise<Activity> {
    return this.activitiesService.create(createActivityDto, req.user.id);
  }

  /**
   * Obtiene todas las actividades con filtros y paginación
   */
  @Get()
  @ApiOperation({ summary: 'Obtener lista de actividades' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página' })
  @ApiQuery({ name: 'classroomId', required: false, type: String, description: 'Filtrar por aula' })
  @ApiQuery({ name: 'type', required: false, enum: ActivityType, description: 'Filtrar por tipo' })
  @ApiQuery({ name: 'difficulty', required: false, enum: DifficultyLevel, description: 'Filtrar por dificultad' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Buscar por título o descripción' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filtrar por estado activo' })
  @ApiResponse({
    status: 200,
    description: 'Lista de actividades obtenida exitosamente',
    type: [Activity],
  })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('classroomId') classroomId?: string,
    @Query('type') type?: ActivityType,
    @Query('difficulty') difficulty?: DifficultyLevel,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
    @Request() req?,
  ) {
    // Validación de parámetros de paginación
    const pageNumber = Math.max(1, Number(page));
    const limitNumber = Math.min(50, Math.max(1, Number(limit)));

    return this.activitiesService.findAll({
      page: pageNumber,
      limit: limitNumber,
      classroomId,
      type,
      difficulty,
      search,
      isActive,
      userId: req.user.id,
    });
  }

  /**
   * Obtiene las actividades de un aula específica
   */
  @Get('classroom/:classroomId')
  @ApiOperation({ summary: 'Obtener actividades de un aula específica' })
  @ApiResponse({
    status: 200,
    description: 'Actividades del aula obtenidas exitosamente',
    type: [Activity],
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes acceso a esta aula',
  })
  @ApiResponse({
    status: 404,
    description: 'Aula no encontrada',
  })
  async getClassroomActivities(
    @Param('classroomId', ParseUUIDPipe) classroomId: string,
    @Request() req,
  ) {
    const result = await this.activitiesService.getClassroomActivities(classroomId, req.user.id);
    return result; // getClassroomActivities devuelve Activity[] directamente
  }

  /**
   * Obtiene una actividad específica por su ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Obtener actividad por ID' })
  @ApiResponse({
    status: 200,
    description: 'Actividad encontrada exitosamente',
    type: Activity,
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes acceso a esta actividad',
  })
  @ApiResponse({
    status: 404,
    description: 'Actividad no encontrada',
  })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
  ): Promise<Activity> {
    return this.activitiesService.findById(id, req.user.id);
  }

  /**
   * Actualiza una actividad (solo creador o admin)
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar actividad' })
  @ApiResponse({
    status: 200,
    description: 'Actividad actualizada exitosamente',
    type: Activity,
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permisos para actualizar esta actividad',
  })
  @ApiResponse({
    status: 404,
    description: 'Actividad no encontrada',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateActivityDto: UpdateActivityDto,
    @Request() req,
  ): Promise<Activity> {
    return this.activitiesService.update(id, updateActivityDto, req.user.id);
  }

  /**
   * Elimina (desactiva) una actividad (solo creador o admin)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar actividad' })
  @ApiResponse({
    status: 204,
    description: 'Actividad eliminada exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes permisos para eliminar esta actividad',
  })
  @ApiResponse({
    status: 404,
    description: 'Actividad no encontrada',
  })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req): Promise<void> {
    await this.activitiesService.remove(id, req.user.id);
  }

  /**
   * Completa una actividad (estudiantes)
   */
  @Post(':id/complete')
  @ApiOperation({ summary: 'Completar una actividad como estudiante' })
  @ApiResponse({
    status: 200,
    description: 'Actividad completada exitosamente',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        score: { type: 'number' },
        attempts: { type: 'number' },
        completedAt: { type: 'string', format: 'date-time' },
        experienceGained: { type: 'number' },
        coinsGained: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos o límite de intentos alcanzado',
  })
  @ApiResponse({
    status: 403,
    description: 'Solo los estudiantes pueden completar actividades',
  })
  @ApiResponse({
    status: 404,
    description: 'Actividad no encontrada',
  })
  async completeActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() completeActivityDto: CompleteActivityDto,
    @Request() req,
  ) {
    const completion = await this.activitiesService.completeActivity(
      id,
      completeActivityDto,
      req.user.id,
    );

    return {
      id: completion.id,
      score: completion.score,
      attempts: completion.attempts,
      completedAt: completion.completedAt,
      message: '¡Actividad completada exitosamente!',
    };
  }

  /**
   * Obtiene estadísticas de una actividad
   */
  @Get(':id/stats')
  @ApiOperation({ summary: 'Obtener estadísticas de una actividad' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        totalCompletions: { type: 'number' },
        averageScore: { type: 'number' },
        averageAttempts: { type: 'number' },
        completionRate: { type: 'number' },
        topScorers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              user: { type: 'object' },
              score: { type: 'number' },
              completedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'No tienes acceso a las estadísticas de esta actividad',
  })
  @ApiResponse({
    status: 404,
    description: 'Actividad no encontrada',
  })
  async getActivityStats(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.activitiesService.getActivityStats(id, req.user.id);
  }
}
