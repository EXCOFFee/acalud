/**
 * 🔔 SERVICIO DE NOTIFICACIONES - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Servicio responsable de la gestión completa de notificaciones:
 * - Creación y envío de notificaciones
 * - Gestión de estados (leído/no leído)
 * - Filtrado y búsqueda avanzada
 * - Notificaciones en tiempo real vía WebSockets
 * - Envío por múltiples canales (in-app, email, push)
 * - Estadísticas y reportes
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Responsabilidad única de gestión de notificaciones
 * - OCP: Extensible para nuevos tipos y canales
 * - LSP: Implementa contratos bien definidos
 * - ISP: Interfaces específicas por funcionalidad
 * - DIP: Depende de abstracciones, no implementaciones
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Between, In, Like } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

import {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
} from './notification.entity';
import {
  CreateNotificationDto,
  CreateBulkNotificationDto,
  NotificationFiltersDto,
  UpdateNotificationDto,
  MarkAsReadDto,
  MarkAllAsReadDto,
  NotificationStatsDto,
  PaginatedNotificationsDto,
  NotificationOperationResultDto,
} from './dto/notification.dto';
import { User } from '../users/user.entity';

/**
 * Interface para eventos de notificaciones
 */
export interface NotificationEvent {
  type: 'created' | 'read' | 'sent' | 'failed';
  notification: Notification;
  userId: string;
  metadata?: Record<string, any>;
}

/**
 * Servicio principal de notificaciones
 * 
 * @description Este servicio maneja toda la lógica de negocio relacionada
 * con notificaciones del sistema, incluyendo creación, envío, filtrado y estadísticas.
 * 
 * @example
 * ```typescript
 * // Crear una notificación de logro
 * await notificationService.createNotification({
 *   type: NotificationType.ACHIEVEMENT_UNLOCKED,
 *   title: '🏆 ¡Nuevo logro!',
 *   message: 'Has completado 10 actividades',
 *   recipientId: userId,
 *   priority: NotificationPriority.HIGH,
 *   metadata: { achievementId: 'abc123', points: 100 }
 * });
 * ```
 */
@Injectable()
export class NotificationService {
  /**
   * Logger para registrar operaciones del servicio
   */
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // =============================================================================
  // 📝 MÉTODOS DE CREACIÓN
  // =============================================================================

  /**
   * Crea una nueva notificación
   * 
   * @param createNotificationDto Datos de la notificación
   * @returns Notificación creada
   */
  async createNotification(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    this.logger.log(`📝 Creando notificación tipo: ${createNotificationDto.type}`);

    try {
      // Verificar que el destinatario existe
      const recipient = await this.userRepository.findOne({
        where: { id: createNotificationDto.recipientId },
      });

      if (!recipient) {
        throw new NotFoundException(
          `Usuario destinatario con ID ${createNotificationDto.recipientId} no encontrado`,
        );
      }

      // Verificar remitente si se proporciona
      let sender: User | undefined;
      if (createNotificationDto.senderId) {
        sender = await this.userRepository.findOne({
          where: { id: createNotificationDto.senderId },
        });

        if (!sender) {
          throw new NotFoundException(
            `Usuario remitente con ID ${createNotificationDto.senderId} no encontrado`,
          );
        }
      }

      // Crear la notificación
      const notification = this.notificationRepository.create({
        ...createNotificationDto,
        recipient,
        sender,
        priority: createNotificationDto.priority || NotificationPriority.MEDIUM,
        channels: createNotificationDto.channels || [NotificationChannel.IN_APP],
        expiresAt: createNotificationDto.expiresAt 
          ? new Date(createNotificationDto.expiresAt) 
          : undefined,
      });

      const savedNotification = await this.notificationRepository.save(notification);

      // Emitir evento de notificación creada
      this.eventEmitter.emit('notification.created', {
        type: 'created',
        notification: savedNotification,
        userId: recipient.id,
        metadata: createNotificationDto.metadata,
      } as NotificationEvent);

      this.logger.log(`✅ Notificación creada exitosamente: ${savedNotification.id}`);

      // Enviar la notificación
      await this.sendNotification(savedNotification);

      return savedNotification;

    } catch (error) {
      this.logger.error(`❌ Error creando notificación: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Crea notificaciones masivas para múltiples usuarios
   * 
   * @param createBulkDto Datos para notificaciones masivas
   * @returns Array de notificaciones creadas
   */
  async createBulkNotifications(
    createBulkDto: CreateBulkNotificationDto,
  ): Promise<Notification[]> {
    this.logger.log(`📬 Creando ${createBulkDto.recipientIds.length} notificaciones masivas`);

    try {
      // Verificar que todos los destinatarios existen
      const recipients = await this.userRepository.find({
        where: { id: In(createBulkDto.recipientIds) },
      });

      if (recipients.length !== createBulkDto.recipientIds.length) {
        const foundIds = recipients.map(r => r.id);
        const missingIds = createBulkDto.recipientIds.filter(id => !foundIds.includes(id));
        throw new NotFoundException(
          `Usuarios no encontrados: ${missingIds.join(', ')}`,
        );
      }

      // Crear notificaciones para cada destinatario
      const notifications = recipients.map(recipient => {
        return this.notificationRepository.create({
          type: createBulkDto.type,
          title: createBulkDto.title,
          message: createBulkDto.message,
          recipient,
          recipientId: recipient.id,
          priority: createBulkDto.priority || NotificationPriority.MEDIUM,
          channels: createBulkDto.channels || [NotificationChannel.IN_APP],
          metadata: createBulkDto.metadata,
        });
      });

      const savedNotifications = await this.notificationRepository.save(notifications);

      // Emitir eventos para todas las notificaciones
      savedNotifications.forEach(notification => {
        this.eventEmitter.emit('notification.created', {
          type: 'created',
          notification,
          userId: notification.recipientId,
          metadata: createBulkDto.metadata,
        } as NotificationEvent);
      });

      this.logger.log(`✅ ${savedNotifications.length} notificaciones masivas creadas`);

      // Enviar todas las notificaciones
      await Promise.all(
        savedNotifications.map(notification => this.sendNotification(notification)),
      );

      return savedNotifications;

    } catch (error) {
      this.logger.error(`❌ Error creando notificaciones masivas: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================================================
  // 📤 MÉTODOS DE ENVÍO
  // =============================================================================

  /**
   * Envía una notificación por los canales configurados
   * 
   * @param notification Notificación a enviar
   */
  private async sendNotification(notification: Notification): Promise<void> {
    this.logger.log(`📤 Enviando notificación ${notification.id} por canales: ${notification.channels.join(', ')}`);

    try {
      const sendPromises = notification.channels.map(async (channel) => {
        try {
          switch (channel) {
            case NotificationChannel.IN_APP:
              await this.sendInAppNotification(notification);
              break;

            case NotificationChannel.EMAIL:
              await this.sendEmailNotification(notification);
              break;

            case NotificationChannel.PUSH:
              await this.sendPushNotification(notification);
              break;

            case NotificationChannel.SMS:
              await this.sendSMSNotification(notification);
              break;

            default:
              this.logger.warn(`⚠️ Canal no soportado: ${channel}`);
          }
        } catch (channelError) {
          this.logger.error(`❌ Error enviando por ${channel}: ${channelError.message}`);
          
          // Registrar error específico del canal
          if (!notification.sendErrors) {
            notification.sendErrors = {};
          }
          
          notification.sendErrors[channel] = {
            error: channelError.message,
            timestamp: new Date(),
            retryCount: (notification.sendErrors[channel]?.retryCount || 0) + 1,
          };
        }
      });

      await Promise.allSettled(sendPromises);

      // Actualizar estado de envío
      notification.sendAttempts++;
      
      const hasErrors = notification.sendErrors && Object.keys(notification.sendErrors).length > 0;
      if (!hasErrors) {
        notification.markAsSent();
      }

      await this.notificationRepository.save(notification);

      // Emitir evento según resultado
      this.eventEmitter.emit(hasErrors ? 'notification.failed' : 'notification.sent', {
        type: hasErrors ? 'failed' : 'sent',
        notification,
        userId: notification.recipientId,
        metadata: { errors: notification.sendErrors },
      } as NotificationEvent);

    } catch (error) {
      this.logger.error(`❌ Error general enviando notificación: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Envía notificación in-app (WebSocket/SSE)
   */
  private async sendInAppNotification(notification: Notification): Promise<void> {
    this.logger.log(`📱 Enviando notificación in-app a usuario: ${notification.recipientId}`);
    
    // Emitir evento para WebSocket
    this.eventEmitter.emit('notification.in-app', {
      userId: notification.recipientId,
      notification: notification.toSummary(),
    });

    // Simular envío exitoso
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Envía notificación por email
   */
  private async sendEmailNotification(notification: Notification): Promise<void> {
    this.logger.log(`📧 Enviando notificación por email a: ${notification.recipient?.email}`);
    
    // TODO: Integrar con servicio de email
    // Por ahora simulamos el envío
    await new Promise(resolve => setTimeout(resolve, 200));
    
    this.logger.log(`✅ Email enviado exitosamente`);
  }

  /**
   * Envía notificación push
   */
  private async sendPushNotification(notification: Notification): Promise<void> {
    this.logger.log(`🔔 Enviando notificación push a usuario: ${notification.recipientId}`);
    
    // TODO: Integrar con servicio de push (FCM, OneSignal, etc.)
    // Por ahora simulamos el envío
    await new Promise(resolve => setTimeout(resolve, 150));
    
    this.logger.log(`✅ Push enviado exitosamente`);
  }

  /**
   * Envía notificación por SMS
   */
  private async sendSMSNotification(notification: Notification): Promise<void> {
    this.logger.log(`📱 Enviando SMS a usuario: ${notification.recipientId}`);
    
    // TODO: Integrar con servicio SMS (Twilio, AWS SNS, etc.)
    // Por ahora simulamos el envío
    await new Promise(resolve => setTimeout(resolve, 300));
    
    this.logger.log(`✅ SMS enviado exitosamente`);
  }

  // =============================================================================
  // 📖 MÉTODOS DE CONSULTA
  // =============================================================================

  /**
   * Obtiene notificaciones con filtros y paginación
   * 
   * @param userId ID del usuario
   * @param filters Filtros de búsqueda
   * @returns Respuesta paginada con notificaciones
   */
  async getNotifications(
    userId: string,
    filters: NotificationFiltersDto,
  ): Promise<PaginatedNotificationsDto> {
    this.logger.log(`📖 Obteniendo notificaciones para usuario: ${userId}`);

    try {
      const queryBuilder = this.notificationRepository
        .createQueryBuilder('notification')
        .leftJoinAndSelect('notification.sender', 'sender')
        .where('notification.recipientId = :userId', { userId });

      // Aplicar filtros
      if (filters.types?.length) {
        queryBuilder.andWhere('notification.type IN (:...types)', { types: filters.types });
      }

      if (filters.priorities?.length) {
        queryBuilder.andWhere('notification.priority IN (:...priorities)', { 
          priorities: filters.priorities 
        });
      }

      if (filters.isRead !== undefined) {
        queryBuilder.andWhere('notification.isRead = :isRead', { isRead: filters.isRead });
      }

      if (filters.fromDate) {
        queryBuilder.andWhere('notification.createdAt >= :fromDate', { 
          fromDate: new Date(filters.fromDate) 
        });
      }

      if (filters.toDate) {
        queryBuilder.andWhere('notification.createdAt <= :toDate', { 
          toDate: new Date(filters.toDate) 
        });
      }

      if (filters.search) {
        queryBuilder.andWhere(
          '(notification.title ILIKE :search OR notification.message ILIKE :search)',
          { search: `%${filters.search}%` }
        );
      }

      // Aplicar ordenamiento
      const sortBy = filters.sortBy || 'createdAt';
      const sortOrder = filters.sortOrder || 'DESC';
      queryBuilder.orderBy(`notification.${sortBy}`, sortOrder);

      // Aplicar paginación
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const skip = (page - 1) * limit;

      queryBuilder.skip(skip).take(limit);

      // Ejecutar consulta
      const [notifications, total] = await queryBuilder.getManyAndCount();

      // Calcular metadatos de paginación
      const totalPages = Math.ceil(total / limit);
      const hasPrevious = page > 1;
      const hasNext = page < totalPages;

      this.logger.log(`✅ ${notifications.length} notificaciones encontradas de ${total} total`);

      return {
        data: notifications.map(n => n.toSummary()),
        total,
        page,
        limit,
        totalPages,
        hasPrevious,
        hasNext,
      };

    } catch (error) {
      this.logger.error(`❌ Error obteniendo notificaciones: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error obteniendo notificaciones');
    }
  }

  /**
   * Obtiene una notificación específica
   * 
   * @param userId ID del usuario
   * @param notificationId ID de la notificación
   * @returns Notificación encontrada
   */
  async getNotification(userId: string, notificationId: string): Promise<Notification> {
    this.logger.log(`📖 Obteniendo notificación ${notificationId} para usuario ${userId}`);

    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, recipientId: userId },
      relations: ['sender'],
    });

    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }

    return notification;
  }

  // =============================================================================
  // ✏️ MÉTODOS DE ACTUALIZACIÓN
  // =============================================================================

  /**
   * Marca notificaciones específicas como leídas
   * 
   * @param userId ID del usuario
   * @param markAsReadDto IDs de notificaciones a marcar
   * @returns Resultado de la operación
   */
  async markAsRead(
    userId: string,
    markAsReadDto: MarkAsReadDto,
  ): Promise<NotificationOperationResultDto> {
    this.logger.log(`✏️ Marcando ${markAsReadDto.notificationIds.length} notificaciones como leídas`);

    try {
      const result = await this.notificationRepository
        .createQueryBuilder()
        .update(Notification)
        .set({ 
          isRead: true, 
          readAt: new Date(),
          updatedAt: new Date(),
        })
        .where('recipientId = :userId', { userId })
        .andWhere('id IN (:...ids)', { ids: markAsReadDto.notificationIds })
        .andWhere('isRead = :isRead', { isRead: false })
        .execute();

      const updatedCount = result.affected || 0;

      // Emitir eventos para las notificaciones marcadas
      markAsReadDto.notificationIds.forEach(notificationId => {
        this.eventEmitter.emit('notification.read', {
          type: 'read',
          notification: { id: notificationId } as Notification,
          userId,
        } as NotificationEvent);
      });

      this.logger.log(`✅ ${updatedCount} notificaciones marcadas como leídas`);

      return {
        success: true,
        message: `${updatedCount} notificaciones marcadas como leídas`,
        data: { updatedCount },
      };

    } catch (error) {
      this.logger.error(`❌ Error marcando notificaciones como leídas: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error actualizando notificaciones');
    }
  }

  /**
   * Marca todas las notificaciones como leídas
   * 
   * @param userId ID del usuario
   * @param markAllDto Filtros opcionales
   * @returns Resultado de la operación
   */
  async markAllAsRead(
    userId: string,
    markAllDto?: MarkAllAsReadDto,
  ): Promise<NotificationOperationResultDto> {
    this.logger.log(`✏️ Marcando todas las notificaciones como leídas para usuario: ${userId}`);

    try {
      const queryBuilder = this.notificationRepository
        .createQueryBuilder()
        .update(Notification)
        .set({ 
          isRead: true, 
          readAt: new Date(),
          updatedAt: new Date(),
        })
        .where('recipientId = :userId', { userId })
        .andWhere('isRead = :isRead', { isRead: false });

      // Aplicar filtros opcionales
      if (markAllDto?.types?.length) {
        queryBuilder.andWhere('type IN (:...types)', { types: markAllDto.types });
      }

      if (markAllDto?.beforeDate) {
        queryBuilder.andWhere('createdAt <= :beforeDate', { 
          beforeDate: new Date(markAllDto.beforeDate) 
        });
      }

      const result = await queryBuilder.execute();
      const updatedCount = result.affected || 0;

      this.logger.log(`✅ ${updatedCount} notificaciones marcadas como leídas`);

      return {
        success: true,
        message: `${updatedCount} notificaciones marcadas como leídas`,
        data: { updatedCount },
      };

    } catch (error) {
      this.logger.error(`❌ Error marcando todas las notificaciones: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error actualizando notificaciones');
    }
  }

  // =============================================================================
  // 📊 MÉTODOS DE ESTADÍSTICAS
  // =============================================================================

  /**
   * Obtiene estadísticas de notificaciones del usuario
   * 
   * @param userId ID del usuario
   * @returns Estadísticas completas
   */
  async getNotificationStats(userId: string): Promise<NotificationStatsDto> {
    this.logger.log(`📊 Obteniendo estadísticas de notificaciones para usuario: ${userId}`);

    try {
      const [
        total,
        unread,
        byType,
        byPriority,
        today,
        thisWeek,
        thisMonth,
      ] = await Promise.all([
        // Total de notificaciones
        this.notificationRepository.count({ 
          where: { recipientId: userId } 
        }),

        // Notificaciones no leídas
        this.notificationRepository.count({ 
          where: { recipientId: userId, isRead: false } 
        }),

        // Por tipo
        this.notificationRepository
          .createQueryBuilder('notification')
          .select('notification.type', 'type')
          .addSelect('COUNT(*)', 'count')
          .where('notification.recipientId = :userId', { userId })
          .groupBy('notification.type')
          .getRawMany(),

        // Por prioridad
        this.notificationRepository
          .createQueryBuilder('notification')
          .select('notification.priority', 'priority')
          .addSelect('COUNT(*)', 'count')
          .where('notification.recipientId = :userId', { userId })
          .groupBy('notification.priority')
          .getRawMany(),

        // Hoy
        this.notificationRepository.count({
          where: {
            recipientId: userId,
            createdAt: Between(
              new Date(new Date().setHours(0, 0, 0, 0)),
              new Date(new Date().setHours(23, 59, 59, 999))
            ),
          },
        }),

        // Esta semana
        this.notificationRepository.count({
          where: {
            recipientId: userId,
            createdAt: Between(
              new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              new Date()
            ),
          },
        }),

        // Este mes
        this.notificationRepository.count({
          where: {
            recipientId: userId,
            createdAt: Between(
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              new Date()
            ),
          },
        }),
      ]);

      // Procesar distribuciones
      const byTypeMap = byType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {} as Record<NotificationType, number>);

      const byPriorityMap = byPriority.reduce((acc, item) => {
        acc[item.priority] = parseInt(item.count);
        return acc;
      }, {} as Record<NotificationPriority, number>);

      const stats: NotificationStatsDto = {
        total,
        unread,
        read: total - unread,
        byType: byTypeMap,
        byPriority: byPriorityMap,
        today,
        thisWeek,
        thisMonth,
      };

      this.logger.log(`✅ Estadísticas calculadas: ${total} total, ${unread} sin leer`);

      return stats;

    } catch (error) {
      this.logger.error(`❌ Error obteniendo estadísticas: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Error obteniendo estadísticas');
    }
  }

  // =============================================================================
  // 🗑️ MÉTODOS DE LIMPIEZA
  // =============================================================================

  /**
   * Elimina notificaciones expiradas
   * 
   * @returns Número de notificaciones eliminadas
   */
  async cleanupExpiredNotifications(): Promise<number> {
    this.logger.log('🗑️ Limpiando notificaciones expiradas');

    try {
      const result = await this.notificationRepository
        .createQueryBuilder()
        .delete()
        .from(Notification)
        .where('expiresAt IS NOT NULL')
        .andWhere('expiresAt < :now', { now: new Date() })
        .execute();

      const deletedCount = result.affected || 0;
      this.logger.log(`✅ ${deletedCount} notificaciones expiradas eliminadas`);

      return deletedCount;

    } catch (error) {
      this.logger.error(`❌ Error limpiando notificaciones: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Elimina notificaciones antiguas (más de X días)
   * 
   * @param daysOld Días de antigüedad
   * @returns Número de notificaciones eliminadas
   */
  async cleanupOldNotifications(daysOld: number = 90): Promise<number> {
    this.logger.log(`🗑️ Limpiando notificaciones de más de ${daysOld} días`);

    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      
      const result = await this.notificationRepository
        .createQueryBuilder()
        .delete()
        .from(Notification)
        .where('createdAt < :cutoffDate', { cutoffDate })
        .andWhere('isRead = :isRead', { isRead: true })
        .execute();

      const deletedCount = result.affected || 0;
      this.logger.log(`✅ ${deletedCount} notificaciones antiguas eliminadas`);

      return deletedCount;

    } catch (error) {
      this.logger.error(`❌ Error limpiando notificaciones antiguas: ${error.message}`, error.stack);
      throw error;
    }
  }
}