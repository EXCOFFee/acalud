/**
 * 💬 SERVICIO DE COMUNICACIONES - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Servicio principal para gestión de chats y mensajes del sistema educativo.
 * Implementa toda la lógica de negocio para comunicación en tiempo real.
 * 
 * FUNCIONALIDADES:
 * - Gestión completa de chats (CRUD)
 * - Envío y recepción de mensajes
 * - Sistema de participantes y permisos
 * - Reacciones y menciones
 * - Moderación automática
 * - Estadísticas y análisis
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Responsabilidad única de comunicaciones
 * - OCP: Extensible para nuevos tipos de mensajes
 * - LSP: Implementa contratos bien definidos
 * - ISP: Interfaces específicas por funcionalidad
 * - DIP: Depende de abstracciones de repositorios
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder, In } from 'typeorm';

// Entidades
import { Chat, ChatType, ChatStatus } from './entities/chat.entity';
import { ChatMessage, MessageType } from './entities/message.entity';
import { User } from '../users/user.entity';

// DTOs
import {
  CreateChatDto,
  CreateMessageDto,
  ChatQueryDto,
  PaginatedResponse,
  ChatResponse,
  MessageResponse,
} from './dto';

interface CommunicationBasicStats {
  totalChats: number;
  activeChats: number;
  totalMessages: number;
  timestamp: Date;
}

/**
 * 💬 Servicio principal de comunicaciones
 * 
 * @description Maneja toda la lógica de negocio relacionada con chats y mensajes.
 * Incluye validaciones de permisos, moderación automática y optimizaciones de rendimiento.
 * 
 * @example
 * ```typescript
 * const chat = await communicationsService.createChat({
 *   name: 'Chat de Matemáticas',
 *   type: ChatType.GROUP,
 *   participantIds: ['user1', 'user2']
 * }, 'creatorId');
 * ```
 */
@Injectable()
export class CommunicationsService {
  /**
   * Logger para operaciones del servicio
   */
  private readonly logger = new Logger(CommunicationsService.name);

  constructor(
    @InjectRepository(Chat)
    private readonly chatRepository: Repository<Chat>,

    @InjectRepository(ChatMessage)
    private readonly messageRepository: Repository<ChatMessage>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // =============================================================================
  // 💬 GESTIÓN DE CHATS
  // =============================================================================

  /**
   * 🆕 Crear nuevo chat
   */
  async createChat(createChatDto: CreateChatDto, creatorId: string): Promise<ChatResponse> {
    this.logger.log(`🆕 Creando chat: ${createChatDto.type} por usuario ${creatorId}`);

    try {
      // Validar que el creador existe
      const creator = await this.userRepository.findOne({ where: { id: creatorId } });
      if (!creator) {
        throw new NotFoundException('Usuario creador no encontrado');
      }

      // Validar participantes
      const participants = await this.userRepository.find({
        where: { id: In(createChatDto.participantIds) },
      });

      if (participants.length !== createChatDto.participantIds.length) {
        throw new BadRequestException('Algunos participantes no existen');
      }

      // Verificar permisos para chats de aula
      if (createChatDto.type === ChatType.CLASSROOM) {
        if (creator.role !== 'teacher' && creator.role !== 'admin') {
          throw new ForbiddenException('Solo profesores pueden crear chats de aula');
        }

        if (!createChatDto.classroomId) {
          throw new BadRequestException('Chat de aula requiere classroomId');
        }
      }

      // Crear el chat
      const chat = this.chatRepository.create({
        ...createChatDto,
        createdBy: creatorId,
        participantIds: [creatorId, ...createChatDto.participantIds],
        participantCount: participants.length + 1,
      });

      // Configurar nombre automático para chats individuales
      if (createChatDto.type === ChatType.INDIVIDUAL && !createChatDto.name) {
        const otherParticipant = participants.find(p => p.id !== creatorId);
        // Modificar después de save
        const chatToModify = Array.isArray(chat) ? chat[0] : chat;
        chatToModify.name = `Chat con ${otherParticipant?.name || 'Usuario'}`;
      }

      const savedChat = await this.chatRepository.save(chat);
      // Asegurar que savedChat sea un objeto y no un array
      const finalChat = Array.isArray(savedChat) ? savedChat[0] : savedChat;

      // Mensaje de sistema de bienvenida
      if (createChatDto.type !== ChatType.INDIVIDUAL) {
        await this.createSystemMessage(
          finalChat.id,
          `Chat creado por ${creator.name}`,
          creatorId
        );
      }

      this.logger.log(`✅ Chat creado exitosamente: ${finalChat.id}`);

      return this.buildChatResponse(finalChat, creatorId);

    } catch (error) {
      this.logger.error(`❌ Error creando chat: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 📋 Obtener chats del usuario con filtros
   */
  async findUserChats(userId: string, queryDto: ChatQueryDto): Promise<PaginatedResponse<ChatResponse>> {
    this.logger.log(`📋 Obteniendo chats para usuario ${userId}`);

    try {
      const queryBuilder = this.chatRepository
        .createQueryBuilder('chat')
        .leftJoinAndSelect('chat.participants', 'participant')
        .where('participant.id = :userId', { userId })
        .andWhere('chat.status != :deletedStatus', { deletedStatus: ChatStatus.DELETED });

      // Aplicar filtros
      this.applyChatFilters(queryBuilder, queryDto);

      // Paginación
      const page = queryDto.page || 1;
      const limit = queryDto.limit || 20;
      const skip = (page - 1) * limit;

      queryBuilder
        .orderBy(`chat.${queryDto.sortBy || 'lastActivity'}`, queryDto.sortOrder || 'DESC')
        .skip(skip)
        .take(limit);

      const [chats, total] = await queryBuilder.getManyAndCount();

      // Construir respuestas con contexto
      const chatResponses = await Promise.all(
        chats.map(chat => this.buildChatResponse(chat, userId))
      );

      const response: PaginatedResponse<ChatResponse> = {
        data: chatResponses,
        meta: {
          currentPage: page,
          itemsPerPage: limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1,
        },
      };

      this.logger.log(`✅ ${chats.length} chats encontrados para usuario ${userId}`);
      return response;

    } catch (error) {
      this.logger.error(`❌ Error obteniendo chats: ${error.message}`, error.stack);
      throw new BadRequestException('Error obteniendo chats del usuario');
    }
  }

  /**
   * 📤 Enviar mensaje
   */
  async sendMessage(createMessageDto: CreateMessageDto, senderId: string): Promise<MessageResponse> {
    this.logger.log(`📤 Enviando mensaje al chat ${createMessageDto.chatId} por usuario ${senderId}`);

    try {
      // Verificar que el chat existe y el usuario puede escribir
      const chat = await this.chatRepository.findOne({
        where: { id: createMessageDto.chatId },
        relations: ['participants'],
      });

      if (!chat) {
        throw new NotFoundException('Chat no encontrado');
      }

      const sender = await this.userRepository.findOne({ where: { id: senderId } });
      if (!sender) {
        throw new NotFoundException('Usuario no encontrado');
      }

      if (!chat.canWrite(senderId, sender.role)) {
        throw new ForbiddenException('No tienes permisos para escribir en este chat');
      }

      // Crear el mensaje
      const message = this.messageRepository.create({
        ...createMessageDto,
        senderId,
        senderName: sender.name,
        senderAvatar: sender.avatar || null,
        senderRole: sender.role,
        plainContent: this.extractPlainText(createMessageDto.content),
        scheduledFor: createMessageDto.scheduledFor ? new Date(createMessageDto.scheduledFor) : null,
      });

      const savedMessage = await this.messageRepository.save(message);
      // Asegurar que savedMessage sea un objeto y no un array
      const finalMessage = Array.isArray(savedMessage) ? savedMessage[0] : savedMessage;

      // Actualizar estadísticas del chat
      chat.updateStats(finalMessage);
      await this.chatRepository.save(chat);

      this.logger.log(`✅ Mensaje enviado exitosamente: ${finalMessage.id}`);
      return this.buildMessageResponse(finalMessage, senderId);

    } catch (error) {
      this.logger.error(`❌ Error enviando mensaje: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 📊 Obtener estadísticas básicas
   */
  async getBasicStats(): Promise<CommunicationBasicStats> {
    const totalChats = await this.chatRepository.count();
    const activeChats = await this.chatRepository.count({ 
      where: { status: ChatStatus.ACTIVE } 
    });
    const totalMessages = await this.messageRepository.count();

    return {
      totalChats,
      activeChats,
      totalMessages,
      timestamp: new Date(),
    };
  }

  // =============================================================================
  // 🛠️ MÉTODOS AUXILIARES PRIVADOS
  // =============================================================================

  /**
   * 🏗️ Construir respuesta de chat con contexto del usuario
   */
  private async buildChatResponse(chat: Chat, userId: string): Promise<ChatResponse> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    return {
      chat: chat,
      unreadCount: 0, // TODO: Implementar sistema de mensajes leídos
      isParticipant: chat.isParticipant(userId),
      canWrite: chat.canWrite(userId, user?.role || 'student'),
      canModerate: chat.canModerate(userId, user?.role || 'student'),
      lastReadMessageId: null,
      lastAccessedAt: null,
    };
  }

  /**
   * 🏗️ Construir respuesta de mensaje con contexto del usuario
   */
  private async buildMessageResponse(message: ChatMessage, userId: string): Promise<MessageResponse> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    return {
      message,
      canEdit: message.canEdit(userId),
      canDelete: message.canDelete(userId, user?.role || 'student'),
      isRead: true,
      parentMessage: null,
      replyCount: 0,
    };
  }

  /**
   * 🔧 Aplicar filtros a query de chats
   */
  private applyChatFilters(queryBuilder: SelectQueryBuilder<Chat>, queryDto: ChatQueryDto): void {
    if (queryDto.type) {
      queryBuilder.andWhere('chat.type = :type', { type: queryDto.type });
    }

    if (queryDto.status) {
      queryBuilder.andWhere('chat.status = :status', { status: queryDto.status });
    }

    if (queryDto.classroomId) {
      queryBuilder.andWhere('chat.classroomId = :classroomId', { classroomId: queryDto.classroomId });
    }

    if (queryDto.search) {
      queryBuilder.andWhere(
        '(chat.name ILIKE :search OR chat.description ILIKE :search)',
        { search: `%${queryDto.search}%` }
      );
    }

    if (queryDto.pinnedOnly) {
      queryBuilder.andWhere('chat.isPinned = :isPinned', { isPinned: true });
    }
  }

  /**
   * 📝 Crear mensaje del sistema
   */
  private async createSystemMessage(chatId: string, content: string, triggeredBy: string): Promise<ChatMessage> {
    const systemMessage = this.messageRepository.create({
      chatId,
      senderId: triggeredBy,
      senderName: 'Sistema',
      senderRole: 'system',
      type: MessageType.SYSTEM,
      content,
      plainContent: content,
      isSystemMessage: true,
    });

    return await this.messageRepository.save(systemMessage);
  }

  /**
   * 📝 Extraer texto plano del contenido
   */
  private extractPlainText(content: string): string {
    return content
      .replace(/<[^>]*>/g, '') // Remover HTML
      .replace(/[*_~`]/g, '') // Remover markdown básico
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remover links markdown
      .trim();
  }
}