/**
 * 🔄 CALENDAR WEBSOCKET GATEWAY - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Gateway responsable de las notificaciones en tiempo real del calendario:
 * - Notificaciones de eventos próximos
 * - Actualizaciones de eventos en tiempo real
 * - Recordatorios instantáneos
 * - Cambios en la asistencia a eventos
 * - Invitaciones a eventos
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Responsabilidad única de comunicación WebSocket para calendario
 * - OCP: Extensible para nuevos tipos de notificaciones
 * - LSP: Implementa contratos WebSocket estándar
 * - ISP: Interfaces específicas por tipo de notificación
 * - DIP: Depende de abstracciones del servicio de calendario
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CalendarService } from './calendar-simple.service';
import { User } from '../users/user.entity';
import { Event } from './entities/event.entity';
import { EventAttendee } from './entities/event-attendee.entity';
import { EventReminder } from './entities/event-reminder.entity';

/**
 * Interface para usuarios conectados
 */
interface ConnectedUser {
  userId: number;
  socketId: string;
  user: User;
}

/**
 * Interface para notificación de evento
 */
interface EventNotification {
  type: 'event_created' | 'event_updated' | 'event_deleted' | 'event_reminder' | 'event_invitation';
  event: Event;
  message: string;
  timestamp: Date;
  recipientId?: number;
}

/**
 * Interface para notificación de asistencia
 */
interface AttendanceNotification {
  type: 'attendance_confirmed' | 'attendance_declined' | 'attendance_pending';
  eventId: number;
  attendee: EventAttendee;
  message: string;
  timestamp: Date;
}

/**
 * Interface para notificación de recordatorio
 */
interface ReminderNotification {
  type: 'reminder_alert';
  reminder: EventReminder;
  event: Event;
  message: string;
  timestamp: Date;
  userId: number;
}

type CalendarNotification = EventNotification | AttendanceNotification | ReminderNotification;

interface CalendarJwtPayload {
  sub: number;
  user: User;
  exp?: number;
  iat?: number;
}

/**
 * Interface para datos de suscripción a calendario
 */
interface CalendarSubscriptionData {
  calendarId?: number;
  userId?: number;
  eventTypes?: string[];
}

/**
 * Gateway WebSocket para notificaciones en tiempo real del calendario
 * 
 * @description Este gateway maneja todas las comunicaciones WebSocket relacionadas
 * con el sistema de calendario, incluyendo notificaciones de eventos, recordatorios
 * y actualizaciones en tiempo real.
 * 
 * @example
 * ```typescript
 * // Cliente se conecta y suscribe a notificaciones
 * socket.emit('subscribe_calendar', { userId: 123, eventTypes: ['meeting', 'class'] });
 * 
 * // Recibir notificaciones
 * socket.on('calendar_notification', (notification) => {
 *   console.log('Nueva notificación:', notification);
 * });
 * ```
 */
@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:5173'], // Frontend URLs
    credentials: true,
  },
  namespace: '/calendar',
})
@Injectable()
export class CalendarGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  /**
   * Logger para operaciones WebSocket
   */
  private readonly logger = new Logger(CalendarGateway.name);

  /**
   * Servidor WebSocket
   */
  @WebSocketServer()
  server: Server;

  /**
   * Mapa de usuarios conectados
   */
  private connectedUsers = new Map<string, ConnectedUser>();

  /**
   * Mapa de suscripciones por usuario
   */
  private userSubscriptions = new Map<number, CalendarSubscriptionData>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly calendarService: CalendarService,
  ) {}

  /**
   * Inicialización del gateway
   */
  afterInit(_server: Server) {
    this.logger.log('🔄 Calendar WebSocket Gateway inicializado');
    
    // Configurar intervalos para recordatorios automáticos
    this.setupReminderScheduler();
  }

  /**
   * Maneja nuevas conexiones WebSocket
   */
  async handleConnection(client: Socket) {
    try {
      this.logger.log(`🔌 Nueva conexión WebSocket: ${client.id}`);

      // Extraer token de autorización
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        this.logger.warn(`❌ Conexión rechazada - Sin token: ${client.id}`);
        client.disconnect();
        return;
      }

      // Verificar y decodificar token
      const payload = await this.verifyToken(token);
      if (!payload) {
        this.logger.warn(`❌ Conexión rechazada - Token inválido: ${client.id}`);
        client.disconnect();
        return;
      }

      // Almacenar información del usuario conectado
      const connectedUser: ConnectedUser = {
        userId: payload.sub,
        socketId: client.id,
        user: payload.user,
      };

      this.connectedUsers.set(client.id, connectedUser);
      this.logger.log(`✅ Usuario autenticado conectado: ${payload.user.email} (${client.id})`);

      // Enviar eventos próximos al usuario
      await this.sendUpcomingEvents(client, payload.sub);

    } catch (error) {
      this.logger.error(`❌ Error en conexión WebSocket: ${error.message}`, error.stack);
      client.disconnect();
    }
  }

  /**
   * Maneja desconexiones WebSocket
   */
  handleDisconnect(client: Socket) {
    const connectedUser = this.connectedUsers.get(client.id);
    
    if (connectedUser) {
      this.logger.log(`🔌 Usuario desconectado: ${connectedUser.user.email} (${client.id})`);
      this.connectedUsers.delete(client.id);
      this.userSubscriptions.delete(connectedUser.userId);
    } else {
      this.logger.log(`🔌 Cliente desconectado: ${client.id}`);
    }
  }

  // =============================================================================
  // EVENTOS DE SUSCRIPCIÓN
  // =============================================================================

  /**
   * Suscribe al usuario a notificaciones del calendario
   */
  @SubscribeMessage('subscribe_calendar')
  async handleCalendarSubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CalendarSubscriptionData,
  ) {
    try {
      const connectedUser = this.connectedUsers.get(client.id);
      if (!connectedUser) {
        client.emit('error', { message: 'Usuario no autenticado' });
        return;
      }

      // Configurar suscripción del usuario
      const subscription: CalendarSubscriptionData = {
        calendarId: data.calendarId,
        userId: connectedUser.userId,
        eventTypes: data.eventTypes || [],
      };

      this.userSubscriptions.set(connectedUser.userId, subscription);

      this.logger.log(`📅 Usuario suscrito al calendario: ${connectedUser.user.email}`);
      
      client.emit('subscription_confirmed', {
        message: 'Suscripción al calendario confirmada',
        subscription,
      });

      // Enviar eventos próximos basados en la suscripción
      await this.sendFilteredUpcomingEvents(client, subscription);

    } catch (error) {
      this.logger.error(`❌ Error en suscripción de calendario: ${error.message}`, error.stack);
      client.emit('error', { message: 'Error en suscripción de calendario' });
    }
  }

  /**
   * Desuscribe al usuario de notificaciones del calendario
   */
  @SubscribeMessage('unsubscribe_calendar')
  handleCalendarUnsubscription(@ConnectedSocket() client: Socket) {
    const connectedUser = this.connectedUsers.get(client.id);
    if (!connectedUser) {
      client.emit('error', { message: 'Usuario no autenticado' });
      return;
    }

    this.userSubscriptions.delete(connectedUser.userId);
    this.logger.log(`📅 Usuario desuscrito del calendario: ${connectedUser.user.email}`);
    
    client.emit('unsubscription_confirmed', {
      message: 'Desuscripción del calendario confirmada',
    });
  }

  /**
   * Solicita eventos próximos
   */
  @SubscribeMessage('get_upcoming_events')
  async handleGetUpcomingEvents(@ConnectedSocket() client: Socket) {
    const connectedUser = this.connectedUsers.get(client.id);
    if (!connectedUser) {
      client.emit('error', { message: 'Usuario no autenticado' });
      return;
    }

    await this.sendUpcomingEvents(client, connectedUser.userId);
  }

  // =============================================================================
  // MÉTODOS DE NOTIFICACIÓN PÚBLICA
  // =============================================================================

  /**
   * Notifica creación de evento
   */
  async notifyEventCreated(event: Event, _creatorId: number) {
    const notification: EventNotification = {
      type: 'event_created',
      event,
      message: `Nuevo evento creado: ${event.title}`,
      timestamp: new Date(),
    };

    // Notificar a asistentes
    if (event.attendees && event.attendees.length > 0) {
      for (const attendee of event.attendees) {
        await this.sendNotificationToUser(parseInt(attendee.userId.toString()), notification);
      }
    }

    this.logger.log(`📅 Notificación de evento creado enviada: ${event.title}`);
  }

  /**
   * Notifica actualización de evento
   */
  async notifyEventUpdated(event: Event, updatedById: number) {
    const notification: EventNotification = {
      type: 'event_updated',
      event,
      message: `Evento actualizado: ${event.title}`,
      timestamp: new Date(),
    };

    // Notificar a asistentes
    if (event.attendees && event.attendees.length > 0) {
      for (const attendee of event.attendees) {
        const attendeeUserId = parseInt(attendee.userId.toString());
        if (attendeeUserId !== updatedById) { // No notificar al que hizo el cambio
          await this.sendNotificationToUser(attendeeUserId, notification);
        }
      }
    }

    this.logger.log(`📅 Notificación de evento actualizado enviada: ${event.title}`);
  }

  /**
   * Notifica eliminación de evento
   */
  async notifyEventDeleted(event: Event, deletedById: number) {
    const notification: EventNotification = {
      type: 'event_deleted',
      event,
      message: `Evento cancelado: ${event.title}`,
      timestamp: new Date(),
    };

    // Notificar a asistentes
    if (event.attendees && event.attendees.length > 0) {
      for (const attendee of event.attendees) {
        const attendeeUserId = parseInt(attendee.userId.toString());
        if (attendeeUserId !== deletedById) {
          await this.sendNotificationToUser(attendeeUserId, notification);
        }
      }
    }

    this.logger.log(`📅 Notificación de evento eliminado enviada: ${event.title}`);
  }

  /**
   * Notifica invitación a evento
   */
  async notifyEventInvitation(event: Event, attendeeId: number) {
    const notification: EventNotification = {
      type: 'event_invitation',
      event,
      message: `Invitación a evento: ${event.title}`,
      timestamp: new Date(),
      recipientId: attendeeId,
    };

    await this.sendNotificationToUser(attendeeId, notification);
    this.logger.log(`📅 Invitación a evento enviada: ${event.title} -> Usuario ${attendeeId}`);
  }

  /**
   * Notifica cambio en asistencia
   */
  async notifyAttendanceChange(eventId: number, attendee: EventAttendee) {
    const status = attendee.invitationStatus || 'pending';
    const notification: AttendanceNotification = {
      type: status === 'accepted' ? 'attendance_confirmed' : 
            status === 'declined' ? 'attendance_declined' : 'attendance_pending',
      eventId,
      attendee,
      message: `Asistencia ${status === 'accepted' ? 'confirmada' : 
                              status === 'declined' ? 'declinada' : 'pendiente'}`,
      timestamp: new Date(),
    };

    // Notificar al organizador del evento
    try {
      const event = await this.calendarService.findEventById(eventId);
      const attendeeUserId = parseInt(attendee.userId.toString());
      const organizerUserId = parseInt(event.organizerId.toString());
      if (event && organizerUserId !== attendeeUserId) {
        await this.sendNotificationToUser(organizerUserId, notification);
      }
    } catch (error) {
      this.logger.error(`Error notificando cambio de asistencia: ${error.message}`);
    }

    this.logger.log(`📅 Notificación de asistencia enviada: ${status}`);
  }

  /**
   * Notifica recordatorio de evento
   */
  async notifyEventReminder(reminder: EventReminder, event: Event) {
    const userId = parseInt(reminder.userId.toString());
    const notification: ReminderNotification = {
      type: 'reminder_alert',
      reminder,
      event,
      message: `Recordatorio: ${event.title} - ${this.formatReminderMessage(reminder)}`,
      timestamp: new Date(),
      userId,
    };

    await this.sendNotificationToUser(userId, notification);
    this.logger.log(`⏰ Recordatorio enviado: ${event.title} -> Usuario ${userId}`);
  }

  // =============================================================================
  // MÉTODOS PRIVADOS
  // =============================================================================

  /**
   * Extrae token de autenticación del socket
   */
  private extractTokenFromSocket(client: Socket): string | null {
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // También verificar en query params
    const token = client.handshake.query.token;
    if (typeof token === 'string') {
      return token;
    }

    return null;
  }

  /**
   * Verifica y decodifica token JWT
   */
  private async verifyToken(token: string): Promise<CalendarJwtPayload | null> {
    try {
      return await this.jwtService.verifyAsync<CalendarJwtPayload>(token);
    } catch (error) {
      this.logger.error(`Error verificando token: ${error.message}`);
      return null;
    }
  }

  /**
   * Envía notificación a usuario específico
   */
  private async sendNotificationToUser(userId: number, notification: CalendarNotification): Promise<void> {
    const userSockets = Array.from(this.connectedUsers.values())
      .filter(user => user.userId === userId);

    if (userSockets.length === 0) {
      this.logger.debug(`Usuario ${userId} no está conectado para recibir notificación`);
      return;
    }

    for (const userSocket of userSockets) {
      const socket = this.server.to(userSocket.socketId);
      socket.emit('calendar_notification', notification);
      this.logger.debug(`📤 Notificación enviada a ${userSocket.user.email}`);
    }
  }

  /**
   * Envía eventos próximos al usuario
   */
  private async sendUpcomingEvents(client: Socket, userId: number) {
    try {
      const upcomingEvents = await this.calendarService.findUpcomingEventsForUser(userId);
      
      client.emit('upcoming_events', {
        events: upcomingEvents,
        count: upcomingEvents.length,
        timestamp: new Date(),
      });

      this.logger.debug(`📅 Eventos próximos enviados: ${upcomingEvents.length} eventos`);
    } catch (error) {
      this.logger.error(`Error enviando eventos próximos: ${error.message}`, error.stack);
      client.emit('error', { message: 'Error obteniendo eventos próximos' });
    }
  }

  /**
   * Envía eventos filtrados según suscripción
   */
  private async sendFilteredUpcomingEvents(client: Socket, subscription: CalendarSubscriptionData) {
    try {
      const upcomingEvents = await this.calendarService.findUpcomingEventsForUser(subscription.userId);
      
      // Filtrar eventos según suscripción
      const filteredEvents = upcomingEvents.filter(event => {
        if (subscription.eventTypes && subscription.eventTypes.length > 0) {
          return subscription.eventTypes.includes(event.type);
        }
        return true;
      });

      client.emit('upcoming_events', {
        events: filteredEvents,
        count: filteredEvents.length,
        filtered: true,
        filters: subscription,
        timestamp: new Date(),
      });

      this.logger.debug(`📅 Eventos filtrados enviados: ${filteredEvents.length} eventos`);
    } catch (error) {
      this.logger.error(`Error enviando eventos filtrados: ${error.message}`, error.stack);
      client.emit('error', { message: 'Error obteniendo eventos filtrados' });
    }
  }

  /**
   * Configura scheduler para recordatorios automáticos
   */
  private setupReminderScheduler() {
    // Verificar recordatorios cada minuto
    setInterval(async () => {
      await this.checkAndSendReminders();
    }, 60000); // 60 segundos

    this.logger.log('⏰ Scheduler de recordatorios configurado');
  }

  /**
   * Verifica y envía recordatorios pendientes
   */
  private async checkAndSendReminders() {
    try {
      const now = new Date();
      const pendingReminders = await this.calendarService.findPendingReminders(now);

      for (const reminder of pendingReminders) {
        if (reminder.event) {
          await this.notifyEventReminder(reminder, reminder.event);
          
          // Marcar recordatorio como enviado
          await this.calendarService.markReminderAsSent(reminder.id);
        }
      }

      if (pendingReminders.length > 0) {
        this.logger.log(`⏰ ${pendingReminders.length} recordatorios enviados`);
      }
    } catch (error) {
      this.logger.error(`Error verificando recordatorios: ${error.message}`, error.stack);
    }
  }

  /**
   * Formatea mensaje de recordatorio
   */
  private formatReminderMessage(reminder: EventReminder): string {
    const minutes = reminder.minutesBefore;
    
    if (minutes < 60) {
      return `en ${minutes} minutos`;
    } else if (minutes < 1440) { // menos de 24 horas
      const hours = Math.floor(minutes / 60);
      return `en ${hours} hora${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `en ${days} día${days > 1 ? 's' : ''}`;
    }
  }

  /**
   * Obtiene estadísticas de conexiones
   */
  getConnectionStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      activeSubscriptions: this.userSubscriptions.size,
      timestamp: new Date(),
    };
  }
}