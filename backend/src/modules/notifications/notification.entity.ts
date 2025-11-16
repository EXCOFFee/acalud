/**
 * 🔔 ENTIDAD DE NOTIFICACIONES - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Entidad que representa las notificaciones del sistema:
 * - Notificaciones de actividades completadas
 * - Logros desbloqueados 
 * - Mensajes de profesores
 * - Recordatorios de tareas
 * - Anuncios del sistema
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Responsabilidad única de modelar notificaciones
 * - OCP: Extensible para nuevos tipos de notificación
 * - LSP: Implementa contratos bien definidos
 * - ISP: Interfaces específicas por funcionalidad
 * - DIP: Usa tipos abstractos, no implementaciones concretas
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';

/**
 * Tipos de notificaciones disponibles en el sistema
 */
export enum NotificationType {
  // 🎯 Actividades y tareas
  ACTIVITY_ASSIGNED = 'activity_assigned',
  ACTIVITY_COMPLETED = 'activity_completed',
  ACTIVITY_DUE_SOON = 'activity_due_soon',
  ACTIVITY_OVERDUE = 'activity_overdue',

  // 🏆 Gamificación y logros
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  LEVEL_UP = 'level_up',
  POINTS_EARNED = 'points_earned',
  BADGE_EARNED = 'badge_earned',

  // 👥 Aulas y colaboración  
  CLASSROOM_JOINED = 'classroom_joined',
  CLASSROOM_ANNOUNCEMENT = 'classroom_announcement',
  STUDENT_JOINED_CLASSROOM = 'student_joined_classroom',
  NEW_CLASSROOM_ACTIVITY = 'new_classroom_activity',

  // 📚 Sistema y administrativo
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  ACCOUNT_VERIFIED = 'account_verified',
  PASSWORD_CHANGED = 'password_changed',
  PROFILE_UPDATED = 'profile_updated',

  // 💬 Comunicación
  NEW_MESSAGE = 'new_message',
  COMMENT_RECEIVED = 'comment_received',
  MENTION_RECEIVED = 'mention_received',

  // 📊 Reportes y estadísticas
  WEEKLY_REPORT = 'weekly_report',
  MONTHLY_REPORT = 'monthly_report',
  PROGRESS_UPDATE = 'progress_update',
}

/**
 * Prioridades de las notificaciones
 */
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Canales por donde se puede enviar la notificación
 */
export enum NotificationChannel {
  IN_APP = 'in_app',        // Notificación dentro de la aplicación
  EMAIL = 'email',          // Notificación por correo
  PUSH = 'push',            // Notificación push
  SMS = 'sms',              // Notificación por SMS
}

/**
 * Entidad principal de notificaciones
 * 
 * @description Esta entidad almacena todas las notificaciones del sistema
 * con información completa sobre destinatario, tipo, contenido y estado.
 * 
 * @example
 * ```typescript
 * const notification = new Notification();
 * notification.type = NotificationType.ACHIEVEMENT_UNLOCKED;
 * notification.title = '🏆 ¡Nuevo logro desbloqueado!';
 * notification.message = 'Has completado tu primera actividad de matemáticas';
 * notification.recipient = user;
 * notification.priority = NotificationPriority.HIGH;
 * ```
 */
@Entity('notifications')
@Index(['recipientId', 'isRead', 'createdAt'])
@Index(['type', 'createdAt'])
@Index(['priority', 'createdAt'])
export class Notification {
  /**
   * ID único de la notificación
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tipo específico de notificación
   */
  @Column({
    type: 'enum',
    enum: NotificationType,
    comment: 'Tipo específico de la notificación para categorización y filtrado',
  })
  type: NotificationType;

  /**
   * Título de la notificación (máximo 100 caracteres)
   */
  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Título conciso de la notificación, visible en listas y previews',
  })
  title: string;

  /**
   * Mensaje completo de la notificación
   */
  @Column({
    type: 'text',
    comment: 'Contenido completo de la notificación con detalles',
  })
  message: string;

  /**
   * Datos adicionales en formato JSON
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Datos adicionales específicos del tipo de notificación (IDs, URLs, etc.)',
  })
  metadata?: {
    activityId?: string;
    classroomId?: string;
    achievementId?: string;
    points?: number;
    url?: string;
    imageUrl?: string;
    actionRequired?: boolean;
    expiresAt?: Date;
    [key: string]: any;
  };

  /**
   * Prioridad de la notificación
   */
  @Column({
    type: 'enum',
    enum: NotificationPriority,
    default: NotificationPriority.MEDIUM,
    comment: 'Prioridad para ordenamiento y presentación visual',
  })
  priority: NotificationPriority;

  /**
   * Canales por los que se enviará la notificación
   */
  @Column({
    type: 'simple-array',
    default: [NotificationChannel.IN_APP],
    comment: 'Lista de canales por los que se enviará la notificación',
  })
  channels: NotificationChannel[];

  /**
   * Usuario destinatario de la notificación
   */
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'recipient_id' })
  recipient: User;

  /**
   * ID del usuario destinatario (para queries optimizadas)
   */
  @Column({ name: 'recipient_id' })
  recipientId: string;

  /**
   * Usuario que generó la notificación (opcional)
   */
  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'sender_id' })
  sender?: User;

  /**
   * ID del usuario remitente (opcional)
   */
  @Column({ name: 'sender_id', nullable: true })
  senderId?: string;

  /**
   * Indica si la notificación ha sido leída
   */
  @Column({
    type: 'boolean',
    default: false,
    comment: 'Indica si el usuario ya leyó la notificación',
  })
  isRead: boolean;

  /**
   * Fecha en que se leyó la notificación
   */
  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp de cuando se marcó como leída',
  })
  readAt?: Date;

  /**
   * Indica si la notificación fue enviada exitosamente
   */
  @Column({
    type: 'boolean',
    default: false,
    comment: 'Indica si la notificación fue enviada a todos los canales',
  })
  isSent: boolean;

  /**
   * Fecha en que se envió la notificación
   */
  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp de cuando se envió por última vez',
  })
  sentAt?: Date;

  /**
   * Número de intentos de envío
   */
  @Column({
    type: 'int',
    default: 0,
    comment: 'Contador de intentos de envío para retry logic',
  })
  sendAttempts: number;

  /**
   * Información de errores de envío
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Información sobre errores de envío por canal',
  })
  sendErrors?: {
    [channel in NotificationChannel]?: {
      error: string;
      timestamp: Date;
      retryCount: number;
    };
  };

  /**
   * Fecha de expiración de la notificación
   */
  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Fecha después de la cual la notificación no es relevante',
  })
  expiresAt?: Date;

  /**
   * Fecha de creación
   */
  @CreateDateColumn({ 
    name: 'created_at',
    comment: 'Timestamp de creación de la notificación',
  })
  createdAt: Date;

  /**
   * Fecha de última actualización
   */
  @UpdateDateColumn({ 
    name: 'updated_at',
    comment: 'Timestamp de última modificación',
  })
  updatedAt: Date;

  // =============================================================================
  // MÉTODOS DE UTILIDAD
  // =============================================================================

  /**
   * Marca la notificación como leída
   */
  markAsRead(): void {
    this.isRead = true;
    this.readAt = new Date();
  }

  /**
   * Marca la notificación como enviada
   */
  markAsSent(): void {
    this.isSent = true;
    this.sentAt = new Date();
  }

  /**
   * Verifica si la notificación ha expirado
   */
  isExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  /**
   * Obtiene el color asociado a la prioridad
   */
  getPriorityColor(): string {
    switch (this.priority) {
      case NotificationPriority.LOW:
        return '#6c757d'; // Gris
      case NotificationPriority.MEDIUM:
        return '#007bff'; // Azul
      case NotificationPriority.HIGH:
        return '#fd7e14'; // Naranja
      case NotificationPriority.URGENT:
        return '#dc3545'; // Rojo
      default:
        return '#007bff';
    }
  }

  /**
   * Obtiene el ícono asociado al tipo de notificación
   */
  getTypeIcon(): string {
    switch (this.type) {
      // Actividades
      case NotificationType.ACTIVITY_ASSIGNED:
        return '📝';
      case NotificationType.ACTIVITY_COMPLETED:
        return '✅';
      case NotificationType.ACTIVITY_DUE_SOON:
        return '⏰';
      case NotificationType.ACTIVITY_OVERDUE:
        return '🚨';

      // Gamificación
      case NotificationType.ACHIEVEMENT_UNLOCKED:
        return '🏆';
      case NotificationType.LEVEL_UP:
        return '⬆️';
      case NotificationType.POINTS_EARNED:
        return '💎';
      case NotificationType.BADGE_EARNED:
        return '🏅';

      // Aulas
      case NotificationType.CLASSROOM_JOINED:
        return '🎓';
      case NotificationType.CLASSROOM_ANNOUNCEMENT:
        return '📢';
      case NotificationType.STUDENT_JOINED_CLASSROOM:
        return '👥';
      case NotificationType.NEW_CLASSROOM_ACTIVITY:
        return '📚';

      // Sistema
      case NotificationType.SYSTEM_ANNOUNCEMENT:
        return '📋';
      case NotificationType.ACCOUNT_VERIFIED:
        return '✅';
      case NotificationType.PASSWORD_CHANGED:
        return '🔐';
      case NotificationType.PROFILE_UPDATED:
        return '👤';

      // Comunicación
      case NotificationType.NEW_MESSAGE:
        return '💬';
      case NotificationType.COMMENT_RECEIVED:
        return '💭';
      case NotificationType.MENTION_RECEIVED:
        return '🏷️';

      // Reportes
      case NotificationType.WEEKLY_REPORT:
      case NotificationType.MONTHLY_REPORT:
      case NotificationType.PROGRESS_UPDATE:
        return '📊';

      default:
        return '🔔';
    }
  }

  /**
   * Genera una representación resumida de la notificación
   */
  toSummary() {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      message: this.message.substring(0, 100) + (this.message.length > 100 ? '...' : ''),
      priority: this.priority,
      isRead: this.isRead,
      createdAt: this.createdAt,
      icon: this.getTypeIcon(),
      color: this.getPriorityColor(),
      metadata: this.metadata,
    };
  }
}