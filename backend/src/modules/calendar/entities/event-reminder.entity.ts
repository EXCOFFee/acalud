/**
 * 🔔 ENTIDAD EVENT REMINDER - SISTEMA DE RECORDATORIOS
 * 
 * Gestiona recordatorios automáticos para eventos del calendario.
 * Soporta múltiples tipos de notificaciones y horarios personalizados.
 * 
 * FUNCIONALIDADES:
 * - Recordatorios múltiples por evento
 * - Diferentes canales de notificación
 * - Programación flexible de horarios
 * - Seguimiento de entregas
 * - Recordatorios personalizados por usuario
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Event } from './event.entity';

/**
 * 📱 Enumeraciones para tipado fuerte
 */
export enum ReminderType {
  EMAIL = 'email',           // Recordatorio por email
  IN_APP = 'in_app',         // Notificación in-app
  SMS = 'sms',               // Mensaje de texto
  PUSH = 'push',             // Notificación push
  DESKTOP = 'desktop',       // Notificación de escritorio
  WEBHOOK = 'webhook',       // Webhook personalizado
}

export enum ReminderStatus {
  PENDING = 'pending',       // Pendiente de envío
  SENT = 'sent',             // Enviado exitosamente
  FAILED = 'failed',         // Falló el envío
  CANCELLED = 'cancelled',   // Cancelado
  DELIVERED = 'delivered',   // Entregado y confirmado
}

export enum ReminderTrigger {
  TIME_BEFORE = 'time_before',     // X minutos antes del evento
  EXACT_TIME = 'exact_time',       // Hora exacta específica
  AFTER_EVENT = 'after_event',     // X minutos después del evento
  CUSTOM_SCHEDULE = 'custom_schedule', // Programación personalizada
}

interface ReminderEventContext {
  title?: string;
  startDate?: Date | string;
  locationName?: string;
  [key: string]: unknown;
}

interface ReminderUserContext {
  name?: string;
  email?: string;
  [key: string]: unknown;
}

/**
 * 🔔 Entidad EventReminder
 */
@Entity('event_reminders')
@Index(['eventId', 'status'])
@Index(['scheduledFor', 'status'])
@Index(['type', 'status'])
export class EventReminder {
  /**
   * 🆔 Identificador único del recordatorio
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 🔗 Relación con el evento
   */
  @Column({ type: 'uuid' })
  @Index()
  eventId: string;

  @ManyToOne(() => Event, event => event.reminders, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  /**
   * 👤 Usuario destinatario (opcional, si es null aplica a todos los asistentes)
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  userId?: string;

  // Nota: Relación con User se manejará cuando esté disponible
  // @ManyToOne(() => User, { eager: false, nullable: true })
  // @JoinColumn({ name: 'userId' })
  // user?: User;

  /**
   * 📝 Configuración del recordatorio
   */
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({
    type: 'enum',
    enum: ReminderType,
    default: ReminderType.IN_APP,
  })
  type: ReminderType;

  /**
   * ⏰ Configuración de programación
   */
  @Column({
    type: 'enum',
    enum: ReminderTrigger,
    default: ReminderTrigger.TIME_BEFORE,
  })
  trigger: ReminderTrigger;

  @Column({ type: 'int', nullable: true })
  minutesBefore?: number; // Para trigger TIME_BEFORE

  @Column({ type: 'timestamp', nullable: true })
  @Index()
  scheduledFor?: Date; // Fecha/hora exacta para envío

  @Column({ type: 'json', nullable: true })
  customSchedule?: {
    pattern?: 'daily' | 'weekly' | 'monthly';
    daysOfWeek?: number[];
    time?: string; // HH:MM format
    repeatCount?: number;
  };

  /**
   * 📊 Estado y seguimiento
   */
  @Column({
    type: 'enum',
    enum: ReminderStatus,
    default: ReminderStatus.PENDING,
  })
  status: ReminderStatus;

  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  deliveredAt?: Date;

  @Column({ type: 'int', default: 0 })
  attemptCount: number;

  @Column({ type: 'int', default: 3 })
  maxAttempts: number;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string;

  /**
   * ⚙️ Configuración avanzada
   */
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'int', default: 1 })
  priority: number; // 1 = alta, 5 = baja

  @Column({ type: 'json', nullable: true })
  templateData?: Record<string, unknown>; // Datos para plantillas

  @Column({ type: 'json', nullable: true })
  deliveryOptions?: {
    retryInterval?: number; // Minutos entre reintentos
    requireConfirmation?: boolean;
    expiresAt?: string; // ISO string
    customHeaders?: Record<string, string>; // Para webhooks
    smsOptions?: {
      shortCode?: string;
      template?: string;
    };
    emailOptions?: {
      template?: string;
      attachments?: string[];
      replyTo?: string;
    };
  };

  /**
   * 📈 Metadatos y tracking
   */
  @Column({ type: 'json', nullable: true })
  metadata?: {
    source?: 'automatic' | 'manual' | 'template' | 'bulk';
    createdBy?: string;
    campaignId?: string;
    tags?: string[];
    analytics?: {
      opened?: boolean;
      clicked?: boolean;
      dismissed?: boolean;
    };
  };

  /**
   * � Campos de auditoría
   */
  @Column({ type: 'uuid', nullable: true })
  createdBy?: string; // Usuario que creó el recordatorio

  /**
   * �🕒 Timestamps automáticos
   */
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * 🧮 Propiedades calculadas
   */

  /**
   * Verifica si el recordatorio está pendiente de envío
   */
  get isPending(): boolean {
    return this.status === ReminderStatus.PENDING && this.isActive;
  }

  /**
   * Verifica si el recordatorio fue enviado exitosamente
   */
  get wasSent(): boolean {
    return this.status === ReminderStatus.SENT || this.status === ReminderStatus.DELIVERED;
  }

  /**
   * Verifica si el recordatorio ha expirado
   */
  get isExpired(): boolean {
    if (!this.deliveryOptions?.expiresAt) {
      return false;
    }
    return new Date() > new Date(this.deliveryOptions.expiresAt);
  }

  /**
   * Verifica si puede reintentarse el envío
   */
  get canRetry(): boolean {
    return this.status === ReminderStatus.FAILED &&
           this.attemptCount < this.maxAttempts &&
           !this.isExpired;
  }

  /**
   * Calcula cuándo debe enviarse el recordatorio
   */
  get shouldSendAt(): Date | null {
    if (this.scheduledFor) {
      return this.scheduledFor;
    }

    if (this.trigger === ReminderTrigger.TIME_BEFORE && this.minutesBefore && this.event) {
      const sendTime = new Date(this.event.startDate.getTime() - (this.minutesBefore * 60 * 1000));
      return sendTime;
    }

    return null;
  }

  /**
   * 🔧 Métodos de utilidad
   */

  /**
   * Programa el recordatorio basado en la configuración
   */
  schedule(eventStartDate: Date): void {
    switch (this.trigger) {
      case ReminderTrigger.TIME_BEFORE:
        if (this.minutesBefore) {
          this.scheduledFor = new Date(eventStartDate.getTime() - (this.minutesBefore * 60 * 1000));
        }
        break;
        
      case ReminderTrigger.AFTER_EVENT:
        if (this.minutesBefore) { // Reutilizamos el campo pero con lógica inversa
          this.scheduledFor = new Date(eventStartDate.getTime() + (this.minutesBefore * 60 * 1000));
        }
        break;
        
      case ReminderTrigger.EXACT_TIME:
        // scheduledFor ya debe estar configurado
        break;
        
      case ReminderTrigger.CUSTOM_SCHEDULE:
        // Lógica personalizada basada en customSchedule
        this.scheduleCustom(eventStartDate);
        break;
    }
  }

  /**
   * Programa recordatorio personalizado
   */
  private scheduleCustom(eventStartDate: Date): void {
    if (!this.customSchedule) return;

    const schedule = this.customSchedule;
    const baseDate = new Date(eventStartDate);

    if (schedule.time) {
      const [hours, minutes] = schedule.time.split(':').map(Number);
      baseDate.setHours(hours, minutes, 0, 0);
    }

    // Ajustar según el patrón
    switch (schedule.pattern) {
      case 'daily':
        // Enviar cada día hasta el evento
        this.scheduledFor = new Date(baseDate.getTime() - (24 * 60 * 60 * 1000));
        break;
        
      case 'weekly':
        // Enviar una semana antes
        this.scheduledFor = new Date(baseDate.getTime() - (7 * 24 * 60 * 60 * 1000));
        break;
        
      case 'monthly': {
        // Enviar un mes antes
        const monthBefore = new Date(baseDate);
        monthBefore.setMonth(monthBefore.getMonth() - 1);
        this.scheduledFor = monthBefore;
        break;
      }
    }
  }

  /**
   * Marca el recordatorio como enviado
   */
  markAsSent(): void {
    this.status = ReminderStatus.SENT;
    this.sentAt = new Date();
    this.attemptCount++;
  }

  /**
   * Marca el recordatorio como fallido
   */
  markAsFailed(errorMessage?: string): void {
    this.status = ReminderStatus.FAILED;
    this.attemptCount++;
    if (errorMessage) {
      this.errorMessage = errorMessage;
    }
  }

  /**
   * Marca el recordatorio como entregado
   */
  markAsDelivered(): void {
    this.status = ReminderStatus.DELIVERED;
    this.deliveredAt = new Date();
  }

  /**
   * Cancela el recordatorio
   */
  cancel(reason?: string): void {
    this.status = ReminderStatus.CANCELLED;
    this.isActive = false;
    if (reason) {
      this.errorMessage = reason;
    }
  }

  /**
   * Prepara el recordatorio para reenvío
   */
  prepareForRetry(): void {
    if (this.canRetry) {
      this.status = ReminderStatus.PENDING;
      this.errorMessage = null;
      
      // Programar reenvío con intervalo
      if (this.deliveryOptions?.retryInterval) {
        this.scheduledFor = new Date(Date.now() + (this.deliveryOptions.retryInterval * 60 * 1000));
      }
    }
  }

  /**
   * Genera el contenido del mensaje usando plantilla
   */
  generateMessage(eventData: ReminderEventContext, userData?: ReminderUserContext): string {
    let content = this.message || this.title;
    
    // Reemplazar variables de plantilla
    const variables = {
      eventTitle: eventData.title,
      eventDate: eventData.startDate,
      eventLocation: eventData.locationName,
      userName: userData?.name,
      userEmail: userData?.email,
      minutesBefore: this.minutesBefore,
      ...this.templateData,
    };

    // Reemplazar placeholders
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      content = content.replace(placeholder, String(value || ''));
    });

    return content;
  }

  /**
   * Obtiene configuración de entrega específica por tipo
   */
  getDeliveryConfig(): Record<string, unknown> {
    const baseConfig = {
      id: this.id,
      type: this.type,
      title: this.title,
      message: this.message,
      priority: this.priority,
      scheduledFor: this.scheduledFor,
    };

    switch (this.type) {
      case ReminderType.EMAIL:
        return {
          ...baseConfig,
          ...this.deliveryOptions?.emailOptions,
        };
        
      case ReminderType.SMS:
        return {
          ...baseConfig,
          ...this.deliveryOptions?.smsOptions,
        };
        
      case ReminderType.WEBHOOK:
        return {
          ...baseConfig,
          headers: this.deliveryOptions?.customHeaders,
          payload: this.templateData,
        };
        
      default:
        return baseConfig;
    }
  }

  /**
   * Convierte a formato de exportación
   */
  toExportFormat(): object {
    return {
      id: this.id,
      eventId: this.eventId,
      userId: this.userId,
      title: this.title,
      type: this.type,
      trigger: this.trigger,
      scheduledFor: this.scheduledFor,
      status: this.status,
      sentAt: this.sentAt,
      deliveredAt: this.deliveredAt,
      attemptCount: this.attemptCount,
      priority: this.priority,
      createdAt: this.createdAt,
    };
  }
}