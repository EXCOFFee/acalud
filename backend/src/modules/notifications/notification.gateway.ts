/**
 * 🔔 GATEWAY WEBSOCKET PARA NOTIFICACIONES EN TIEMPO REAL
 * 
 * Gateway que maneja comunicación en tiempo real para notificaciones:
 * - Conexiones WebSocket por usuario
 * - Envío inmediato de notificaciones
 * - Gestión de salas por aulas/grupos
 * - Eventos de estado (conectado/desconectado)
 * - Sincronización de notificaciones no leídas
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Responsabilidad única de comunicación WebSocket
 * - OCP: Extensible para nuevos tipos de eventos
 * - LSP: Implementa contratos de WebSocket Gateway
 * - ISP: Eventos específicos por funcionalidad
 * - DIP: Depende de abstracciones de autenticación
 */

import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';

import { NotificationService, NotificationEvent } from './notification.service';
import { NotificationType } from './notification.entity';

/**
 * Interface para datos de conexión de usuario
 */
interface UserConnection {
  userId: string;
  socketId: string;
  connectedAt: Date;
  userAgent?: string;
  ip?: string;
}

/**
 * Interface para eventos de notificación WebSocket
 */
interface NotificationWSEvent {
  type: string;
  data: any;
  timestamp: Date;
  userId?: string;
}

/**
 * Gateway WebSocket para notificaciones en tiempo real
 * 
 * @description Este gateway maneja todas las conexiones WebSocket
 * para notificaciones en tiempo real del sistema.
 * 
 * @example
 * ```typescript
 * // Cliente JavaScript
 * const socket = io('ws://localhost:3000/notifications', {
 *   auth: {
 *     token: 'jwt-token-here'
 *   }
 * });
 * 
 * socket.on('notification', (data) => {
 *   console.log('Nueva notificación:', data);
 * });
 * ```
 */
@WebSocketGateway({
  namespace: 'notifications',
  cors: {
    origin: '*', // TODO: Configurar orígenes permitidos
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class NotificationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  /**
   * Server WebSocket
   */
  @WebSocketServer()
  server: Server;

  /**
   * Logger para registrar operaciones del gateway
   */
  private readonly logger = new Logger(NotificationGateway.name);

  /**
   * Mapa de conexiones de usuarios activos
   */
  private readonly userConnections = new Map<string, UserConnection[]>();

  /**
   * Mapa de salas de aulas/grupos
   */
  private readonly classroomRooms = new Map<string, Set<string>>();

  constructor(
    private readonly notificationService: NotificationService,
    private readonly jwtService: JwtService,
  ) {}

  // =============================================================================
  // 🔧 MÉTODOS DE CICLO DE VIDA DEL GATEWAY
  // =============================================================================

  /**
   * Se ejecuta después de inicializar el gateway
   */
  afterInit(server: Server) {
    this.logger.log('🔔 NotificationGateway inicializado');
    
    // Configurar middleware de autenticación
    server.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
        
        if (!token) {
          return next(new Error('Token de autenticación requerido'));
        }

        // Verificar JWT
        const cleanToken = token.replace('Bearer ', '');
        const payload = this.jwtService.verify(cleanToken);
        
        // Adjuntar datos del usuario al socket
        socket.data.user = payload;
        socket.data.userId = payload.sub || payload.id;
        
        next();
      } catch (error) {
        this.logger.error(`❌ Error de autenticación WebSocket: ${error.message}`);
        next(new Error('Token inválido'));
      }
    });
  }

  /**
   * Se ejecuta cuando un cliente se conecta
   */
  async handleConnection(client: Socket) {
    try {
      const userId = client.data.userId;
      const userAgent = client.handshake.headers['user-agent'];
      const ip = client.handshake.address;

      this.logger.log(`🔌 Usuario ${userId} conectado (${client.id})`);

      // Registrar conexión del usuario
      const connection: UserConnection = {
        userId,
        socketId: client.id,
        connectedAt: new Date(),
        userAgent,
        ip,
      };

      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, []);
      }
      this.userConnections.get(userId)!.push(connection);

      // Unir al cliente a su sala personal
      await client.join(`user:${userId}`);

      // Enviar estadísticas iniciales
      const stats = await this.notificationService.getNotificationStats(userId);
      client.emit('notification:stats', {
        type: 'stats',
        data: stats,
        timestamp: new Date(),
      });

      // Emitir evento de conexión
      client.emit('notification:connected', {
        type: 'connected',
        data: {
          userId,
          connectionId: client.id,
          timestamp: new Date(),
        },
      });

      this.logger.log(`✅ Usuario ${userId} configurado exitosamente`);

    } catch (error) {
      this.logger.error(`❌ Error en conexión: ${error.message}`, error.stack);
      client.disconnect();
    }
  }

  /**
   * Se ejecuta cuando un cliente se desconecta
   */
  handleDisconnect(client: Socket) {
    try {
      const userId = client.data.userId;
      
      this.logger.log(`🔌 Usuario ${userId} desconectado (${client.id})`);

      // Remover conexión del usuario
      if (this.userConnections.has(userId)) {
        const connections = this.userConnections.get(userId)!;
        const updatedConnections = connections.filter(
          conn => conn.socketId !== client.id
        );
        
        if (updatedConnections.length === 0) {
          this.userConnections.delete(userId);
        } else {
          this.userConnections.set(userId, updatedConnections);
        }
      }

      // Remover de todas las salas de aulas
      this.classroomRooms.forEach((sockets, roomId) => {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.classroomRooms.delete(roomId);
        }
      });

    } catch (error) {
      this.logger.error(`❌ Error en desconexión: ${error.message}`, error.stack);
    }
  }

  // =============================================================================
  // 📨 MANEJADORES DE MENSAJES DEL CLIENTE
  // =============================================================================

  /**
   * Cliente solicita unirse a sala de aula
   */
  @SubscribeMessage('join-classroom')
  async handleJoinClassroom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { classroomId: string },
  ) {
    try {
      const userId = client.data.userId;
      const roomId = `classroom:${data.classroomId}`;

      this.logger.log(`👥 Usuario ${userId} uniéndose a aula ${data.classroomId}`);

      // Unir al cliente a la sala del aula
      await client.join(roomId);

      // Registrar en el mapa de salas
      if (!this.classroomRooms.has(roomId)) {
        this.classroomRooms.set(roomId, new Set());
      }
      this.classroomRooms.get(roomId)!.add(client.id);

      // Confirmar unión
      client.emit('classroom-joined', {
        type: 'classroom-joined',
        data: {
          classroomId: data.classroomId,
          roomId,
          timestamp: new Date(),
        },
      });

      this.logger.log(`✅ Usuario ${userId} unido a aula ${data.classroomId}`);

    } catch (error) {
      this.logger.error(`❌ Error uniéndose a aula: ${error.message}`, error.stack);
      client.emit('error', {
        type: 'join-classroom-error',
        message: error.message,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Cliente solicita abandonar sala de aula
   */
  @SubscribeMessage('leave-classroom')
  async handleLeaveClassroom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { classroomId: string },
  ) {
    try {
      const userId = client.data.userId;
      const roomId = `classroom:${data.classroomId}`;

      this.logger.log(`👥 Usuario ${userId} abandonando aula ${data.classroomId}`);

      // Salir de la sala del aula
      await client.leave(roomId);

      // Remover del mapa de salas
      if (this.classroomRooms.has(roomId)) {
        this.classroomRooms.get(roomId)!.delete(client.id);
        if (this.classroomRooms.get(roomId)!.size === 0) {
          this.classroomRooms.delete(roomId);
        }
      }

      // Confirmar salida
      client.emit('classroom-left', {
        type: 'classroom-left',
        data: {
          classroomId: data.classroomId,
          timestamp: new Date(),
        },
      });

    } catch (error) {
      this.logger.error(`❌ Error abandonando aula: ${error.message}`, error.stack);
    }
  }

  /**
   * Cliente solicita actualizar estadísticas
   */
  @SubscribeMessage('refresh-stats')
  async handleRefreshStats(@ConnectedSocket() client: Socket) {
    try {
      const userId = client.data.userId;
      
      this.logger.log(`📊 Usuario ${userId} solicitando actualización de estadísticas`);

      const stats = await this.notificationService.getNotificationStats(userId);
      
      client.emit('notification:stats', {
        type: 'stats',
        data: stats,
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error(`❌ Error actualizando estadísticas: ${error.message}`, error.stack);
    }
  }

  /**
   * Cliente marca notificaciones como leídas
   */
  @SubscribeMessage('mark-as-read')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationIds: string[] },
  ) {
    try {
      const userId = client.data.userId;
      
      this.logger.log(`✅ Usuario ${userId} marcando ${data.notificationIds.length} notificaciones como leídas`);

      await this.notificationService.markAsRead(userId, {
        notificationIds: data.notificationIds,
      });

      // Enviar confirmación
      client.emit('notifications-marked-read', {
        type: 'marked-read',
        data: {
          notificationIds: data.notificationIds,
          timestamp: new Date(),
        },
      });

      // Enviar estadísticas actualizadas
      const stats = await this.notificationService.getNotificationStats(userId);
      client.emit('notification:stats', {
        type: 'stats',
        data: stats,
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error(`❌ Error marcando como leído: ${error.message}`, error.stack);
    }
  }

  // =============================================================================
  // 🎧 LISTENERS DE EVENTOS DEL SISTEMA
  // =============================================================================

  /**
   * Listener para notificaciones creadas
   */
  @OnEvent('notification.created')
  handleNotificationCreated(event: NotificationEvent) {
    try {
      this.logger.log(`📢 Enviando notificación a usuario: ${event.userId}`);

      // Enviar a la sala personal del usuario
      this.server.to(`user:${event.userId}`).emit('notification', {
        type: 'new-notification',
        data: event.notification.toSummary(),
        timestamp: new Date(),
        metadata: event.metadata,
      });

      // Si es una notificación de aula, enviar también a la sala del aula
      if (event.metadata?.classroomId) {
        this.server.to(`classroom:${event.metadata.classroomId}`).emit('classroom-notification', {
          type: 'classroom-notification',
          data: event.notification.toSummary(),
          timestamp: new Date(),
          classroomId: event.metadata.classroomId,
        });
      }

    } catch (error) {
      this.logger.error(`❌ Error enviando notificación WebSocket: ${error.message}`, error.stack);
    }
  }

  /**
   * Listener para notificaciones marcadas como leídas
   */
  @OnEvent('notification.read')
  handleNotificationRead(event: NotificationEvent) {
    try {
      this.logger.log(`📖 Notificación marcada como leída: ${event.notification.id}`);

      // Notificar al usuario sobre el cambio de estado
      this.server.to(`user:${event.userId}`).emit('notification-read', {
        type: 'notification-read',
        data: {
          notificationId: event.notification.id,
          timestamp: new Date(),
        },
      });

    } catch (error) {
      this.logger.error(`❌ Error enviando evento de lectura: ${error.message}`, error.stack);
    }
  }

  /**
   * Listener para notificaciones in-app específicas
   */
  @OnEvent('notification.in-app')
  handleInAppNotification(data: { userId: string; notification: any }) {
    try {
      this.logger.log(`📱 Enviando notificación in-app a usuario: ${data.userId}`);

      this.server.to(`user:${data.userId}`).emit('notification', {
        type: 'in-app-notification',
        data: data.notification,
        timestamp: new Date(),
      });

    } catch (error) {
      this.logger.error(`❌ Error enviando notificación in-app: ${error.message}`, error.stack);
    }
  }

  // =============================================================================
  // 📊 MÉTODOS DE UTILIDAD
  // =============================================================================

  /**
   * Obtiene estadísticas de conexiones activas
   */
  getConnectionStats() {
    const totalConnections = Array.from(this.userConnections.values())
      .reduce((sum, connections) => sum + connections.length, 0);

    const uniqueUsers = this.userConnections.size;
    const classroomRooms = this.classroomRooms.size;

    return {
      totalConnections,
      uniqueUsers,
      classroomRooms,
      timestamp: new Date(),
    };
  }

  /**
   * Envía notificación a usuario específico
   */
  async sendToUser(userId: string, event: NotificationWSEvent) {
    try {
      this.server.to(`user:${userId}`).emit(event.type, event);
      this.logger.log(`📤 Evento ${event.type} enviado a usuario ${userId}`);
    } catch (error) {
      this.logger.error(`❌ Error enviando a usuario ${userId}: ${error.message}`);
    }
  }

  /**
   * Envía notificación a aula específica
   */
  async sendToClassroom(classroomId: string, event: NotificationWSEvent) {
    try {
      this.server.to(`classroom:${classroomId}`).emit(event.type, event);
      this.logger.log(`📤 Evento ${event.type} enviado a aula ${classroomId}`);
    } catch (error) {
      this.logger.error(`❌ Error enviando a aula ${classroomId}: ${error.message}`);
    }
  }

  /**
   * Broadcast a todos los usuarios conectados
   */
  async broadcast(event: NotificationWSEvent) {
    try {
      this.server.emit(event.type, event);
      this.logger.log(`📡 Evento ${event.type} enviado a todos los usuarios`);
    } catch (error) {
      this.logger.error(`❌ Error en broadcast: ${error.message}`);
    }
  }

  /**
   * Verifica si un usuario está conectado
   */
  isUserConnected(userId: string): boolean {
    return this.userConnections.has(userId) && 
           this.userConnections.get(userId)!.length > 0;
  }

  /**
   * Obtiene conexiones de un usuario
   */
  getUserConnections(userId: string): UserConnection[] {
    return this.userConnections.get(userId) || [];
  }
}