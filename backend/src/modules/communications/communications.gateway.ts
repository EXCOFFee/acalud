/**
 * 📡 GATEWAY WEBSOCKET DE COMUNICACIONES - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Gateway que maneja todas las conexiones WebSocket para:
 * - Chat en tiempo real entre usuarios
 * - Notificaciones instantáneas de mensajes
 * - Actualizaciones de estado de conversaciones
 * - Indicadores de "escribiendo" (typing)
 * - Presencia de usuarios (online/offline)
 * - Reacciones en tiempo real
 * 
 * PRINCIPIOS SOLID APLICADOS:
 * - SRP: Responsabilidad única de manejar WebSocket connections
 * - OCP: Extensible para nuevos eventos en tiempo real
 * - LSP: Implementa contratos bien definidos
 * - ISP: Interfaces específicas por tipo de evento
 * - DIP: Depende de abstracciones (servicios, eventos)
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

// 🔐 Guards y validación
import { WsJwtGuard } from './guards/ws-jwt.guard';

// 🔧 Servicios necesarios
import { CommunicationsService } from './communications.service';
import { UsersService } from '../users/users.service';
import type { Conversation } from './conversation.entity';
import type { Message } from './message.entity';
import type { MessageReaction } from './message-reaction.entity';
import type { User } from '../users/user.entity';

// 📝 DTOs para validación de eventos WebSocket
import { JoinConversationDto, LeaveConversationDto } from './dto/ws-room.dto';
import { SendMessageDto } from './dto/ws-message.dto';
import { TypingStatusDto } from './dto/ws-typing.dto';
import { ReactionEventDto } from './dto/ws-reaction.dto';

/**
 * Interface para usuario conectado
 */
interface ConnectedUser {
  userId: string;
  socketId: string;
  email: string;
  name: string;
  connectedAt: Date;
  lastActivity: Date;
  currentRooms: string[];
}

/**
 * Interface para evento de typing
 */
interface TypingEvent {
  conversationId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
  timestamp: Date;
}

/**
 * Interface para respuesta de WebSocket
 */
interface WebSocketResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

interface MessageSentEvent {
  message: Message;
  conversation: Conversation;
  author: User;
}

interface MessageReactedEvent {
  reaction: MessageReaction;
  messageId: string;
  userId: string;
  isNew: boolean;
}

/**
 * Gateway principal para comunicaciones en tiempo real
 * 
 * @description Maneja todas las conexiones WebSocket del sistema
 * proporcionando funcionalidades de chat en tiempo real.
 * 
 * Eventos soportados:
 * - `join_conversation` - Unirse a una conversación
 * - `leave_conversation` - Abandonar una conversación
 * - `send_message` - Enviar mensaje en tiempo real
 * - `typing_start` - Iniciar indicador de escritura
 * - `typing_stop` - Detener indicador de escritura
 * - `add_reaction` - Agregar reacción a mensaje
 * - `remove_reaction` - Eliminar reacción
 * 
 * @example
 * ```typescript
 * // Cliente JavaScript
 * const socket = io('ws://localhost:3000/communications', {
 *   auth: { token: 'jwt-token' }
 * });
 * 
 * socket.emit('join_conversation', { conversationId: 'uuid' });
 * socket.on('new_message', (message) => console.log(message));
 * ```
 */
@WebSocketGateway({
  namespace: '/communications',
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
@UseGuards(WsJwtGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class CommunicationsGateway 
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {

  /**
   * Logger para registrar eventos del gateway
   */
  private readonly logger = new Logger(CommunicationsGateway.name);

  /**
   * Servidor WebSocket de Socket.IO
   */
  @WebSocketServer()
  server: Server;

  /**
   * Mapa de usuarios conectados
   * Key: socketId, Value: ConnectedUser
   */
  private connectedUsers = new Map<string, ConnectedUser>();

  /**
   * Mapa de usuarios por ID
   * Key: userId, Value: Set<socketId>
   */
  private userSockets = new Map<string, Set<string>>();

  /**
   * Mapa de usuarios escribiendo por conversación
   * Key: conversationId, Value: Map<userId, TypingEvent>
   */
  private typingUsers = new Map<string, Map<string, TypingEvent>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly eventEmitter: EventEmitter2,
    private readonly communicationsService: CommunicationsService,
    private readonly usersService: UsersService,
  ) {}

  // =============================================================================
  // 🔧 LIFECYCLE HOOKS DEL GATEWAY
  // =============================================================================

  /**
   * Se ejecuta después de inicializar el gateway
   * 
   * @param server - Servidor WebSocket
   */
  afterInit(server: Server): void {
    this.server = server;
    this.logger.log('🚀 Gateway de Comunicaciones inicializado');
    this.logger.log(`📡 Namespace: /communications`);
    this.logger.log(`🌐 CORS habilitado para: ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
    
    // 🕐 Configurar limpieza periódica de usuarios inactivos
    setInterval(() => {
      this.cleanupInactiveUsers();
    }, 5 * 60 * 1000); // Cada 5 minutos

    // 🕐 Configurar limpieza de indicadores de typing
    setInterval(() => {
      this.cleanupTypingIndicators();
    }, 30 * 1000); // Cada 30 segundos
  }

  /**
   * Se ejecuta cuando un cliente se conecta
   * 
   * @param client - Socket del cliente
   */
  async handleConnection(client: Socket): Promise<void> {
    try {
      // 🔐 Extraer y validar token JWT
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      
      if (!token) {
        this.logger.warn(`❌ Conexión rechazada: Sin token JWT - Socket: ${client.id}`);
        client.disconnect();
        return;
      }

      // 🔍 Verificar y decodificar token
      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub || payload.userId;

      if (!userId) {
        this.logger.warn(`❌ Conexión rechazada: Token inválido - Socket: ${client.id}`);
        client.disconnect();
        return;
      }

      // 👤 Obtener información del usuario
      const user = await this.usersService.findById(userId);
      if (!user) {
        this.logger.warn(`❌ Conexión rechazada: Usuario no encontrado - ID: ${userId}`);
        client.disconnect();
        return;
      }

      // 📝 Registrar usuario conectado
      const connectedUser: ConnectedUser = {
        userId: user.id,
        socketId: client.id,
        email: user.email,
        name: user.name,
        connectedAt: new Date(),
        lastActivity: new Date(),
        currentRooms: [],
      };

      this.connectedUsers.set(client.id, connectedUser);

      // 📊 Actualizar mapa de sockets por usuario
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      // 🎯 Establecer datos del cliente en el socket
      client.data.user = connectedUser;

      this.logger.log(`✅ Usuario conectado: ${user.name} (${user.email}) - Socket: ${client.id}`);

      // 📡 Emitir evento de conexión exitosa
      client.emit('connection_established', {
        success: true,
        data: {
          userId: user.id,
          name: user.name,
          connectedAt: connectedUser.connectedAt,
        },
        timestamp: new Date(),
      });

      // 🌍 Notificar a otros usuarios sobre la presencia
      this.broadcastUserPresence(userId, true);

    } catch (error) {
      this.logger.error(`❌ Error en conexión: ${error.message}`, error.stack);
      client.disconnect();
    }
  }

  /**
   * Se ejecuta cuando un cliente se desconecta
   * 
   * @param client - Socket del cliente
   */
  async handleDisconnect(client: Socket): Promise<void> {
    try {
      const connectedUser = this.connectedUsers.get(client.id);

      if (connectedUser) {
        // 🚪 Abandonar todas las conversaciones
        for (const room of connectedUser.currentRooms) {
          await client.leave(room);
          this.broadcastToRoom(room, 'user_left_conversation', {
            conversationId: room,
            userId: connectedUser.userId,
            userName: connectedUser.name,
            timestamp: new Date(),
          }, client.id);
        }

        // 🧹 Limpiar mapas de usuarios
        this.connectedUsers.delete(client.id);

        const userSocketSet = this.userSockets.get(connectedUser.userId);
        if (userSocketSet) {
          userSocketSet.delete(client.id);
          if (userSocketSet.size === 0) {
            this.userSockets.delete(connectedUser.userId);
            // 🌍 Notificar que el usuario se desconectó completamente
            this.broadcastUserPresence(connectedUser.userId, false);
          }
        }

        // 🧹 Limpiar indicadores de typing
        this.cleanupUserTyping(connectedUser.userId);

        this.logger.log(`👋 Usuario desconectado: ${connectedUser.name} - Socket: ${client.id}`);
      }

    } catch (error) {
      this.logger.error(`❌ Error en desconexión: ${error.message}`, error.stack);
    }
  }

  // =============================================================================
  // 💬 EVENTOS DE CONVERSACIONES
  // =============================================================================

  /**
   * Maneja cuando un usuario se une a una conversación
   * 
   * @param client - Socket del cliente
   * @param data - Datos de la conversación
   * @returns WebSocketResponse
   */
  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: JoinConversationDto,
  ): Promise<WebSocketResponse> {
    try {
      const user = client.data.user as ConnectedUser;
      
      if (!user) {
        return this.createErrorResponse('Usuario no autenticado');
      }

      // 🔍 Verificar que el usuario tiene acceso a la conversación
      const conversation = await this.communicationsService.getConversationById(
        data.conversationId,
        user.userId,
      );

      // 🚪 Unirse al room de la conversación
      await client.join(data.conversationId);
      
      // 📝 Actualizar lista de rooms del usuario
      const connectedUser = this.connectedUsers.get(client.id);
      if (connectedUser) {
        connectedUser.currentRooms.push(data.conversationId);
        connectedUser.lastActivity = new Date();
      }

      // 📡 Notificar a otros usuarios en la conversación
      this.broadcastToRoom(data.conversationId, 'user_joined_conversation', {
        conversationId: data.conversationId,
        userId: user.userId,
        userName: user.name,
        timestamp: new Date(),
      }, client.id);

      this.logger.log(`👥 Usuario ${user.name} se unió a conversación: ${data.conversationId}`);

      return this.createSuccessResponse({
        conversationId: data.conversationId,
        conversationTitle: conversation.title,
        participantCount: conversation.participantCount,
        joinedAt: new Date(),
      });

    } catch (error) {
      this.logger.error(`❌ Error uniendo a conversación: ${error.message}`, error.stack);
      return this.createErrorResponse('Error uniéndose a la conversación');
    }
  }

  /**
   * Maneja cuando un usuario abandona una conversación
   * 
   * @param client - Socket del cliente
   * @param data - Datos de la conversación
   * @returns WebSocketResponse
   */
  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: LeaveConversationDto,
  ): Promise<WebSocketResponse> {
    try {
      const user = client.data.user as ConnectedUser;
      
      if (!user) {
        return this.createErrorResponse('Usuario no autenticado');
      }

      // 🚪 Abandonar el room de la conversación
      await client.leave(data.conversationId);

      // 📝 Actualizar lista de rooms del usuario
      const connectedUser = this.connectedUsers.get(client.id);
      if (connectedUser) {
        connectedUser.currentRooms = connectedUser.currentRooms.filter(
          room => room !== data.conversationId
        );
        connectedUser.lastActivity = new Date();
      }

      // 🧹 Limpiar typing status de esta conversación
      this.clearTypingStatus(data.conversationId, user.userId);

      // 📡 Notificar a otros usuarios en la conversación
      this.broadcastToRoom(data.conversationId, 'user_left_conversation', {
        conversationId: data.conversationId,
        userId: user.userId,
        userName: user.name,
        timestamp: new Date(),
      }, client.id);

      this.logger.log(`👋 Usuario ${user.name} abandonó conversación: ${data.conversationId}`);

      return this.createSuccessResponse({
        conversationId: data.conversationId,
        leftAt: new Date(),
      });

    } catch (error) {
      this.logger.error(`❌ Error abandonando conversación: ${error.message}`, error.stack);
      return this.createErrorResponse('Error abandonando la conversación');
    }
  }

  // =============================================================================
  // 💌 EVENTOS DE MENSAJES
  // =============================================================================

  /**
   * Maneja el envío de mensajes en tiempo real
   * 
   * @param client - Socket del cliente
   * @param data - Datos del mensaje
   * @returns WebSocketResponse
   */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageDto,
  ): Promise<WebSocketResponse> {
    try {
      const user = client.data.user as ConnectedUser;
      
      if (!user) {
        return this.createErrorResponse('Usuario no autenticado');
      }

      // 📝 Obtener el usuario completo para el servicio
      const fullUser = await this.usersService.findById(user.userId);
      if (!fullUser) {
        return this.createErrorResponse('Usuario no encontrado');
      }

      // 💌 Enviar mensaje usando el servicio
      const message = await this.communicationsService.sendMessage(
        data.conversationId,
        {
          content: data.content,
          type: data.type,
          parentMessageId: data.parentMessageId,
          metadata: data.metadata,
        },
        fullUser,
      );

      // 🧹 Limpiar typing status del usuario
      this.clearTypingStatus(data.conversationId, user.userId);

      // 📝 Actualizar actividad del usuario
      const connectedUser = this.connectedUsers.get(client.id);
      if (connectedUser) {
        connectedUser.lastActivity = new Date();
      }

      // 📡 Emitir mensaje a todos los usuarios en la conversación
      this.broadcastToRoom(data.conversationId, 'new_message', {
        id: message.id,
        content: message.content,
        type: message.type,
        conversationId: data.conversationId,
        author: {
          id: message.author.id,
          email: message.author.email,
          firstName: message.author.firstName,
          lastName: message.author.lastName,
          name: message.author.name,
        },
        parentMessageId: message.parentMessage?.id,
        createdAt: message.createdAt,
        metadata: message.metadata,
      });

      this.logger.log(`💌 Mensaje enviado por ${user.name} en conversación: ${data.conversationId}`);

      return this.createSuccessResponse({
        messageId: message.id,
        sentAt: message.createdAt,
      });

    } catch (error) {
      this.logger.error(`❌ Error enviando mensaje: ${error.message}`, error.stack);
      return this.createErrorResponse('Error enviando el mensaje');
    }
  }

  // =============================================================================
  // ⌨️ EVENTOS DE TYPING (ESCRIBIENDO)
  // =============================================================================

  /**
   * Maneja cuando un usuario empieza a escribir
   * 
   * @param client - Socket del cliente
   * @param data - Datos del typing
   * @returns WebSocketResponse
   */
  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingStatusDto,
  ): Promise<WebSocketResponse> {
    try {
      const user = client.data.user as ConnectedUser;
      
      if (!user) {
        return this.createErrorResponse('Usuario no autenticado');
      }

      // 📝 Registrar que el usuario está escribiendo
      if (!this.typingUsers.has(data.conversationId)) {
        this.typingUsers.set(data.conversationId, new Map());
      }

      const conversationTyping = this.typingUsers.get(data.conversationId)!;
      conversationTyping.set(user.userId, {
        conversationId: data.conversationId,
        userId: user.userId,
        userName: user.name,
        isTyping: true,
        timestamp: new Date(),
      });

      // 📡 Notificar a otros usuarios en la conversación
      this.broadcastToRoom(data.conversationId, 'user_typing', {
        conversationId: data.conversationId,
        userId: user.userId,
        userName: user.name,
        isTyping: true,
        timestamp: new Date(),
      }, client.id);

      return this.createSuccessResponse({ isTyping: true });

    } catch (error) {
      this.logger.error(`❌ Error en typing start: ${error.message}`, error.stack);
      return this.createErrorResponse('Error procesando typing status');
    }
  }

  /**
   * Maneja cuando un usuario deja de escribir
   * 
   * @param client - Socket del cliente
   * @param data - Datos del typing
   * @returns WebSocketResponse
   */
  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: TypingStatusDto,
  ): Promise<WebSocketResponse> {
    try {
      const user = client.data.user as ConnectedUser;
      
      if (!user) {
        return this.createErrorResponse('Usuario no autenticado');
      }

      // 🧹 Limpiar typing status del usuario
      this.clearTypingStatus(data.conversationId, user.userId);

      return this.createSuccessResponse({ isTyping: false });

    } catch (error) {
      this.logger.error(`❌ Error en typing stop: ${error.message}`, error.stack);
      return this.createErrorResponse('Error procesando typing status');
    }
  }

  // =============================================================================
  // 👍 EVENTOS DE REACCIONES
  // =============================================================================

  /**
   * Maneja cuando se agrega una reacción en tiempo real
   * 
   * @param client - Socket del cliente
   * @param data - Datos de la reacción
   * @returns WebSocketResponse
   */
  @SubscribeMessage('add_reaction')
  async handleAddReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ReactionEventDto,
  ): Promise<WebSocketResponse> {
    try {
      const user = client.data.user as ConnectedUser;
      
      if (!user) {
        return this.createErrorResponse('Usuario no autenticado');
      }

      // 👍 Agregar reacción usando el servicio
      const reaction = await this.communicationsService.addReaction(
        data.messageId,
        { type: data.reactionType },
        user.userId,
      );

      // 📡 Emitir reacción a todos los usuarios en la conversación
      this.broadcastToRoom(data.conversationId, 'reaction_added', {
        messageId: data.messageId,
        conversationId: data.conversationId,
        reaction: {
          id: reaction.id,
          type: reaction.type,
          emoji: reaction.getEmoji(),
          userId: reaction.userId,
          userName: user.name,
          createdAt: reaction.createdAt,
        },
      });

      this.logger.log(`👍 Reacción ${reaction.type} agregada por ${user.name} al mensaje: ${data.messageId}`);

      return this.createSuccessResponse({
        reactionId: reaction.id,
        addedAt: reaction.createdAt,
      });

    } catch (error) {
      this.logger.error(`❌ Error agregando reacción: ${error.message}`, error.stack);
      return this.createErrorResponse('Error agregando la reacción');
    }
  }

  /**
   * Maneja cuando se elimina una reacción en tiempo real
   * 
   * @param client - Socket del cliente
   * @param data - Datos de la reacción
   * @returns WebSocketResponse
   */
  @SubscribeMessage('remove_reaction')
  async handleRemoveReaction(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: ReactionEventDto,
  ): Promise<WebSocketResponse> {
    try {
      const user = client.data.user as ConnectedUser;
      
      if (!user) {
        return this.createErrorResponse('Usuario no autenticado');
      }

      // 🗑️ Eliminar reacción usando el servicio
      await this.communicationsService.removeReaction(data.messageId, user.userId);

      // 📡 Emitir eliminación de reacción a todos los usuarios
      this.broadcastToRoom(data.conversationId, 'reaction_removed', {
        messageId: data.messageId,
        conversationId: data.conversationId,
        userId: user.userId,
        userName: user.name,
        reactionType: data.reactionType,
        removedAt: new Date(),
      });

      this.logger.log(`🗑️ Reacción eliminada por ${user.name} del mensaje: ${data.messageId}`);

      return this.createSuccessResponse({
        removedAt: new Date(),
      });

    } catch (error) {
      this.logger.error(`❌ Error eliminando reacción: ${error.message}`, error.stack);
      return this.createErrorResponse('Error eliminando la reacción');
    }
  }

  // =============================================================================
  // 📡 EVENT LISTENERS PARA EVENTOS DEL SISTEMA
  // =============================================================================

  /**
   * Escucha eventos de mensajes desde otros módulos
   * 
   * @param payload - Datos del evento
   */
  @OnEvent('message.sent')
  async handleMessageSent(payload: MessageSentEvent): Promise<void> {
    try {
      // 📡 Si el mensaje se envió desde fuera del WebSocket (ej: API REST),
      // notificar a los usuarios conectados
      this.broadcastToRoom(payload.conversation.id, 'new_message', {
        id: payload.message.id,
        content: payload.message.content,
        type: payload.message.type,
        conversationId: payload.conversation.id,
        author: {
          id: payload.author.id,
          email: payload.author.email,
          firstName: payload.author.firstName,
          lastName: payload.author.lastName,
          name: payload.author.name,
        },
        createdAt: payload.message.createdAt,
        metadata: payload.message.metadata,
        fromExternalSource: true, // Indica que vino de fuera del WebSocket
      });

    } catch (error) {
      this.logger.error(`❌ Error manejando evento message.sent: ${error.message}`, error.stack);
    }
  }

  /**
   * Escucha eventos de reacciones agregadas
   * 
   * @param payload - Datos del evento
   */
  @OnEvent('message.reacted')
  async handleMessageReacted(payload: MessageReactedEvent): Promise<void> {
    try {
      this.logger.debug(
        `ℹ️ Reacción ${payload.reaction.type} registrada para mensaje ${payload.messageId} por usuario ${payload.userId}`,
      );

      // TODO: Implementar emisión a la conversación cuando la reacción provenga de otra fuente
      
    } catch (error) {
      this.logger.error(`❌ Error manejando evento message.reacted: ${error.message}`, error.stack);
    }
  }

  // =============================================================================
  // 🔧 MÉTODOS AUXILIARES PRIVADOS
  // =============================================================================

  /**
   * Crea una respuesta exitosa para WebSocket
   * 
   * @param data - Datos de respuesta
   * @returns WebSocketResponse
   */
  private createSuccessResponse<T>(data?: T): WebSocketResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date(),
    };
  }

  /**
   * Crea una respuesta de error para WebSocket
   * 
   * @param error - Mensaje de error
   * @returns WebSocketResponse
   */
  private createErrorResponse(error: string): WebSocketResponse {
    return {
      success: false,
      error,
      timestamp: new Date(),
    };
  }

  /**
   * Envía mensaje a todos los usuarios en un room específico
   * 
   * @param room - ID del room (conversación)
   * @param event - Nombre del evento
   * @param data - Datos a enviar
   * @param excludeSocketId - Socket ID a excluir (opcional)
   */
  private broadcastToRoom<T>(room: string, event: string, data: T, excludeSocketId?: string): void {
    if (excludeSocketId) {
      this.server.to(room).except(excludeSocketId).emit(event, data);
    } else {
      this.server.to(room).emit(event, data);
    }
  }

  /**
   * Notifica cambio de presencia de usuario
   * 
   * @param userId - ID del usuario
   * @param isOnline - Estado de conexión
   */
  private broadcastUserPresence(userId: string, isOnline: boolean): void {
    this.server.emit('user_presence_changed', {
      userId,
      isOnline,
      timestamp: new Date(),
    });
  }

  /**
   * Limpia el typing status de un usuario en una conversación
   * 
   * @param conversationId - ID de la conversación
   * @param userId - ID del usuario
   */
  private clearTypingStatus(conversationId: string, userId: string): void {
    const conversationTyping = this.typingUsers.get(conversationId);
    if (conversationTyping && conversationTyping.has(userId)) {
      conversationTyping.delete(userId);

      // 📡 Notificar que el usuario dejó de escribir
      this.broadcastToRoom(conversationId, 'user_typing', {
        conversationId,
        userId,
        isTyping: false,
        timestamp: new Date(),
      });

      // 🧹 Limpiar map si está vacío
      if (conversationTyping.size === 0) {
        this.typingUsers.delete(conversationId);
      }
    }
  }

  /**
   * Limpia todos los typing indicators de un usuario
   * 
   * @param userId - ID del usuario
   */
  private cleanupUserTyping(userId: string): void {
    for (const [conversationId, typingMap] of this.typingUsers.entries()) {
      if (typingMap.has(userId)) {
        this.clearTypingStatus(conversationId, userId);
      }
    }
  }

  /**
   * Limpia usuarios inactivos (ejecutado periódicamente)
   */
  private cleanupInactiveUsers(): void {
    const now = new Date();
    const inactiveThreshold = 15 * 60 * 1000; // 15 minutos

    for (const [socketId, user] of this.connectedUsers.entries()) {
      const timeSinceLastActivity = now.getTime() - user.lastActivity.getTime();
      
      if (timeSinceLastActivity > inactiveThreshold) {
        this.logger.log(`🧹 Desconectando usuario inactivo: ${user.name} - Socket: ${socketId}`);
        const socket = this.server.sockets.sockets.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
      }
    }
  }

  /**
   * Limpia indicadores de typing antiguos (ejecutado periódicamente)
   */
  private cleanupTypingIndicators(): void {
    const now = new Date();
    const typingThreshold = 10 * 1000; // 10 segundos

    for (const [conversationId, typingMap] of this.typingUsers.entries()) {
      for (const [userId, typingEvent] of typingMap.entries()) {
        const timeSinceLastTyping = now.getTime() - typingEvent.timestamp.getTime();
        
        if (timeSinceLastTyping > typingThreshold) {
          this.clearTypingStatus(conversationId, userId);
        }
      }
    }
  }

  /**
   * Obtiene estadísticas del gateway
   * 
   * @returns Estadísticas actuales
   */
  getGatewayStats() {
    return {
      connectedUsers: this.connectedUsers.size,
      uniqueUsers: this.userSockets.size,
      activeConversations: this.typingUsers.size,
      totalTypingUsers: Array.from(this.typingUsers.values())
        .reduce((total, map) => total + map.size, 0),
    };
  }
}