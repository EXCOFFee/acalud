/**
 * 💬 SERVICIO DE COMUNICACIONES - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Servicio que maneja toda la lógica de negocio para:
 * - Conversaciones (chats directos, grupales, foros)
 * - Mensajes con contenido multimedia
 * - Reacciones y interacciones
 * - Archivos adjuntos y moderación
 * 
 * PRINCIPIOS SOLID APLICADOS:
 * - SRP: Responsabilidad única de gestionar comunicaciones
 * - OCP: Extensible para nuevos tipos de conversaciones
 * - LSP: Implementa contratos bien definidos
 * - ISP: Interfaces específicas por funcionalidad
 * - DIP: Usa abstracciones e inyección de dependencias
 */

import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';

// 📁 Entidades del sistema
import { Conversation, ConversationStatus } from './conversation.entity';
import { Message, MessageType, MessageStatus } from './message.entity';
import { MessageReaction } from './message-reaction.entity';
import { MessageAttachment } from './message-attachment.entity';
import { User } from '../users/user.entity';
import { Classroom } from '../classrooms/classroom.entity';

// 📊 DTOs para transferencia de datos
import { CreateConversationDto, UpdateConversationDto, ConversationFilterDto } from './dto/conversation.dto';
import { CreateMessageDto, UpdateMessageDto, MessageFilterDto } from './dto/message.dto';
import { CreateReactionDto } from './dto/reaction.dto';
import { CreateAttachmentDto } from './dto/attachment.dto';

/**
 * Interfaz para estadísticas de conversaciones
 */
interface ConversationStats {
  totalMessages: number;
  totalParticipants: number;
  lastActivity: Date;
  messagesByType: Record<MessageType, number>;
  topActiveUsers: {
    userId: string;
    messageCount: number;
  }[];
}

/**
 * Interfaz para resultados de búsqueda
 */
interface MessageSearchResult {
  messages: Message[];
  total: number;
  hasMore: boolean;
}

/**
 * Servicio principal para el manejo de comunicaciones
 * 
 * @description Gestiona conversaciones, mensajes, archivos adjuntos
 * y todas las interacciones relacionadas con la comunicación.
 * 
 * @example
 * ```typescript
 * const conversation = await communicationsService.createConversation({
 *   title: 'Discusión de proyecto',
 *   type: ConversationType.GROUP,
 *   participantIds: ['user1', 'user2']
 * }, currentUser);
 * ```
 */
@Injectable()
export class CommunicationsService {
  constructor(
    // 🗃️ Repositorios para acceso a datos
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    
    @InjectRepository(MessageReaction)
    private readonly reactionRepository: Repository<MessageReaction>,
    
    @InjectRepository(MessageAttachment)
    private readonly attachmentRepository: Repository<MessageAttachment>,
    
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    
    @InjectRepository(Classroom)
    private readonly classroomRepository: Repository<Classroom>,
    
    // 📡 Sistema de eventos para comunicación entre módulos
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // =============================================================================
  // 💬 GESTIÓN DE CONVERSACIONES
  // =============================================================================

  /**
   * Crea una nueva conversación
   * 
   * @param createData - Datos para crear la conversación
   * @param creator - Usuario que crea la conversación
   * @returns Promise<Conversation> - Conversación creada
   * 
   * @throws NotFoundException - Si los participantes no existen
   * @throws ForbiddenException - Si el usuario no tiene permisos
   */
  async createConversation(
    createData: CreateConversationDto,
    creator: User,
  ): Promise<Conversation> {
    // 🔍 Validar que los participantes existen
    if (createData.participantIds?.length > 0) {
      const participants = await this.userRepository.findBy({
        id: In(createData.participantIds),
      });
      
      if (participants.length !== createData.participantIds.length) {
        throw new NotFoundException('Algunos participantes no fueron encontrados');
      }
    }

    // 🏫 Validar el aula si es conversación de clase
    let classroom: Classroom | undefined;
    if (createData.classroomId) {
      classroom = await this.classroomRepository.findOne({
        where: { id: createData.classroomId },
        relations: ['teacher', 'students'],
      });
      
      if (!classroom) {
        throw new NotFoundException('Aula no encontrada');
      }
      
      // Verificar permisos en el aula
      const isTeacher = classroom.teacher.id === creator.id;
      const isStudent = classroom.students.some(student => student.id === creator.id);
      
      if (!isTeacher && !isStudent) {
        throw new ForbiddenException('No tienes permisos para crear conversaciones en esta aula');
      }
    }

    // 🆕 Crear la conversación
    const conversation = this.conversationRepository.create({
      title: createData.title,
      description: createData.description,
      type: createData.type,
      status: ConversationStatus.ACTIVE,
      classroom,
      creator: creator,
    });

    // 💾 Guardar la conversación
    const savedConversation = await this.conversationRepository.save(conversation);
    const finalConversation = Array.isArray(savedConversation) ? savedConversation[0] : savedConversation;

    // 📡 Emitir evento de conversación creada
    this.eventEmitter.emit('conversation.created', {
      conversation: finalConversation,
      creator,
      participantIds: createData.participantIds || [],
    });

    return finalConversation;
  }

  /**
   * Obtiene las conversaciones de un usuario
   * 
   * @param userId - ID del usuario
   * @param filters - Filtros de búsqueda
   * @returns Promise<Conversation[]> - Lista de conversaciones
   */
  async getUserConversations(
    userId: string,
    filters: ConversationFilterDto,
  ): Promise<Conversation[]> {
    // 🔍 Construir query con filtros
    const queryBuilder = this.conversationRepository.createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.classroom', 'classroom')
      .leftJoinAndSelect('conversation.createdBy', 'createdBy')
      .leftJoinAndSelect('conversation.messages', 'messages')
      .where('conversation.participants @> :userId', { userId: `["${userId}"]` })
      .orWhere('createdBy.id = :userId', { userId });

    // 🏷️ Aplicar filtros
    if (filters.type) {
      queryBuilder.andWhere('conversation.type = :type', { type: filters.type });
    }

    if (filters.status) {
      queryBuilder.andWhere('conversation.status = :status', { status: filters.status });
    }

    if (filters.classroomId) {
      queryBuilder.andWhere('classroom.id = :classroomId', { classroomId: filters.classroomId });
    }

    if (filters.isPrivate !== undefined) {
      queryBuilder.andWhere('conversation.isPrivate = :isPrivate', { isPrivate: filters.isPrivate });
    }

    // 📊 Ordenar por actividad reciente
    queryBuilder.orderBy('conversation.lastActivity', 'DESC');

    // 📄 Aplicar paginación
    if (filters.limit) {
      queryBuilder.limit(filters.limit);
    }
    if (filters.offset) {
      queryBuilder.offset(filters.offset);
    }

    return await queryBuilder.getMany();
  }

  /**
   * Obtiene una conversación por ID con verificación de permisos
   * 
   * @param conversationId - ID de la conversación
   * @param userId - ID del usuario que solicita
   * @returns Promise<Conversation> - Conversación encontrada
   * 
   * @throws NotFoundException - Si la conversación no existe
   * @throws ForbiddenException - Si el usuario no tiene acceso
   */
  async getConversationById(
    conversationId: string,
    userId: string,
  ): Promise<Conversation> {
    // 🔍 Buscar la conversación con relaciones
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['classroom', 'createdBy', 'messages', 'messages.author', 'messages.reactions', 'messages.attachments'],
    });

    if (!conversation) {
      throw new NotFoundException('Conversación no encontrada');
    }

    // 🔐 Verificar permisos de acceso
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !conversation.isUserParticipant(user)) {
      throw new ForbiddenException('No tienes permisos para acceder a esta conversación');
    }

    return conversation;
  }

  /**
   * Actualiza una conversación existente
   * 
   * @param conversationId - ID de la conversación
   * @param updateData - Datos a actualizar
   * @param userId - ID del usuario que actualiza
   * @returns Promise<Conversation> - Conversación actualizada
   */
  async updateConversation(
    conversationId: string,
    updateData: UpdateConversationDto,
    userId: string,
  ): Promise<Conversation> {
    // 🔍 Obtener conversación con verificación de permisos
    const conversation = await this.getConversationById(conversationId, userId);

    // 🔐 Verificar permisos de moderación
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || (conversation.creatorId !== userId && !conversation.isUserParticipant(user))) {
      throw new ForbiddenException('No tienes permisos para modificar esta conversación');
    }

    // 📝 Actualizar campos permitidos
    Object.assign(conversation, updateData);
    conversation.updatedAt = new Date();

    // 💾 Guardar cambios
    const updatedConversation = await this.conversationRepository.save(conversation);

    // 📡 Emitir evento de actualización
    this.eventEmitter.emit('conversation.updated', {
      conversation: updatedConversation,
      updatedBy: userId,
      changes: updateData,
    });

    return updatedConversation;
  }

  // =============================================================================
  // 💌 GESTIÓN DE MENSAJES
  // =============================================================================

  /**
   * Envía un nuevo mensaje en una conversación
   * 
   * @param conversationId - ID de la conversación
   * @param messageData - Datos del mensaje
   * @param author - Usuario que envía el mensaje
   * @returns Promise<Message> - Mensaje creado
   */
  async sendMessage(
    conversationId: string,
    messageData: CreateMessageDto,
    author: User,
  ): Promise<Message> {
    // 🔍 Verificar acceso a la conversación
    const conversation = await this.getConversationById(conversationId, author.id);

    // 🔐 Verificar si puede enviar mensajes
    if (!conversation.isUserParticipant(author)) {
      throw new ForbiddenException('No puedes enviar mensajes en esta conversación');
    }

    // 🆕 Crear el mensaje
    const message = this.messageRepository.create({
      content: messageData.content,
      type: messageData.type || MessageType.TEXT,
      status: MessageStatus.SENT,
      conversation,
      author,
      parentMessage: messageData.parentMessageId ? 
        await this.messageRepository.findOne({ where: { id: messageData.parentMessageId } }) : 
        undefined,
      metadata: messageData.metadata || {},
    });

    // 💾 Guardar el mensaje
    const savedMessage = await this.messageRepository.save(message);

    // 📅 Actualizar actividad de la conversación
    conversation.lastActivityAt = new Date();
    await this.conversationRepository.save(conversation);

    // 📡 Emitir evento de mensaje enviado
    this.eventEmitter.emit('message.sent', {
      message: savedMessage,
      conversation,
      author,
    });

    return savedMessage;
  }

  /**
   * Obtiene mensajes de una conversación con paginación
   * 
   * @param conversationId - ID de la conversación
   * @param userId - ID del usuario que solicita
   * @param filters - Filtros de búsqueda
   * @returns Promise<MessageSearchResult> - Mensajes encontrados
   */
  async getConversationMessages(
    conversationId: string,
    userId: string,
    filters: MessageFilterDto,
  ): Promise<MessageSearchResult> {
    // 🔍 Verificar acceso a la conversación
    await this.getConversationById(conversationId, userId);

    // 🏗️ Construir query
    const queryBuilder = this.messageRepository.createQueryBuilder('message')
      .leftJoinAndSelect('message.author', 'author')
      .leftJoinAndSelect('message.reactions', 'reactions')
      .leftJoinAndSelect('message.attachments', 'attachments')
      .leftJoinAndSelect('message.parentMessage', 'parentMessage')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('message.deletedAt IS NULL'); // Solo mensajes no eliminados

    // 🏷️ Aplicar filtros
    if (filters.type) {
      queryBuilder.andWhere('message.type = :type', { type: filters.type });
    }

    if (filters.authorId) {
      queryBuilder.andWhere('author.id = :authorId', { authorId: filters.authorId });
    }

    if (filters.search) {
      queryBuilder.andWhere('message.content ILIKE :search', { 
        search: `%${filters.search}%` 
      });
    }

    if (filters.dateFrom) {
      queryBuilder.andWhere('message.createdAt >= :dateFrom', { 
        dateFrom: filters.dateFrom 
      });
    }

    if (filters.dateTo) {
      queryBuilder.andWhere('message.createdAt <= :dateTo', { 
        dateTo: filters.dateTo 
      });
    }

    // 📊 Ordenar por fecha
    queryBuilder.orderBy('message.createdAt', filters.sortOrder || 'ASC');

    // 📄 Contar total
    const total = await queryBuilder.getCount();

    // 📄 Aplicar paginación
    if (filters.limit) {
      queryBuilder.limit(filters.limit);
    }
    if (filters.offset) {
      queryBuilder.offset(filters.offset);
    }

    // 📋 Obtener mensajes
    const messages = await queryBuilder.getMany();

    return {
      messages,
      total,
      hasMore: (filters.offset || 0) + messages.length < total,
    };
  }

  /**
   * Actualiza un mensaje existente
   * 
   * @param messageId - ID del mensaje
   * @param updateData - Datos a actualizar
   * @param userId - ID del usuario que actualiza
   * @returns Promise<Message> - Mensaje actualizado
   */
  async updateMessage(
    messageId: string,
    updateData: UpdateMessageDto,
    userId: string,
  ): Promise<Message> {
    // 🔍 Buscar el mensaje
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['author', 'conversation'],
    });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    // 🔐 Verificar permisos (solo el autor o moderador)
    const conversation = await this.getConversationById(message.conversation.id, userId);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const canEdit = message.author.id === userId || (user && conversation.creatorId === userId);

    if (!canEdit) {
      throw new ForbiddenException('No tienes permisos para editar este mensaje');
    }

    // 📝 Actualizar contenido
    if (updateData.content !== undefined) {
      message.content = updateData.content;
      message.updatedAt = new Date();
    }

    // 💾 Guardar cambios
    const updatedMessage = await this.messageRepository.save(message);

    // 📡 Emitir evento de edición
    this.eventEmitter.emit('message.updated', {
      message: updatedMessage,
      updatedBy: userId,
      changes: updateData,
    });

    return updatedMessage;
  }

  /**
   * Elimina un mensaje (soft delete)
   * 
   * @param messageId - ID del mensaje
   * @param userId - ID del usuario que elimina
   * @returns Promise<void>
   */
  async deleteMessage(messageId: string, userId: string): Promise<void> {
    // 🔍 Buscar el mensaje
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['author', 'conversation'],
    });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    // 🔐 Verificar permisos
    const conversation = await this.getConversationById(message.conversation.id, userId);
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const canDelete = message.author.id === userId || (user && conversation.creatorId === userId);

    if (!canDelete) {
      throw new ForbiddenException('No tienes permisos para eliminar este mensaje');
    }

    // 🗑️ Marcar como eliminado (soft delete usando TypeORM)
    await this.messageRepository.softDelete(message.id);

    // 📡 Emitir evento de eliminación
    this.eventEmitter.emit('message.deleted', {
      messageId,
      conversationId: message.conversation.id,
      deletedBy: userId,
    });
  }

  // =============================================================================
  // 👍 GESTIÓN DE REACCIONES
  // =============================================================================

  /**
   * Agrega o actualiza una reacción a un mensaje
   * 
   * @param messageId - ID del mensaje
   * @param reactionData - Datos de la reacción
   * @param userId - ID del usuario que reacciona
   * @returns Promise<MessageReaction> - Reacción creada/actualizada
   */
  async addReaction(
    messageId: string,
    reactionData: CreateReactionDto,
    userId: string,
  ): Promise<MessageReaction> {
    // 🔍 Verificar que el mensaje existe y es accesible
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['conversation'],
    });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    // 🔐 Verificar acceso a la conversación
    await this.getConversationById(message.conversation.id, userId);

    // 🔍 Verificar si ya existe una reacción del usuario
    let reaction = await this.reactionRepository.findOne({
      where: {
        messageId,
        userId,
      },
    });

    if (reaction) {
      // 📝 Actualizar reacción existente
      reaction.type = reactionData.type;
      reaction.updatedAt = new Date();
    } else {
      // 🆕 Crear nueva reacción
      reaction = this.reactionRepository.create({
        messageId,
        userId,
        type: reactionData.type,
        message,
        user: { id: userId } as User,
      });
    }

    // 💾 Guardar la reacción
    const savedReaction = await this.reactionRepository.save(reaction);

    // 📡 Emitir evento de reacción
    this.eventEmitter.emit('message.reacted', {
      reaction: savedReaction,
      messageId,
      userId,
      isNew: !reaction.updatedAt,
    });

    return savedReaction;
  }

  /**
   * Elimina una reacción de un mensaje
   * 
   * @param messageId - ID del mensaje
   * @param userId - ID del usuario
   * @returns Promise<void>
   */
  async removeReaction(messageId: string, userId: string): Promise<void> {
    // 🔍 Buscar la reacción
    const reaction = await this.reactionRepository.findOne({
      where: {
        messageId,
        userId,
      },
    });

    if (!reaction) {
      throw new NotFoundException('Reacción no encontrada');
    }

    // 🗑️ Eliminar la reacción
    await this.reactionRepository.remove(reaction);

    // 📡 Emitir evento de eliminación
    this.eventEmitter.emit('message.reaction.removed', {
      messageId,
      userId,
      reactionType: reaction.type,
    });
  }

  // =============================================================================
  // 📎 GESTIÓN DE ARCHIVOS ADJUNTOS
  // =============================================================================

  /**
   * Agrega un archivo adjunto a un mensaje
   * 
   * @param messageId - ID del mensaje
   * @param attachmentData - Datos del archivo
   * @param userId - ID del usuario que sube el archivo
   * @returns Promise<MessageAttachment> - Archivo adjunto creado
   */
  async addAttachment(
    messageId: string,
    attachmentData: CreateAttachmentDto,
    userId: string,
  ): Promise<MessageAttachment> {
    // 🔍 Verificar que el mensaje existe y es del usuario
    const message = await this.messageRepository.findOne({
      where: { id: messageId },
      relations: ['author', 'conversation'],
    });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    // 🔐 Verificar permisos (solo el autor del mensaje)
    if (message.author.id !== userId) {
      throw new ForbiddenException('Solo puedes agregar archivos a tus propios mensajes');
    }

    // 🆕 Crear el archivo adjunto
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const attachment = this.attachmentRepository.create({
      ...attachmentData,
      messageId,
      uploadedById: userId,
      message,
      uploadedBy: user,
    });

    // 💾 Guardar el archivo
    const savedAttachment = await this.attachmentRepository.save(attachment);

    // 📡 Emitir evento de archivo adjunto
    this.eventEmitter.emit('message.attachment.added', {
      attachment: savedAttachment,
      messageId,
      userId,
    });

    return Array.isArray(savedAttachment) ? savedAttachment[0] : savedAttachment;
  }

  // =============================================================================
  // 📊 ESTADÍSTICAS Y ANALYTICS
  // =============================================================================

  /**
   * Obtiene estadísticas de una conversación
   * 
   * @param conversationId - ID de la conversación
   * @param userId - ID del usuario que solicita
   * @returns Promise<ConversationStats> - Estadísticas
   */
  async getConversationStats(
    conversationId: string,
    userId: string,
  ): Promise<ConversationStats> {
    // 🔍 Verificar acceso a la conversación
    const conversation = await this.getConversationById(conversationId, userId);

    // 📊 Obtener estadísticas básicas
    const totalMessages = await this.messageRepository.count({
      where: { conversationId, deletedAt: null },
    });

    // 📊 Mensajes por tipo
    const messagesByType = await this.messageRepository
      .createQueryBuilder('message')
      .select('message.type, COUNT(*) as count')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('message.deletedAt IS NULL')
      .groupBy('message.type')
      .getRawMany();

    // 👥 Usuarios más activos
    const topActiveUsers = await this.messageRepository
      .createQueryBuilder('message')
      .select('message.authorId as userId, COUNT(*) as messageCount')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('message.deletedAt IS NULL')
      .groupBy('message.authorId')
      .orderBy('messageCount', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      totalMessages,
      totalParticipants: conversation.participants?.length || 0,
      lastActivity: conversation.lastActivityAt,
      messagesByType: messagesByType.reduce((acc, item) => {
        acc[item.type] = parseInt(item.count);
        return acc;
      }, {} as Record<MessageType, number>),
      topActiveUsers: topActiveUsers.map(user => ({
        userId: user.userId,
        messageCount: parseInt(user.messageCount),
      })),
    };
  }
}