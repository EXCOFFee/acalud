/**
 * 👥 ENTIDAD EVENT ATTENDEE - GESTIÓN DE ASISTENTES
 * 
 * Maneja la relación entre eventos y sus asistentes, incluyendo
 * estados de invitación, respuestas, y seguimiento de asistencia.
 * 
 * FUNCIONALIDADES:
 * - Estados de invitación (pendiente, aceptada, rechazada)
 * - Seguimiento de asistencia real
 * - Roles específicos en eventos
 * - Notificaciones personalizadas
 * - Historial de cambios
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
  Unique,
} from 'typeorm';
import { Event } from './event.entity';

/**
 * 📋 Enumeraciones para tipado fuerte
 */
export enum InvitationStatus {
  PENDING = 'pending',     // Invitación enviada, sin respuesta
  ACCEPTED = 'accepted',   // Invitación aceptada
  DECLINED = 'declined',   // Invitación rechazada
  TENTATIVE = 'tentative', // Respuesta tentativa
  NO_RESPONSE = 'no_response', // Sin respuesta después del evento
}

export enum AttendanceStatus {
  NOT_MARKED = 'not_marked',   // Asistencia no marcada
  PRESENT = 'present',         // Asistió al evento
  ABSENT = 'absent',           // No asistió al evento
  LATE = 'late',               // Llegó tarde
  LEFT_EARLY = 'left_early',   // Se fue temprano
  EXCUSED = 'excused',         // Ausencia justificada
}

export enum AttendeeRole {
  PARTICIPANT = 'participant', // Participante regular
  ORGANIZER = 'organizer',     // Organizador del evento
  PRESENTER = 'presenter',     // Presentador/Expositor
  MODERATOR = 'moderator',     // Moderador
  OBSERVER = 'observer',       // Observador (solo lectura)
  ASSISTANT = 'assistant',     // Asistente del organizador
}

/**
 * 👥 Entidad EventAttendee
 */
@Entity('event_attendees')
@Unique(['eventId', 'userId']) // Un usuario no puede estar duplicado en el mismo evento
@Index(['eventId', 'invitationStatus'])
@Index(['userId', 'attendanceStatus'])
export class EventAttendee {
  /**
   * 🆔 Identificador único del asistente
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 🔗 Referencias a evento y usuario
   */
  @Column({ type: 'uuid' })
  @Index()
  eventId: string;

  @ManyToOne(() => Event, event => event.attendees, {
    onDelete: 'CASCADE',
    eager: false,
  })
  @JoinColumn({ name: 'eventId' })
  event: Event;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  // Nota: Relación con User se manejará cuando esté disponible
  // @ManyToOne(() => User, { eager: false })
  // @JoinColumn({ name: 'userId' })
  // user: User;

  /**
   * 📨 Estado de la invitación
   */
  @Column({
    type: 'enum',
    enum: InvitationStatus,
    default: InvitationStatus.PENDING,
  })
  invitationStatus: InvitationStatus;

  @Column({ type: 'timestamp', nullable: true })
  invitationSentAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  responseAt?: Date;

  @Column({ type: 'text', nullable: true })
  responseMessage?: string;

  /**
   * 📋 Información de asistencia
   */
  @Column({
    type: 'enum',
    enum: AttendanceStatus,
    default: AttendanceStatus.NOT_MARKED,
  })
  attendanceStatus: AttendanceStatus;

  @Column({ type: 'timestamp', nullable: true })
  checkedInAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  checkedOutAt?: Date;

  @Column({ type: 'uuid', nullable: true })
  markedBy?: string; // Usuario que marcó la asistencia

  /**
   * 👔 Rol del asistente en el evento
   */
  @Column({
    type: 'enum',
    enum: AttendeeRole,
    default: AttendeeRole.PARTICIPANT,
  })
  role: AttendeeRole;

  /**
   * 🔔 Configuración de notificaciones
   */
  @Column({ type: 'boolean', default: true })
  receiveReminders: boolean;

  @Column({ type: 'json', nullable: true })
  notificationPreferences?: {
    email?: boolean;
    inApp?: boolean;
    sms?: boolean;
    push?: boolean;
    customReminderMinutes?: number[];
  };

  /**
   * 📝 Información adicional
   */
  @Column({ type: 'text', nullable: true })
  notes?: string; // Notas del organizador sobre este asistente

  @Column({ type: 'text', nullable: true })
  attendeeNotes?: string; // Notas del propio asistente

  @Column({ type: 'json', nullable: true })
  customFields?: Record<string, unknown>; // Campos personalizados por evento

  /**
   * 📊 Metadatos y seguimiento
   */
  @Column({ type: 'json', nullable: true })
  metadata?: {
    invitedBy?: string; // Usuario que envió la invitación
    invitationMethod?: 'email' | 'inApp' | 'direct' | 'bulk';
    source?: string; // Fuente de la invitación
    priority?: 'low' | 'medium' | 'high';
    tags?: string[];
    permissions?: {
      canInviteOthers?: boolean;
      canModifyEvent?: boolean;
      canSeeAttendees?: boolean;
    };
  };

  /**
   * � Campos de auditoría
   */
  @Column({ type: 'uuid', nullable: true })
  addedBy?: string; // Usuario que agregó este asistente

  @Column({ type: 'uuid', nullable: true })
  updatedBy?: string; // Usuario que realizó la última actualización

  /**
   * �🕒 Timestamps automáticos
   */
  @CreateDateColumn()
  createdAt: Date; // Fecha de creación de la invitación

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * 🧮 Propiedades calculadas
   */

  /**
   * Verifica si el usuario ha respondido a la invitación
   */
  get hasResponded(): boolean {
    return this.invitationStatus !== InvitationStatus.PENDING &&
           this.invitationStatus !== InvitationStatus.NO_RESPONSE;
  }

  /**
   * Verifica si el usuario aceptó la invitación
   */
  get hasAccepted(): boolean {
    return this.invitationStatus === InvitationStatus.ACCEPTED;
  }

  /**
   * Verifica si el usuario asistió al evento
   */
  get didAttend(): boolean {
    return this.attendanceStatus === AttendanceStatus.PRESENT ||
           this.attendanceStatus === AttendanceStatus.LATE;
  }

  /**
   * Calcula el tiempo de permanencia en el evento (si tiene check-in/out)
   */
  get attendanceDurationMinutes(): number | null {
    if (!this.checkedInAt || !this.checkedOutAt) {
      return null;
    }
    return Math.floor((this.checkedOutAt.getTime() - this.checkedInAt.getTime()) / (1000 * 60));
  }

  /**
   * Verifica si puede modificar el evento
   */
  get canModifyEvent(): boolean {
    return this.role === AttendeeRole.ORGANIZER || 
           this.metadata?.permissions?.canModifyEvent === true;
  }

  /**
   * Verifica si puede invitar a otros
   */
  get canInviteOthers(): boolean {
    return this.role === AttendeeRole.ORGANIZER ||
           this.role === AttendeeRole.MODERATOR ||
           this.metadata?.permissions?.canInviteOthers === true;
  }

  /**
   * 🔧 Métodos de utilidad
   */

  /**
   * Actualiza el estado de la invitación
   */
  updateInvitationStatus(
    status: InvitationStatus,
    message?: string
  ): void {
    this.invitationStatus = status;
    this.responseAt = new Date();
    if (message) {
      this.responseMessage = message;
    }
  }

  /**
   * Marca la asistencia del usuario
   */
  markAttendance(
    status: AttendanceStatus,
    markedBy?: string,
    notes?: string
  ): void {
    this.attendanceStatus = status;
    this.markedBy = markedBy;
    
    if (status === AttendanceStatus.PRESENT || status === AttendanceStatus.LATE) {
      this.checkedInAt = new Date();
    }
    
    if (notes) {
      this.notes = notes;
    }
  }

  /**
   * Registra check-in del asistente
   */
  checkIn(): void {
    this.checkedInAt = new Date();
    if (this.attendanceStatus === AttendanceStatus.NOT_MARKED) {
      this.attendanceStatus = AttendanceStatus.PRESENT;
    }
  }

  /**
   * Registra check-out del asistente
   */
  checkOut(): void {
    this.checkedOutAt = new Date();
  }

  /**
   * Verifica si el usuario llegó tarde
   */
  isLate(eventStartTime: Date): boolean {
    if (!this.checkedInAt) {
      return false;
    }
    return this.checkedInAt > eventStartTime;
  }

  /**
   * Actualiza las preferencias de notificación
   */
  updateNotificationPreferences(preferences: Partial<EventAttendee['notificationPreferences']>): void {
    this.notificationPreferences = {
      ...this.notificationPreferences,
      ...preferences,
    };
  }

  /**
   * Obtiene el tiempo de respuesta a la invitación
   */
  getResponseTimeHours(): number | null {
    if (!this.invitationSentAt || !this.responseAt) {
      return null;
    }
    return Math.floor((this.responseAt.getTime() - this.invitationSentAt.getTime()) / (1000 * 60 * 60));
  }

  /**
   * Genera resumen del asistente para reportes
   */
  toSummary(): object {
    return {
      id: this.id,
      userId: this.userId,
      role: this.role,
      invitationStatus: this.invitationStatus,
      attendanceStatus: this.attendanceStatus,
      hasResponded: this.hasResponded,
      hasAccepted: this.hasAccepted,
      didAttend: this.didAttend,
      responseTime: this.getResponseTimeHours(),
      attendanceDuration: this.attendanceDurationMinutes,
      checkedInAt: this.checkedInAt,
      checkedOutAt: this.checkedOutAt,
      createdAt: this.createdAt,
    };
  }
}