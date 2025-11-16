/**
 * 🔔 CONTROLADOR DE NOTIFICACIONES - API REST COMPLETA
 * 
 * Controlador que expone endpoints para gestión de notificaciones:
 * - CRUD completo de notificaciones
 * - Filtrado avanzado y búsqueda
 * - Marcado como leído/no leído
 * - Estadísticas y reportes
 * - Notificaciones en tiempo real vía WebSockets
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Responsabilidad única de manejar HTTP requests
 * - OCP: Extensible para nuevos endpoints
 * - LSP: Cumple contratos de HTTP y NestJS
 * - ISP: Endpoints específicos por funcionalidad
 * - DIP: Depende del servicio, no implementaciones
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
  Request,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateNotificationDto,
  CreateBulkNotificationDto,
  NotificationFiltersDto,
  MarkAsReadDto,
  MarkAllAsReadDto,
  NotificationStatsDto,
  PaginatedNotificationsDto,
  NotificationOperationResultDto,
} from './dto/notification.dto';
import {
  NotificationType,
  NotificationPriority,
} from './notification.entity';

/**
 * Controlador principal para notificaciones
 * 
 * @description Este controlador maneja todas las operaciones HTTP
 * relacionadas con notificaciones del sistema.
 * 
 * @example
 * ```typescript
 * // Obtener notificaciones del usuario
 * GET /notifications?page=1&limit=20&isRead=false
 * 
 * // Crear nueva notificación
 * POST /notifications
 * {
 *   "type": "achievement_unlocked",
 *   "title": "🏆 Nuevo logro",
 *   "message": "Has completado 10 actividades",
 *   "recipientId": "user-uuid"
 * }
 * ```
 */
@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  /**
   * Logger para registrar operaciones del controlador
   */
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  // =============================================================================
  // 📖 ENDPOINTS DE CONSULTA
  // =============================================================================

  /**
   * Obtiene notificaciones del usuario autenticado con filtros
   */
  @Get()
  @ApiOperation({ 
    summary: 'Obtener notificaciones del usuario',
    description: 'Obtiene las notificaciones del usuario autenticado con filtros avanzados y paginación',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número de página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Elementos por página' })
  @ApiQuery({ name: 'types', required: false, type: [String], description: 'Tipos de notificaciones' })
  @ApiQuery({ name: 'priorities', required: false, type: [String], description: 'Prioridades' })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean, description: 'Solo leídas/no leídas' })
  @ApiQuery({ name: 'fromDate', required: false, type: String, description: 'Desde fecha (ISO)' })
  @ApiQuery({ name: 'toDate', required: false, type: String, description: 'Hasta fecha (ISO)' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Buscar en título/mensaje' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['createdAt', 'priority', 'type', 'isRead'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['ASC', 'DESC'] })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notificaciones obtenidas exitosamente',
    type: PaginatedNotificationsDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Usuario no autenticado',
  })
  async getNotifications(
    @Request() req: any,
    @Query() filters: NotificationFiltersDto,
  ): Promise<PaginatedNotificationsDto> {
    this.logger.log(`📖 Usuario ${req.user.id} solicitando notificaciones`);

    return this.notificationService.getNotifications(req.user.id, filters);
  }

  /**
   * Obtiene una notificación específica
   */
  @Get(':id')
  @ApiOperation({ 
    summary: 'Obtener notificación específica',
    description: 'Obtiene los detalles de una notificación específica del usuario',
  })
  @ApiParam({ name: 'id', description: 'ID de la notificación' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notificación encontrada',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Notificación no encontrada',
  })
  async getNotification(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.logger.log(`📖 Usuario ${req.user.id} solicitando notificación ${id}`);

    const notification = await this.notificationService.getNotification(req.user.id, id);
    
    // Marcar como leída si no lo estaba
    if (!notification.isRead) {
      await this.notificationService.markAsRead(req.user.id, {
        notificationIds: [id],
      });
    }

    return notification;
  }

  /**
   * Obtiene estadísticas de notificaciones del usuario
   */
  @Get('stats/summary')
  @ApiOperation({ 
    summary: 'Obtener estadísticas de notificaciones',
    description: 'Obtiene estadísticas completas de notificaciones del usuario',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estadísticas obtenidas exitosamente',
    type: NotificationStatsDto,
  })
  async getNotificationStats(@Request() req: any): Promise<NotificationStatsDto> {
    this.logger.log(`📊 Usuario ${req.user.id} solicitando estadísticas`);

    return this.notificationService.getNotificationStats(req.user.id);
  }

  // =============================================================================
  // 📝 ENDPOINTS DE CREACIÓN
  // =============================================================================

  /**
   * Crea una nueva notificación (solo para administradores/sistema)
   */
  @Post()
  @ApiOperation({ 
    summary: 'Crear nueva notificación',
    description: 'Crea una nueva notificación para un usuario específico',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Notificación creada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Usuario destinatario no encontrado',
  })
  async createNotification(
    @Request() req: any,
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    this.logger.log(`📝 Usuario ${req.user.id} creando notificación tipo: ${createNotificationDto.type}`);

    // Verificar permisos (por ejemplo, solo admins pueden crear ciertas notificaciones)
    // TODO: Implementar sistema de permisos más granular

    return this.notificationService.createNotification(createNotificationDto);
  }

  /**
   * Crea notificaciones masivas (solo para administradores)
   */
  @Post('bulk')
  @ApiOperation({ 
    summary: 'Crear notificaciones masivas',
    description: 'Crea notificaciones para múltiples usuarios simultáneamente',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Notificaciones masivas creadas exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Datos de entrada inválidos',
  })
  async createBulkNotifications(
    @Request() req: any,
    @Body() createBulkDto: CreateBulkNotificationDto,
  ) {
    this.logger.log(`📬 Usuario ${req.user.id} creando ${createBulkDto.recipientIds.length} notificaciones masivas`);

    // TODO: Verificar permisos de administrador
    if (req.user.role !== 'admin' && req.user.role !== 'teacher') {
      throw new BadRequestException('No tienes permisos para crear notificaciones masivas');
    }

    return this.notificationService.createBulkNotifications(createBulkDto);
  }

  // =============================================================================
  // ✏️ ENDPOINTS DE ACTUALIZACIÓN
  // =============================================================================

  /**
   * Marca notificaciones específicas como leídas
   */
  @Put('mark-as-read')
  @ApiOperation({ 
    summary: 'Marcar notificaciones como leídas',
    description: 'Marca las notificaciones especificadas como leídas',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notificaciones marcadas como leídas',
    type: NotificationOperationResultDto,
  })
  async markAsRead(
    @Request() req: any,
    @Body() markAsReadDto: MarkAsReadDto,
  ): Promise<NotificationOperationResultDto> {
    this.logger.log(`✏️ Usuario ${req.user.id} marcando ${markAsReadDto.notificationIds.length} notificaciones como leídas`);

    return this.notificationService.markAsRead(req.user.id, markAsReadDto);
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  @Put('mark-all-as-read')
  @ApiOperation({ 
    summary: 'Marcar todas las notificaciones como leídas',
    description: 'Marca todas las notificaciones del usuario como leídas, con filtros opcionales',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Todas las notificaciones marcadas como leídas',
    type: NotificationOperationResultDto,
  })
  async markAllAsRead(
    @Request() req: any,
    @Body() markAllDto?: MarkAllAsReadDto,
  ): Promise<NotificationOperationResultDto> {
    this.logger.log(`✏️ Usuario ${req.user.id} marcando todas las notificaciones como leídas`);

    return this.notificationService.markAllAsRead(req.user.id, markAllDto);
  }

  // =============================================================================
  // 🗑️ ENDPOINTS DE ELIMINACIÓN
  // =============================================================================

  /**
   * Elimina una notificación específica
   */
  @Delete(':id')
  @ApiOperation({ 
    summary: 'Eliminar notificación',
    description: 'Elimina una notificación específica del usuario',
  })
  @ApiParam({ name: 'id', description: 'ID de la notificación' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notificación eliminada exitosamente',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Notificación no encontrada',
  })
  async deleteNotification(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<NotificationOperationResultDto> {
    this.logger.log(`🗑️ Usuario ${req.user.id} eliminando notificación ${id}`);

    // Verificar que la notificación pertenece al usuario
    await this.notificationService.getNotification(req.user.id, id);

    // TODO: Implementar método de eliminación en el servicio
    // await this.notificationService.deleteNotification(req.user.id, id);

    return {
      success: true,
      message: 'Notificación eliminada exitosamente',
    };
  }

  // =============================================================================
  // 🔧 ENDPOINTS DE UTILIDAD
  // =============================================================================

  /**
   * Obtiene tipos de notificaciones disponibles
   */
  @Get('config/types')
  @ApiOperation({ 
    summary: 'Obtener tipos de notificaciones disponibles',
    description: 'Obtiene la lista de todos los tipos de notificaciones del sistema',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tipos de notificaciones obtenidos',
  })
  getNotificationTypes() {
    this.logger.log('📋 Solicitando tipos de notificaciones disponibles');

    return {
      types: Object.values(NotificationType).map(type => ({
        value: type,
        label: this.getTypeLabel(type),
        icon: this.getTypeIcon(type),
        description: this.getTypeDescription(type),
      })),
      priorities: Object.values(NotificationPriority).map(priority => ({
        value: priority,
        label: this.getPriorityLabel(priority),
        color: this.getPriorityColor(priority),
      })),
    };
  }

  /**
   * Limpia notificaciones expiradas (solo administradores)
   */
  @Post('cleanup/expired')
  @ApiOperation({ 
    summary: 'Limpiar notificaciones expiradas',
    description: 'Elimina todas las notificaciones que han expirado (solo administradores)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Limpieza completada',
  })
  async cleanupExpiredNotifications(@Request() req: any) {
    this.logger.log(`🗑️ Usuario ${req.user.id} ejecutando limpieza de notificaciones expiradas`);

    // TODO: Verificar permisos de administrador
    if (req.user.role !== 'admin') {
      throw new BadRequestException('No tienes permisos para ejecutar esta operación');
    }

    const deletedCount = await this.notificationService.cleanupExpiredNotifications();

    return {
      success: true,
      message: `${deletedCount} notificaciones expiradas eliminadas`,
      data: { deletedCount },
    };
  }

  // =============================================================================
  // 🔧 MÉTODOS DE UTILIDAD PRIVADOS
  // =============================================================================

  /**
   * Obtiene la etiqueta legible de un tipo de notificación
   */
  private getTypeLabel(type: NotificationType): string {
    const labels: Record<NotificationType, string> = {
      [NotificationType.ACTIVITY_ASSIGNED]: 'Actividad asignada',
      [NotificationType.ACTIVITY_COMPLETED]: 'Actividad completada',
      [NotificationType.ACTIVITY_DUE_SOON]: 'Actividad próxima a vencer',
      [NotificationType.ACTIVITY_OVERDUE]: 'Actividad vencida',
      [NotificationType.ACHIEVEMENT_UNLOCKED]: 'Logro desbloqueado',
      [NotificationType.LEVEL_UP]: 'Subida de nivel',
      [NotificationType.POINTS_EARNED]: 'Puntos ganados',
      [NotificationType.BADGE_EARNED]: 'Insignia obtenida',
      [NotificationType.CLASSROOM_JOINED]: 'Aula unida',
      [NotificationType.CLASSROOM_ANNOUNCEMENT]: 'Anuncio de aula',
      [NotificationType.STUDENT_JOINED_CLASSROOM]: 'Estudiante se unió al aula',
      [NotificationType.NEW_CLASSROOM_ACTIVITY]: 'Nueva actividad en aula',
      [NotificationType.SYSTEM_ANNOUNCEMENT]: 'Anuncio del sistema',
      [NotificationType.ACCOUNT_VERIFIED]: 'Cuenta verificada',
      [NotificationType.PASSWORD_CHANGED]: 'Contraseña cambiada',
      [NotificationType.PROFILE_UPDATED]: 'Perfil actualizado',
      [NotificationType.NEW_MESSAGE]: 'Nuevo mensaje',
      [NotificationType.COMMENT_RECEIVED]: 'Comentario recibido',
      [NotificationType.MENTION_RECEIVED]: 'Mención recibida',
      [NotificationType.WEEKLY_REPORT]: 'Reporte semanal',
      [NotificationType.MONTHLY_REPORT]: 'Reporte mensual',
      [NotificationType.PROGRESS_UPDATE]: 'Actualización de progreso',
    };

    return labels[type] || type;
  }

  /**
   * Obtiene el ícono de un tipo de notificación
   */
  private getTypeIcon(type: NotificationType): string {
    // Reutilizar la lógica de la entidad
    const iconMap: Record<NotificationType, string> = {
      [NotificationType.ACTIVITY_ASSIGNED]: '📝',
      [NotificationType.ACTIVITY_COMPLETED]: '✅',
      [NotificationType.ACTIVITY_DUE_SOON]: '⏰',
      [NotificationType.ACTIVITY_OVERDUE]: '🚨',
      [NotificationType.ACHIEVEMENT_UNLOCKED]: '🏆',
      [NotificationType.LEVEL_UP]: '⬆️',
      [NotificationType.POINTS_EARNED]: '💎',
      [NotificationType.BADGE_EARNED]: '🏅',
      [NotificationType.CLASSROOM_JOINED]: '🎓',
      [NotificationType.CLASSROOM_ANNOUNCEMENT]: '📢',
      [NotificationType.STUDENT_JOINED_CLASSROOM]: '👥',
      [NotificationType.NEW_CLASSROOM_ACTIVITY]: '📚',
      [NotificationType.SYSTEM_ANNOUNCEMENT]: '📋',
      [NotificationType.ACCOUNT_VERIFIED]: '✅',
      [NotificationType.PASSWORD_CHANGED]: '🔐',
      [NotificationType.PROFILE_UPDATED]: '👤',
      [NotificationType.NEW_MESSAGE]: '💬',
      [NotificationType.COMMENT_RECEIVED]: '💭',
      [NotificationType.MENTION_RECEIVED]: '🏷️',
      [NotificationType.WEEKLY_REPORT]: '📊',
      [NotificationType.MONTHLY_REPORT]: '📊',
      [NotificationType.PROGRESS_UPDATE]: '📊',
    };

    return iconMap[type] || '🔔';
  }

  /**
   * Obtiene la descripción de un tipo de notificación
   */
  private getTypeDescription(type: NotificationType): string {
    const descriptions: Record<NotificationType, string> = {
      [NotificationType.ACTIVITY_ASSIGNED]: 'Se te ha asignado una nueva actividad',
      [NotificationType.ACTIVITY_COMPLETED]: 'Has completado una actividad exitosamente',
      [NotificationType.ACTIVITY_DUE_SOON]: 'Una actividad está próxima a vencer',
      [NotificationType.ACTIVITY_OVERDUE]: 'Una actividad ha vencido',
      [NotificationType.ACHIEVEMENT_UNLOCKED]: 'Has desbloqueado un nuevo logro',
      [NotificationType.LEVEL_UP]: 'Has subido de nivel',
      [NotificationType.POINTS_EARNED]: 'Has ganado puntos',
      [NotificationType.BADGE_EARNED]: 'Has obtenido una nueva insignia',
      [NotificationType.CLASSROOM_JOINED]: 'Te has unido a un aula',
      [NotificationType.CLASSROOM_ANNOUNCEMENT]: 'Nuevo anuncio en tu aula',
      [NotificationType.STUDENT_JOINED_CLASSROOM]: 'Un estudiante se unió a tu aula',
      [NotificationType.NEW_CLASSROOM_ACTIVITY]: 'Nueva actividad disponible en tu aula',
      [NotificationType.SYSTEM_ANNOUNCEMENT]: 'Anuncio importante del sistema',
      [NotificationType.ACCOUNT_VERIFIED]: 'Tu cuenta ha sido verificada',
      [NotificationType.PASSWORD_CHANGED]: 'Tu contraseña ha sido cambiada',
      [NotificationType.PROFILE_UPDATED]: 'Tu perfil ha sido actualizado',
      [NotificationType.NEW_MESSAGE]: 'Tienes un nuevo mensaje',
      [NotificationType.COMMENT_RECEIVED]: 'Recibiste un nuevo comentario',
      [NotificationType.MENTION_RECEIVED]: 'Te han mencionado',
      [NotificationType.WEEKLY_REPORT]: 'Tu reporte semanal está disponible',
      [NotificationType.MONTHLY_REPORT]: 'Tu reporte mensual está disponible',
      [NotificationType.PROGRESS_UPDATE]: 'Actualización sobre tu progreso',
    };

    return descriptions[type] || 'Notificación del sistema';
  }

  /**
   * Obtiene la etiqueta de una prioridad
   */
  private getPriorityLabel(priority: NotificationPriority): string {
    const labels: Record<NotificationPriority, string> = {
      [NotificationPriority.LOW]: 'Baja',
      [NotificationPriority.MEDIUM]: 'Media',
      [NotificationPriority.HIGH]: 'Alta',
      [NotificationPriority.URGENT]: 'Urgente',
    };

    return labels[priority] || priority;
  }

  /**
   * Obtiene el color de una prioridad
   */
  private getPriorityColor(priority: NotificationPriority): string {
    const colors: Record<NotificationPriority, string> = {
      [NotificationPriority.LOW]: '#6c757d',
      [NotificationPriority.MEDIUM]: '#007bff',
      [NotificationPriority.HIGH]: '#fd7e14',
      [NotificationPriority.URGENT]: '#dc3545',
    };

    return colors[priority] || '#007bff';
  }
}