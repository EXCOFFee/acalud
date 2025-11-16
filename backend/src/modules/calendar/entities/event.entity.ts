/**
 * 🗓️ ENTIDAD EVENT - GESTIÓN DE EVENTOS DEL CALENDARIO
 * 
 * Entidad principal para manejar todos los eventos del sistema académico.
 * Soporta eventos de diferentes tipos: clases, exámenes, reuniones, recordatorios.
 * 
 * FUNCIONALIDADES:
 * - Gestión completa de eventos académicos
 * - Soporte para eventos recurrentes
 * - Ubicaciones físicas y virtuales
 * - Invitaciones y asistencia
 * - Integración con notificaciones
 * - Sincronización con calendarios externos
 * 
 * RELACIONES:
 * - Event -> User (creador)
 * - Event -> Classroom (opcional)
 * - Event -> Activity (opcional)
 * - Event -> EventCategory (categoría)
 * - Event -> EventAttendee[] (asistentes)
 * - Event -> EventReminder[] (recordatorios)
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
// Nota: Estas importaciones se habilitarán cuando las entidades estén disponibles
// import { User } from '../../users/entities/user.entity';
// import { Classroom } from '../../classrooms/entities/classroom.entity';
// import { Activity } from '../../activities/entities/activity.entity';
import { EventCategory } from './event-category.entity';
import { EventAttendee } from './event-attendee.entity';
import { EventReminder } from './event-reminder.entity';

/**
 * 📊 Enumeraciones para tipado fuerte
 */
export enum EventType {
  CLASS = 'class',
  EXAM = 'exam',
  MEETING = 'meeting',
  DEADLINE = 'deadline',
  REMINDER = 'reminder',
  WORKSHOP = 'workshop',
  CONFERENCE = 'conference',
  BREAK = 'break',
  HOLIDAY = 'holiday',
  OTHER = 'other',
}

export enum EventStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
  IN_PROGRESS = 'in_progress',
  POSTPONED = 'postponed',
}

export enum RecurrenceType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export enum LocationType {
  PHYSICAL = 'physical',
  VIRTUAL = 'virtual',
  HYBRID = 'hybrid',
}

/**
 * 🗓️ Entidad principal Event
 */
@Entity('events')
@Index(['startDate', 'endDate'])
@Index(['createdBy', 'status'])
@Index(['type', 'status'])
export class Event {
  /**
   * 🆔 Identificador único del evento
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 📝 Información básica del evento
   */
  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({
    type: 'enum',
    enum: EventType,
    default: EventType.OTHER,
  })
  type: EventType;

  @Column({
    type: 'enum',
    enum: EventStatus,
    default: EventStatus.DRAFT,
  })
  status: EventStatus;

  /**
   * ⏰ Información temporal del evento
   */
  @Column({ type: 'timestamp' })
  @Index()
  startDate: Date;

  @Column({ type: 'timestamp' })
  @Index()
  endDate: Date;

  @Column({ type: 'boolean', default: false })
  isAllDay: boolean;

  @Column({ type: 'varchar', length: 50, nullable: true })
  timezone?: string;

  /**
   * 🔄 Configuración de recurrencia
   */
  @Column({
    type: 'enum',
    enum: RecurrenceType,
    default: RecurrenceType.NONE,
  })
  recurrenceType: RecurrenceType;

  @Column({ type: 'json', nullable: true })
  recurrenceRule?: {
    interval?: number;
    daysOfWeek?: number[]; // 0=Sunday, 1=Monday, etc.
    dayOfMonth?: number;
    monthOfYear?: number;
    endDate?: string;
    occurrences?: number;
  };

  @Column({ type: 'uuid', nullable: true })
  parentEventId?: string; // Para eventos recurrentes

  /**
   * 📍 Información de ubicación
   */
  @Column({
    type: 'enum',
    enum: LocationType,
    default: LocationType.PHYSICAL,
  })
  locationType: LocationType;

  @Column({ type: 'varchar', length: 500, nullable: true })
  locationName?: string;

  @Column({ type: 'text', nullable: true })
  locationAddress?: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  virtualMeetingUrl?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  virtualMeetingId?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  virtualMeetingPassword?: string;

  /**
   * 👥 Configuración de asistencia
   */
  @Column({ type: 'boolean', default: false })
  requiresAttendance: boolean;

  @Column({ type: 'int', nullable: true })
  maxAttendees?: number;

  @Column({ type: 'boolean', default: true })
  allowGuestInvites: boolean;

  @Column({ type: 'boolean', default: false })
  isPrivate: boolean;

  @Column({ type: 'varchar', length: 500, nullable: true })
  locationUrl?: string;

  @Column({ type: 'boolean', default: false })
  requiresApproval: boolean;

  /**
   * 🔔 Configuración de notificaciones
   */
  @Column({ type: 'boolean', default: true })
  sendNotifications: boolean;

  @Column({ type: 'json', nullable: true })
  notificationSettings?: {
    email?: boolean;
    inApp?: boolean;
    sms?: boolean;
    push?: boolean;
    reminderMinutes?: number[];
  };

  /**
   * 🏷️ Metadatos y configuración adicional
   */
  @Column({ type: 'json', nullable: true })
  metadata?: {
    color?: string;
    icon?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    tags?: string[];
    customFields?: Record<string, unknown>;
    externalCalendarIds?: Record<string, string>; // Google, Outlook, etc.
    cancellationReason?: string; // Razón de cancelación del evento
  };

  /**
   * 🔗 Relaciones con otras entidades
   */

  // Creador del evento
  @Column({ type: 'uuid' })
  @Index()
  createdBy: string;

  // Organizador del evento (puede ser diferente al creador)
  @Column({ type: 'uuid' })
  @Index()
  organizerId: string;

  // Usuario que realizó la última actualización
  @Column({ type: 'uuid', nullable: true })
  updatedBy?: string;

  // Nota: Relación con User se habilitará cuando esté disponible
  // @ManyToOne(() => User, { eager: false })
  // @JoinColumn({ name: 'createdBy' })
  // creator: User;

  // Categoría del evento (opcional)
  @Column({ type: 'uuid', nullable: true })
  categoryId?: string;

  @ManyToOne(() => EventCategory, category => category.events, { 
    eager: false,
    nullable: true 
  })
  @JoinColumn({ name: 'categoryId' })
  category?: EventCategory;

  // Aula asociada (opcional)
  @Column({ type: 'uuid', nullable: true })
  classroomId?: string;

  // Nota: Relación con Classroom se habilitará cuando esté disponible
  // @ManyToOne(() => Classroom, { eager: false, nullable: true })
  // @JoinColumn({ name: 'classroomId' })
  // classroom?: Classroom;

  // Actividad asociada (opcional)
  @Column({ type: 'uuid', nullable: true })
  activityId?: string;

  // Nota: Relación con Activity se habilitará cuando esté disponible
  // @ManyToOne(() => Activity, { eager: false, nullable: true })
  // @JoinColumn({ name: 'activityId' })
  // activity?: Activity;

  // Asistentes del evento
  @OneToMany(() => EventAttendee, attendee => attendee.event, {
    cascade: ['insert', 'update'],
    eager: false,
  })
  attendees: EventAttendee[];

  // Recordatorios del evento
  @OneToMany(() => EventReminder, reminder => reminder.event, {
    cascade: ['insert', 'update', 'remove'],
    eager: false,
  })
  reminders: EventReminder[];

  /**
   * 🕒 Timestamps automáticos
   */
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * 🧮 Propiedades calculadas
   */

  /**
   * Calcula la duración del evento en minutos
   */
  get durationMinutes(): number {
    return Math.floor((this.endDate.getTime() - this.startDate.getTime()) / (1000 * 60));
  }

  /**
   * Verifica si el evento está actualmente en progreso
   */
  get isInProgress(): boolean {
    const now = new Date();
    return now >= this.startDate && now <= this.endDate && this.status === EventStatus.PUBLISHED;
  }

  /**
   * Verifica si el evento ha terminado
   */
  get isCompleted(): boolean {
    const now = new Date();
    return now > this.endDate || this.status === EventStatus.COMPLETED;
  }

  /**
   * Verifica si el evento es recurrente
   */
  get isRecurring(): boolean {
    return this.recurrenceType !== RecurrenceType.NONE;
  }

  /**
   * Obtiene el color del evento (por defecto o personalizado)
   */
  get eventColor(): string {
    return this.metadata?.color || this.getDefaultColorByType();
  }

  /**
   * 🎨 Métodos de utilidad
   */

  /**
   * Obtiene el color por defecto según el tipo de evento
   */
  private getDefaultColorByType(): string {
    const colorMap = {
      [EventType.CLASS]: '#4F46E5',      // Indigo
      [EventType.EXAM]: '#DC2626',       // Red
      [EventType.MEETING]: '#059669',    // Green
      [EventType.DEADLINE]: '#D97706',   // Orange
      [EventType.REMINDER]: '#7C3AED',   // Purple
      [EventType.WORKSHOP]: '#0891B2',   // Cyan
      [EventType.CONFERENCE]: '#BE185D', // Pink
      [EventType.BREAK]: '#6B7280',      // Gray
      [EventType.HOLIDAY]: '#EF4444',    // Red
      [EventType.OTHER]: '#374151',      // Dark Gray
    };
    return colorMap[this.type] || '#374151';
  }

  /**
   * Verifica si hay conflicto de tiempo con otro evento
   */
  hasTimeConflictWith(otherEvent: Event): boolean {
    return (
      (this.startDate < otherEvent.endDate && this.endDate > otherEvent.startDate) ||
      (otherEvent.startDate < this.endDate && otherEvent.endDate > this.startDate)
    );
  }

  /**
   * Genera la próxima ocurrencia para eventos recurrentes
   */
  getNextOccurrence(): Date | null {
    if (!this.isRecurring || !this.recurrenceRule) {
      return null;
    }

    const interval = this.recurrenceRule.interval || 1;
    const nextDate = new Date(this.startDate);

    switch (this.recurrenceType) {
      case RecurrenceType.DAILY:
        nextDate.setDate(nextDate.getDate() + interval);
        break;
      case RecurrenceType.WEEKLY:
        nextDate.setDate(nextDate.getDate() + (7 * interval));
        break;
      case RecurrenceType.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;
      case RecurrenceType.YEARLY:
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;
      default:
        return null;
    }

    // Verificar si excede la fecha límite
    if (this.recurrenceRule.endDate && nextDate > new Date(this.recurrenceRule.endDate)) {
      return null;
    }

    return nextDate;
  }

  /**
   * Convierte el evento a formato de calendario estándar (iCal)
   */
  toICalFormat(): string {
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';
    };

    return [
      'BEGIN:VEVENT',
      `UID:${this.id}@acalud.edu`,
      `DTSTART:${formatDate(this.startDate)}`,
      `DTEND:${formatDate(this.endDate)}`,
      `SUMMARY:${this.title}`,
      `DESCRIPTION:${this.description || ''}`,
      `LOCATION:${this.locationName || ''}`,
      `STATUS:${this.status.toUpperCase()}`,
      `CREATED:${formatDate(this.createdAt)}`,
      `LAST-MODIFIED:${formatDate(this.updatedAt)}`,
      'END:VEVENT',
    ].join('\r\n');
  }
}