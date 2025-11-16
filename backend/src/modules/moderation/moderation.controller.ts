/**
 * 🛡️ CONTROLADOR DE MODERACIÓN - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Maneja todas las peticiones HTTP relacionadas con el sistema de reportes y moderación.
 * Permite a usuarios reportar contenido inapropiado y a administradores gestionar estos reportes.
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Responsabilidad única de manejar requests HTTP de moderación
 * - OCP: Extensible para nuevos tipos de reportes sin modificar existentes
 * - LSP: Implementa correctamente los contratos de NestJS
 * - ISP: Interfaces específicas para cada operación
 * - DIP: Depende de abstracciones (servicios) no de implementaciones
 * 
 * CASOS DE USO CUBIERTOS:
 * - CU-40: Reportar actividad por contenido inapropiado
 * - CU-41: Ver lista de reportes como moderador/admin
 * - CU-42: Gestionar reportes (aprobar/rechazar/resolver)
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
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
  Logger,
  ValidationPipe,
  ParseUUIDPipe,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiExtraModels,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ModerationService } from './moderation.service';
import { Report, ReportStatus, ReportType, ReportSeverity } from './entities/report.entity';
import { CreateReportDto, UpdateReportDto, ReportFilterDto } from './dto';

/**
 * Interfaz para respuestas estándar de la API
 */
interface ApiResponse<T> {
  /** Indica si la operación fue exitosa */
  success: boolean;
  /** Mensaje descriptivo del resultado */
  message: string;
  /** Datos de respuesta */
  data?: T;
  /** Detalles de error (solo si success = false) */
  error?: string;
  /** Timestamp de la respuesta */
  timestamp: Date;
}

/**
 * Controlador para endpoints de moderación y reportes
 * 
 * @description Este controlador maneja todas las operaciones relacionadas con:
 * - Creación de reportes por usuarios (público para usuarios autenticados)
 * - Gestión de reportes por administradores (privado)
 * - Estadísticas y análisis de reportes (privado)
 * 
 * @routes
 * - POST /moderation/reports - Crear reporte (usuarios autenticados)
 * - GET /moderation/reports - Listar reportes (admin)
 * - GET /moderation/reports/:id - Ver reporte específico (admin)
 * - PUT /moderation/reports/:id - Actualizar reporte (admin)
 * - DELETE /moderation/reports/:id - Eliminar reporte (admin)
 * - GET /moderation/reports/my-reports - Ver mis reportes (usuario)
 * - GET /moderation/statistics - Estadísticas (admin)
 * 
 * @example
 * ```typescript
 * // Crear reporte (usuario autenticado)
 * POST /api/v1/moderation/reports
 * Authorization: Bearer <jwt-token>
 * {
 *   "type": "inappropriate_content",
 *   "reason": "Contenido ofensivo",
 *   "description": "La pregunta 3 contiene lenguaje inapropiado...",
 *   "severity": "high",
 *   "reportedActivityId": "123e4567-..."
 * }
 * 
 * // Listar reportes pendientes (admin)
 * GET /api/v1/moderation/reports?status=pending&page=1&limit=10
 * Authorization: Bearer <admin-jwt-token>
 * ```
 */
@ApiTags('Moderation')
@ApiExtraModels(Report)
@Controller('moderation')
@UseGuards(JwtAuthGuard) // Todas las rutas requieren autenticación
@ApiBearerAuth()
export class ModerationController {
  /**
   * Logger para registrar operaciones del controlador
   */
  private readonly logger = new Logger(ModerationController.name);

  constructor(
    private readonly moderationService: ModerationService,
  ) {
    this.logger.log('🛡️ ModerationController inicializado correctamente');
  }

  // =============================================================================
  // ENDPOINTS PARA USUARIOS (CREAR REPORTES)
  // =============================================================================

  /**
   * Crea un nuevo reporte de contenido inapropiado (CU-40)
   * 
   * @description Permite a cualquier usuario autenticado reportar contenido que considere
   * inapropiado. Incluye validaciones anti-spam y límites de reportes por día.
   * 
   * VALIDACIONES:
   * - Usuario autenticado y activo
   * - Contenido reportado existe
   * - No reportar el mismo contenido múltiples veces en 24h
   * - Máximo 10 reportes por usuario por día
   * 
   * @param createReportDto Datos del reporte
   * @param req Request object para obtener usuario, IP y User-Agent
   * @returns Reporte creado
   * 
   * @throws BadRequestException Si los datos son inválidos
   * @throws NotFoundException Si el contenido reportado no existe
   * @throws ConflictException Si se detecta spam o abuso
   * @throws ForbiddenException Si el usuario está suspendido
   * 
   * @example
   * ```bash
   * POST /api/v1/moderation/reports
   * Authorization: Bearer <jwt-token>
   * Content-Type: application/json
   * 
   * {
   *   "type": "inappropriate_content",
   *   "reason": "Contiene lenguaje ofensivo",
   *   "description": "En la pregunta 3 del cuestionario se utilizan términos discriminatorios...",
   *   "severity": "high",
   *   "reportedActivityId": "123e4567-e89b-12d3-a456-426614174000"
   * }
   * ```
   */
  @Post('reports')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Reportar contenido inapropiado (CU-40)',
    description: 'Permite a usuarios reportar actividades con contenido inapropiado, spam, plagio, etc.',
    operationId: 'createReport',
  })
  @ApiBody({
    type: CreateReportDto,
    description: 'Datos del reporte a crear',
    examples: {
      inappropriateContent: {
        summary: 'Contenido inapropiado',
        description: 'Reporte de actividad con lenguaje ofensivo',
        value: {
          type: 'inappropriate_content',
          reason: 'Contiene lenguaje ofensivo en pregunta 3',
          description: 'La pregunta 3 del cuestionario utiliza términos discriminatorios hacia minorías étnicas. Específicamente usa el término [...] que es considerado ofensivo según las políticas institucionales.',
          severity: 'high',
          reportedActivityId: '123e4567-e89b-12d3-a456-426614174000'
        }
      },
      spam: {
        summary: 'Spam',
        description: 'Reporte de actividad de spam',
        value: {
          type: 'spam',
          reason: 'Actividad duplicada múltiples veces',
          description: 'El usuario ha creado la misma actividad 15 veces con títulos casi idénticos, saturando el catálogo público.',
          severity: 'medium',
          reportedActivityId: '123e4567-e89b-12d3-a456-426614174001'
        }
      },
      plagiarism: {
        summary: 'Plagio',
        description: 'Reporte de plagio de contenido',
        value: {
          type: 'plagiarism',
          reason: 'Contenido copiado sin atribución',
          description: 'Esta actividad es una copia exacta de la actividad "Historia Mundial" del profesor García, publicada hace 3 meses, sin dar crédito al autor original.',
          severity: 'high',
          reportedActivityId: '123e4567-e89b-12d3-a456-426614174002'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Reporte creado exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Reporte creado exitosamente. Será revisado por nuestro equipo de moderación.',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          type: 'inappropriate_content',
          reason: 'Contiene lenguaje ofensivo',
          severity: 'high',
          status: 'pending',
          createdAt: '2023-12-01T10:30:00Z'
        },
        timestamp: '2023-12-01T10:30:00Z'
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
    schema: {
      example: {
        success: false,
        error: 'VALIDATION_ERROR',
        message: 'Los datos del reporte son inválidos',
        timestamp: '2023-12-01T10:30:00Z'
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Contenido reportado no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Ya has reportado este contenido recientemente o excediste el límite diario',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Tu cuenta está suspendida',
  })
  async createReport(
    @Body(ValidationPipe) createReportDto: CreateReportDto,
    @Req() req: any, // Contiene user del JWT
  ): Promise<ApiResponse<Report>> {
    this.logger.log(`📝 Usuario ${req.user.id} creando reporte de tipo: ${createReportDto.type}`);

    try {
      // Extraer información de la request
      const userId = req.user.id;
      const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      // Crear el reporte
      const report = await this.moderationService.createReport(
        createReportDto,
        userId,
        ipAddress,
        userAgent
      );

      this.logger.log(`✅ Reporte creado: ${report.id} (Severidad: ${report.severity})`);

      return {
        success: true,
        message: 'Reporte creado exitosamente. Será revisado por nuestro equipo de moderación.',
        data: report,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`❌ Error creando reporte: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Obtiene los reportes creados por el usuario actual
   * 
   * @description Permite a un usuario ver el historial de sus propios reportes
   * y el estado de cada uno (pendiente, en revisión, resuelto, rechazado).
   * 
   * @param req Request object con usuario autenticado
   * @param page Número de página
   * @param limit Elementos por página
   * @returns Lista paginada de reportes del usuario
   * 
   * @example
   * ```bash
   * GET /api/v1/moderation/reports/my-reports?page=1&limit=10
   * Authorization: Bearer <jwt-token>
   * ```
   */
  @Get('reports/my-reports')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ver mis reportes',
    description: 'Obtiene el historial de reportes creados por el usuario actual',
    operationId: 'getMyReports',
  })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de reportes del usuario',
  })
  async getMyReports(
    @Req() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<ApiResponse<any>> {
    this.logger.log(`🔍 Usuario ${req.user.id} consultando sus reportes`);

    try {
      const result = await this.moderationService.findReports(
        { reporterId: req.user.id },
        page,
        limit
      );

      this.logger.log(`📊 Usuario tiene ${result.pagination.total} reportes`);

      return {
        success: true,
        message: 'Reportes obtenidos exitosamente',
        data: result,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`❌ Error obteniendo reportes del usuario: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================================================
  // ENDPOINTS PARA ADMINISTRADORES (GESTIONAR REPORTES)
  // =============================================================================

  /**
   * Lista todos los reportes con filtros y paginación (CU-41)
   * 
   * @description Permite a administradores ver todos los reportes del sistema
   * con opciones avanzadas de filtrado: tipo, estado, severidad, fechas, etc.
   * 
   * Solo accesible para usuarios con rol ADMIN.
   * 
   * @param filters Filtros de búsqueda
   * @param page Número de página
   * @param limit Elementos por página
   * @returns Lista paginada de reportes
   * 
   * @example
   * ```bash
   * GET /api/v1/moderation/reports?status=pending&severity=high&page=1&limit=10
   * Authorization: Bearer <admin-jwt-token>
   * ```
   */
  @Get('reports')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Listar todos los reportes (Admin) (CU-41)',
    description: 'Obtiene lista paginada de reportes con filtros avanzados. Solo para administradores.',
    operationId: 'listReports',
  })
  @ApiQuery({ name: 'page', type: Number, required: false, example: 1 })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10 })
  @ApiQuery({ name: 'type', enum: ReportType, required: false })
  @ApiQuery({ name: 'status', enum: ReportStatus, required: false })
  @ApiQuery({ name: 'severity', enum: ReportSeverity, required: false })
  @ApiQuery({ name: 'reporterId', type: String, required: false })
  @ApiQuery({ name: 'moderatorId', type: String, required: false })
  @ApiQuery({ name: 'reportedActivityId', type: String, required: false })
  @ApiQuery({ name: 'startDate', type: String, required: false, example: '2023-12-01' })
  @ApiQuery({ name: 'endDate', type: String, required: false, example: '2023-12-31' })
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de reportes obtenida exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Reportes obtenidos exitosamente',
        data: {
          data: [{
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'inappropriate_content',
            reason: 'Contiene lenguaje ofensivo',
            severity: 'high',
            status: 'pending',
            createdAt: '2023-12-01T10:30:00Z'
          }],
          pagination: {
            page: 1,
            limit: 10,
            total: 25,
            totalPages: 3,
            hasNext: true,
            hasPrev: false
          }
        },
        timestamp: '2023-12-01T10:30:00Z'
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Permisos insuficientes (se requiere rol ADMIN)',
  })
  async findAllReports(
    @Query(ValidationPipe) filters: ReportFilterDto,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<ApiResponse<any>> {
    this.logger.log(`🔍 Admin listando reportes con filtros: ${JSON.stringify(filters)}`);

    try {
      const result = await this.moderationService.findReports(filters, page, limit);

      this.logger.log(`📊 Obtenidos ${result.data.length} reportes de ${result.pagination.total} totales`);

      return {
        success: true,
        message: 'Reportes obtenidos exitosamente',
        data: result,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`❌ Error listando reportes: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Obtiene un reporte específico por ID (Admin)
   * 
   * @description Retorna todos los detalles de un reporte específico,
   * incluyendo información del reportero, contenido reportado y moderador asignado.
   * 
   * @param id ID del reporte (UUID)
   * @returns Reporte con todas sus relaciones
   * 
   * @example
   * ```bash
   * GET /api/v1/moderation/reports/123e4567-e89b-12d3-a456-426614174000
   * Authorization: Bearer <admin-jwt-token>
   * ```
   */
  @Get('reports/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Obtener reporte por ID (Admin)',
    description: 'Obtiene detalles completos de un reporte específico',
    operationId: 'getReportById',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID del reporte (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reporte encontrado',
    type: Report,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Reporte no encontrado',
  })
  async findReportById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponse<Report>> {
    this.logger.log(`🔍 Admin obteniendo reporte: ${id}`);

    try {
      const report = await this.moderationService.findReportById(id);

      return {
        success: true,
        message: 'Reporte obtenido exitosamente',
        data: report,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`❌ Error obteniendo reporte: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Actualiza un reporte existente (CU-42)
   * 
   * @description Permite a administradores cambiar el estado de un reporte,
   * agregar notas de moderación y registrar acciones tomadas.
   * 
   * ACCIONES COMUNES:
   * - Cambiar a "reviewing" para indicar que se está analizando
   * - Cambiar a "resolved" si se tomó acción (ej: contenido eliminado)
   * - Cambiar a "rejected" si el reporte no es válido
   * - Agregar notas explicando la decisión
   * 
   * @param id ID del reporte
   * @param updateReportDto Datos a actualizar
   * @param req Request con usuario admin
   * @returns Reporte actualizado
   * 
   * @example
   * ```bash
   * PUT /api/v1/moderation/reports/123e4567-e89b-12d3-a456-426614174000
   * Authorization: Bearer <admin-jwt-token>
   * Content-Type: application/json
   * 
   * {
   *   "status": "resolved",
   *   "moderatorNotes": "Contenido revisado, efectivamente viola políticas. Actividad desactivada.",
   *   "actionTaken": "Actividad eliminada y usuario advertido por email"
   * }
   * ```
   */
  @Put('reports/:id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Actualizar reporte (Admin) (CU-42)',
    description: 'Permite a administradores actualizar estado y resolución de reportes',
    operationId: 'updateReport',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID del reporte (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    type: UpdateReportDto,
    description: 'Datos del reporte a actualizar',
    examples: {
      resolve: {
        summary: 'Resolver reporte',
        description: 'Marcar como resuelto con acción tomada',
        value: {
          status: 'resolved',
          moderatorNotes: 'Contenido revisado en detalle. Efectivamente contiene lenguaje inapropiado según políticas institucionales.',
          actionTaken: 'Actividad desactivada y usuario advertido por email'
        }
      },
      reject: {
        summary: 'Rechazar reporte',
        description: 'Marcar como rechazado (contenido aceptable)',
        value: {
          status: 'rejected',
          moderatorNotes: 'Contenido revisado. No se encontraron violaciones a las políticas. El lenguaje usado es apropiado para el contexto educativo.',
          actionTaken: 'Sin acción requerida'
        }
      },
      reviewing: {
        summary: 'Marcar en revisión',
        description: 'Asignar a moderador',
        value: {
          status: 'reviewing',
          moderatorNotes: 'Iniciando revisión detallada del contenido'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Reporte actualizado exitosamente',
    type: Report,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Reporte no encontrado',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Transición de estado inválida o datos incorrectos',
  })
  async updateReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateReportDto: UpdateReportDto,
    @Req() req: any,
  ): Promise<ApiResponse<Report>> {
    this.logger.log(`📝 Admin ${req.user.id} actualizando reporte: ${id}`);

    try {
      const updatedReport = await this.moderationService.updateReport(
        id,
        updateReportDto,
        req.user.id
      );

      this.logger.log(`✅ Reporte actualizado: ${updatedReport.id} (${updatedReport.status})`);

      return {
        success: true,
        message: 'Reporte actualizado exitosamente',
        data: updatedReport,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`❌ Error actualizando reporte: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Elimina permanentemente un reporte (Admin)
   * 
   * @description Borra un reporte de la base de datos. Solo para casos excepcionales.
   * Esta acción es irreversible.
   * 
   * @param id ID del reporte
   * @param req Request con usuario admin
   * 
   * @example
   * ```bash
   * DELETE /api/v1/moderation/reports/123e4567-e89b-12d3-a456-426614174000
   * Authorization: Bearer <admin-jwt-token>
   * ```
   */
  @Delete('reports/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Eliminar reporte (Admin)',
    description: 'Elimina permanentemente un reporte (solo casos excepcionales)',
    operationId: 'deleteReport',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID del reporte (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Reporte eliminado exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Reporte no encontrado',
  })
  async deleteReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: any,
  ): Promise<void> {
    this.logger.log(`🗑️ Admin ${req.user.id} eliminando reporte: ${id}`);

    try {
      await this.moderationService.deleteReport(id, req.user.id);
      this.logger.log(`✅ Reporte eliminado: ${id}`);

    } catch (error) {
      this.logger.error(`❌ Error eliminando reporte: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================================================
  // ESTADÍSTICAS
  // =============================================================================

  /**
   * Obtiene estadísticas del sistema de reportes (Admin)
   * 
   * @description Genera estadísticas agregadas útiles para análisis y dashboards:
   * totales por estado, tipo, severidad, tiempos de resolución, tendencias, etc.
   * 
   * @param startDate Fecha de inicio (opcional)
   * @param endDate Fecha de fin (opcional)
   * @returns Estadísticas completas
   * 
   * @example
   * ```bash
   * GET /api/v1/moderation/statistics?startDate=2023-12-01&endDate=2023-12-31
   * Authorization: Bearer <admin-jwt-token>
   * ```
   */
  @Get('statistics')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Obtener estadísticas de reportes (Admin)',
    description: 'Genera estadísticas agregadas del sistema de moderación',
    operationId: 'getStatistics',
  })
  @ApiQuery({
    name: 'startDate',
    type: String,
    required: false,
    description: 'Fecha de inicio (ISO 8601)',
    example: '2023-12-01',
  })
  @ApiQuery({
    name: 'endDate',
    type: String,
    required: false,
    description: 'Fecha de fin (ISO 8601)',
    example: '2023-12-31',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estadísticas obtenidas exitosamente',
    schema: {
      example: {
        success: true,
        message: 'Estadísticas generadas exitosamente',
        data: {
          total: 125,
          pending: 15,
          reviewing: 8,
          resolved: 92,
          rejected: 10,
          avgResolutionTime: 2.5,
          recentReports: 5,
          byStatus: {
            pending: 15,
            reviewing: 8,
            resolved: 92,
            rejected: 10,
            closed: 0
          },
          byType: {
            inappropriate_content: 45,
            spam: 30,
            plagiarism: 20,
            misinformation: 15,
            harassment: 10,
            copyright: 3,
            other: 2
          },
          bySeverity: {
            low: 30,
            medium: 50,
            high: 35,
            critical: 10
          }
        },
        timestamp: '2023-12-01T10:30:00Z'
      }
    }
  })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<ApiResponse<any>> {
    this.logger.log('📊 Generando estadísticas de reportes');

    try {
      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const statistics = await this.moderationService.getReportStatistics(start, end);

      this.logger.log(`📈 Estadísticas generadas: ${statistics.total} reportes analizados`);

      return {
        success: true,
        message: 'Estadísticas generadas exitosamente',
        data: statistics,
        timestamp: new Date(),
      };

    } catch (error) {
      this.logger.error(`❌ Error generando estadísticas: ${error.message}`, error.stack);
      throw error;
    }
  }
}
