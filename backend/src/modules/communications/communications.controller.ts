/**
 * 🎮 CONTROLLER DE COMUNICACIONES - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Controlador REST que expone endpoints para:
 * - Gestión de conversaciones (crear, listar, actualizar)
 * - Envío y gestión de mensajes
 * - Sistema de reacciones a mensajes
 * - Gestión de archivos adjuntos
 * - Estadísticas y analytics
 * 
 * PRINCIPIOS SOLID APLICADOS:
 * - SRP: Responsabilidad única de manejar HTTP requests
 * - OCP: Extensible para nuevos endpoints
 * - LSP: Implementa contratos bien definidos
 * - ISP: Interfaces específicas por operación
 * - DIP: Depende de abstracciones (servicios)
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  ValidationPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { Request as ExpressRequest } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommunicationsService } from './communications.service';

// 📝 Importar DTOs
import {
  CreateConversationDto,
  UpdateConversationDto,
  ConversationFilterDto,
  ConversationResponseDto,
} from './dto/conversation.dto';
import {
  CreateMessageDto,
  UpdateMessageDto,
  MessageFilterDto,
  MessageResponseDto,
} from './dto/message.dto';
import {
  CreateReactionDto,
  ReactionResponseDto,
} from './dto/reaction.dto';
import {
  CreateAttachmentDto,
  AttachmentResponseDto,
} from './dto/attachment.dto';
import { AttachmentType } from './message-attachment.entity';
import type { User } from '../users/user.entity';

interface AuthenticatedRequest extends ExpressRequest {
  user: User;
}

/**
 * Interface para respuesta paginada
 */
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Interface para respuesta de estadísticas
 */
interface StatsResponse {
  totalMessages: number;
  totalParticipants: number;
  lastActivity: Date;
  messagesByType: Record<string, number>;
  topActiveUsers: Array<{
    userId: string;
    messageCount: number;
  }>;
}

/**
 * Controlador principal para todas las operaciones de comunicaciones
 * 
 * @description Expone endpoints REST para gestión completa de:
 * conversaciones, mensajes, reacciones y archivos adjuntos.
 * 
 * @example
 * ```typescript
 * // Crear nueva conversación
 * POST /api/communications/conversations
 * {
 *   "title": "Discusión Matemáticas",
 *   "type": "classroom_chat",
 *   "classroomId": "uuid-classroom"
 * }
 * ```
 */
@ApiTags('💬 Comunicaciones')
@Controller('communications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CommunicationsController {
  constructor(
    private readonly communicationsService: CommunicationsService,
  ) {}

  // =============================================================================
  // 💬 ENDPOINTS DE CONVERSACIONES
  // =============================================================================

  /**
   * Crea una nueva conversación
   * 
   * @param createConversationDto - Datos para crear la conversación
   * @param req - Request con información del usuario autenticado
   * @returns Promise<ConversationResponseDto> - Conversación creada
   */
  @Post('conversations')
  @ApiOperation({
    summary: 'Crear nueva conversación',
    description: 'Crea una nueva conversación (chat, foro, grupo, etc.) con participantes específicos',
  })
  @ApiCreatedResponse({
    description: 'Conversación creada exitosamente',
    type: ConversationResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos',
  })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para crear conversaciones en este contexto',
  })
  @ApiBody({
    type: CreateConversationDto,
    description: 'Datos necesarios para crear la conversación',
  })
  async createConversation(
    @Body(ValidationPipe) createConversationDto: CreateConversationDto,
  @Request() req: AuthenticatedRequest,
  ): Promise<ConversationResponseDto> {
    // 🔍 Obtener usuario autenticado del request
    const user = req.user;

    // 🆕 Crear la conversación usando el servicio
    const conversation = await this.communicationsService.createConversation(
      createConversationDto,
      user,
    );

    // 📊 Transformar a DTO de respuesta
    return {
      id: conversation.id,
      title: conversation.title,
      description: conversation.description,
      type: conversation.type,
      status: conversation.status,
      isPrivate: conversation.settings?.privacy?.isPublic === false,
      messageCount: conversation.messageCount,
      participantCount: conversation.participantCount,
      lastActivityAt: conversation.lastActivityAt,
      createdAt: conversation.createdAt,
      metadata: conversation.settings,
    };
  }

  /**
   * Obtiene las conversaciones del usuario autenticado
   * 
   * @param filters - Filtros de búsqueda y paginación
   * @param req - Request con información del usuario
   * @returns Promise<PaginatedResponse<ConversationResponseDto>> - Lista paginada
   */
  @Get('conversations')
  @ApiOperation({
    summary: 'Listar conversaciones del usuario',
    description: 'Obtiene todas las conversaciones donde el usuario es participante, con filtros y paginación',
  })
  @ApiOkResponse({
    description: 'Lista de conversaciones obtenida exitosamente',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/ConversationResponseDto' },
        },
        total: { type: 'number', example: 25 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
        hasMore: { type: 'boolean', example: true },
      },
    },
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: 'Filtrar por tipo de conversación',
    enum: ['direct', 'classroom_chat', 'forum_thread', 'announcement_channel', 'private_group', 'support_ticket'],
  })
  @ApiQuery({
    name: 'classroomId',
    required: false,
    description: 'ID del aula para filtrar conversaciones',
    type: 'string',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Número máximo de resultados',
    type: 'number',
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Número de resultados a omitir',
    type: 'number',
    example: 0,
  })
  async getUserConversations(
    @Query(ValidationPipe) filters: ConversationFilterDto,
  @Request() req: AuthenticatedRequest,
  ): Promise<PaginatedResponse<ConversationResponseDto>> {
    // 🔍 Obtener usuario autenticado
    const userId = req.user.id;

    // 📋 Obtener conversaciones del servicio
    const conversations = await this.communicationsService.getUserConversations(
      userId,
      filters,
    );

    // 📊 Transformar a DTOs de respuesta
    const data = conversations.map(conversation => ({
      id: conversation.id,
      title: conversation.title,
      description: conversation.description,
      type: conversation.type,
      status: conversation.status,
      isPrivate: conversation.settings?.privacy?.isPublic === false,
      messageCount: conversation.messageCount,
      participantCount: conversation.participantCount,
      lastActivityAt: conversation.lastActivityAt,
      createdAt: conversation.createdAt,
      metadata: conversation.settings,
    }));

    // 📄 Calcular información de paginación
    const limit = filters.limit || 20;
    const offset = filters.offset || 0;
    const page = Math.floor(offset / limit) + 1;

    return {
      data,
      total: data.length, // En una implementación completa, esto vendría del servicio
      page,
      limit,
      hasMore: data.length === limit, // Indica si hay más resultados
    };
  }

  /**
   * Obtiene una conversación específica por ID
   * 
   * @param conversationId - ID de la conversación
   * @param req - Request con información del usuario
   * @returns Promise<ConversationResponseDto> - Conversación encontrada
   */
  @Get('conversations/:id')
  @ApiOperation({
    summary: 'Obtener conversación por ID',
    description: 'Obtiene los detalles completos de una conversación específica',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la conversación',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Conversación encontrada exitosamente',
    type: ConversationResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Conversación no encontrada',
  })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para acceder a esta conversación',
  })
  async getConversationById(
    @Param('id', ParseUUIDPipe) conversationId: string,
  @Request() req: AuthenticatedRequest,
  ): Promise<ConversationResponseDto> {
    // 🔍 Obtener conversación con verificación de permisos
    const conversation = await this.communicationsService.getConversationById(
      conversationId,
      req.user.id,
    );

    // 📊 Transformar a DTO de respuesta
    return {
      id: conversation.id,
      title: conversation.title,
      description: conversation.description,
      type: conversation.type,
      status: conversation.status,
      isPrivate: conversation.settings?.privacy?.isPublic === false,
      messageCount: conversation.messageCount,
      participantCount: conversation.participantCount,
      lastActivityAt: conversation.lastActivityAt,
      createdAt: conversation.createdAt,
      metadata: conversation.settings,
    };
  }

  /**
   * Actualiza una conversación existente
   * 
   * @param conversationId - ID de la conversación
   * @param updateConversationDto - Datos a actualizar
   * @param req - Request con información del usuario
   * @returns Promise<ConversationResponseDto> - Conversación actualizada
   */
  @Put('conversations/:id')
  @ApiOperation({
    summary: 'Actualizar conversación',
    description: 'Actualiza los datos de una conversación existente (solo creadores y moderadores)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la conversación',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Conversación actualizada exitosamente',
    type: ConversationResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Conversación no encontrada',
  })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para modificar esta conversación',
  })
  @ApiBody({
    type: UpdateConversationDto,
    description: 'Campos a actualizar en la conversación',
  })
  async updateConversation(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Body(ValidationPipe) updateConversationDto: UpdateConversationDto,
  @Request() req: AuthenticatedRequest,
  ): Promise<ConversationResponseDto> {
    // 📝 Actualizar conversación usando el servicio
    const conversation = await this.communicationsService.updateConversation(
      conversationId,
      updateConversationDto,
      req.user.id,
    );

    // 📊 Transformar a DTO de respuesta
    return {
      id: conversation.id,
      title: conversation.title,
      description: conversation.description,
      type: conversation.type,
      status: conversation.status,
      isPrivate: conversation.settings?.privacy?.isPublic === false,
      messageCount: conversation.messageCount,
      participantCount: conversation.participantCount,
      lastActivityAt: conversation.lastActivityAt,
      createdAt: conversation.createdAt,
      metadata: conversation.settings,
    };
  }

  // =============================================================================
  // 💌 ENDPOINTS DE MENSAJES
  // =============================================================================

  /**
   * Envía un nuevo mensaje en una conversación
   * 
   * @param conversationId - ID de la conversación
   * @param createMessageDto - Datos del mensaje
   * @param req - Request con información del usuario
   * @returns Promise<MessageResponseDto> - Mensaje creado
   */
  @Post('conversations/:id/messages')
  @ApiOperation({
    summary: 'Enviar mensaje',
    description: 'Envía un nuevo mensaje en una conversación específica',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la conversación',
    type: 'string',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Mensaje enviado exitosamente',
    type: MessageResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Datos del mensaje inválidos',
  })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para enviar mensajes en esta conversación',
  })
  @ApiBody({
    type: CreateMessageDto,
    description: 'Contenido y metadatos del mensaje',
  })
  async sendMessage(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Body(ValidationPipe) createMessageDto: CreateMessageDto,
  @Request() req: AuthenticatedRequest,
  ): Promise<MessageResponseDto> {
    // 💌 Enviar mensaje usando el servicio
    const message = await this.communicationsService.sendMessage(
      conversationId,
      createMessageDto,
      req.user,
    );

    // 📊 Transformar a DTO de respuesta
    return {
      id: message.id,
      content: message.content,
      type: message.type,
      author: {
        id: message.author.id,
        email: message.author.email,
        firstName: message.author.firstName,
        lastName: message.author.lastName,
      },
      isEdited: message.updatedAt > message.createdAt,
      editedAt: message.updatedAt > message.createdAt ? message.updatedAt : undefined,
      reactionCount: message.reactions?.length || 0,
      attachmentCount: message.attachments?.length || 0,
      replyCount: 0, // Se calcularía en una implementación completa
      createdAt: message.createdAt,
      metadata: message.metadata,
    };
  }

  /**
   * Obtiene los mensajes de una conversación
   * 
   * @param conversationId - ID de la conversación
   * @param filters - Filtros de búsqueda y paginación
   * @param req - Request con información del usuario
   * @returns Promise<PaginatedResponse<MessageResponseDto>> - Lista paginada de mensajes
   */
  @Get('conversations/:id/messages')
  @ApiOperation({
    summary: 'Listar mensajes de conversación',
    description: 'Obtiene todos los mensajes de una conversación con filtros y paginación',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la conversación',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Lista de mensajes obtenida exitosamente',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/MessageResponseDto' },
        },
        total: { type: 'number', example: 150 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 50 },
        hasMore: { type: 'boolean', example: true },
      },
    },
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Texto a buscar en el contenido de los mensajes',
    type: 'string',
  })
  @ApiQuery({
    name: 'authorId',
    required: false,
    description: 'ID del autor para filtrar mensajes',
    type: 'string',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Número máximo de mensajes',
    type: 'number',
    example: 50,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Número de mensajes a omitir',
    type: 'number',
    example: 0,
  })
  async getConversationMessages(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Query(ValidationPipe) filters: MessageFilterDto,
  @Request() req: AuthenticatedRequest,
  ): Promise<PaginatedResponse<MessageResponseDto>> {
    // 📋 Obtener mensajes del servicio
    const result = await this.communicationsService.getConversationMessages(
      conversationId,
      req.user.id,
      filters,
    );

    // 📊 Transformar mensajes a DTOs de respuesta
    const data = result.messages.map(message => ({
      id: message.id,
      content: message.content,
      type: message.type,
      author: {
        id: message.author.id,
        email: message.author.email,
        firstName: message.author.firstName,
        lastName: message.author.lastName,
      },
      isEdited: message.updatedAt > message.createdAt,
      editedAt: message.updatedAt > message.createdAt ? message.updatedAt : undefined,
      reactionCount: message.reactions?.length || 0,
      attachmentCount: message.attachments?.length || 0,
      replyCount: 0, // Se calcularía en una implementación completa
      createdAt: message.createdAt,
      metadata: message.metadata,
    }));

    // 📄 Calcular información de paginación
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    const page = Math.floor(offset / limit) + 1;

    return {
      data,
      total: result.total,
      page,
      limit,
      hasMore: result.hasMore,
    };
  }

  /**
   * Actualiza un mensaje existente
   * 
   * @param messageId - ID del mensaje
   * @param updateMessageDto - Datos a actualizar
   * @param req - Request con información del usuario
   * @returns Promise<MessageResponseDto> - Mensaje actualizado
   */
  @Put('messages/:id')
  @ApiOperation({
    summary: 'Actualizar mensaje',
    description: 'Actualiza el contenido de un mensaje (solo el autor puede editar)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del mensaje',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Mensaje actualizado exitosamente',
    type: MessageResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'Mensaje no encontrado',
  })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para editar este mensaje',
  })
  @ApiBody({
    type: UpdateMessageDto,
    description: 'Nuevo contenido del mensaje',
  })
  async updateMessage(
    @Param('id', ParseUUIDPipe) messageId: string,
    @Body(ValidationPipe) updateMessageDto: UpdateMessageDto,
  @Request() req: AuthenticatedRequest,
  ): Promise<MessageResponseDto> {
    // 📝 Actualizar mensaje usando el servicio
    const message = await this.communicationsService.updateMessage(
      messageId,
      updateMessageDto,
      req.user.id,
    );

    // 📊 Transformar a DTO de respuesta
    return {
      id: message.id,
      content: message.content,
      type: message.type,
      author: {
        id: message.author.id,
        email: message.author.email,
        firstName: message.author.firstName,
        lastName: message.author.lastName,
      },
      isEdited: message.updatedAt > message.createdAt,
      editedAt: message.updatedAt > message.createdAt ? message.updatedAt : undefined,
      reactionCount: message.reactions?.length || 0,
      attachmentCount: message.attachments?.length || 0,
      replyCount: 0,
      createdAt: message.createdAt,
      metadata: message.metadata,
    };
  }

  /**
   * Elimina un mensaje
   * 
   * @param messageId - ID del mensaje
   * @param req - Request con información del usuario
   * @returns Promise<void>
   */
  @Delete('messages/:id')
  @ApiOperation({
    summary: 'Eliminar mensaje',
    description: 'Elimina un mensaje (solo el autor o moderadores pueden eliminar)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del mensaje',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Mensaje eliminado exitosamente',
  })
  @ApiNotFoundResponse({
    description: 'Mensaje no encontrado',
  })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para eliminar este mensaje',
  })
  async deleteMessage(
    @Param('id', ParseUUIDPipe) messageId: string,
  @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    // 🗑️ Eliminar mensaje usando el servicio
    await this.communicationsService.deleteMessage(messageId, req.user.id);

    return {
      message: 'Mensaje eliminado exitosamente',
    };
  }

  // =============================================================================
  // 👍 ENDPOINTS DE REACCIONES
  // =============================================================================

  /**
   * Agrega o actualiza una reacción a un mensaje
   * 
   * @param messageId - ID del mensaje
   * @param createReactionDto - Tipo de reacción
   * @param req - Request con información del usuario
   * @returns Promise<ReactionResponseDto> - Reacción creada
   */
  @Post('messages/:id/reactions')
  @ApiOperation({
    summary: 'Reaccionar a mensaje',
    description: 'Agrega o actualiza una reacción a un mensaje específico',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del mensaje',
    type: 'string',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Reacción agregada exitosamente',
    type: ReactionResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Tipo de reacción inválido',
  })
  @ApiBody({
    type: CreateReactionDto,
    description: 'Tipo de reacción a agregar',
  })
  async addReaction(
    @Param('id', ParseUUIDPipe) messageId: string,
    @Body(ValidationPipe) createReactionDto: CreateReactionDto,
  @Request() req: AuthenticatedRequest,
  ): Promise<ReactionResponseDto> {
    // 👍 Agregar reacción usando el servicio
    const reaction = await this.communicationsService.addReaction(
      messageId,
      createReactionDto,
      req.user.id,
    );

    // 📊 Transformar a DTO de respuesta
    return {
      id: reaction.id,
      type: reaction.type,
      emoji: reaction.getEmoji(),
      userId: reaction.userId,
      messageId: reaction.messageId,
      createdAt: reaction.createdAt,
    };
  }

  /**
   * Elimina una reacción de un mensaje
   * 
   * @param messageId - ID del mensaje
   * @param req - Request con información del usuario
   * @returns Promise<void>
   */
  @Delete('messages/:id/reactions')
  @ApiOperation({
    summary: 'Eliminar reacción',
    description: 'Elimina la reacción del usuario actual al mensaje especificado',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único del mensaje',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Reacción eliminada exitosamente',
  })
  @ApiNotFoundResponse({
    description: 'Reacción no encontrada',
  })
  async removeReaction(
    @Param('id', ParseUUIDPipe) messageId: string,
  @Request() req: AuthenticatedRequest,
  ): Promise<{ message: string }> {
    // 🗑️ Eliminar reacción usando el servicio
    await this.communicationsService.removeReaction(messageId, req.user.id);

    return {
      message: 'Reacción eliminada exitosamente',
    };
  }

  // =============================================================================
  // 📎 ENDPOINTS DE ARCHIVOS ADJUNTOS
  // =============================================================================

  /**
   * Sube un archivo adjunto a un mensaje
   * 
   * @param messageId - ID del mensaje
   * @param file - Archivo subido
   * @param req - Request con información del usuario
   * @returns Promise<AttachmentResponseDto> - Archivo adjunto creado
   */
  @Post('messages/:id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({
    summary: 'Subir archivo adjunto',
    description: 'Sube un archivo y lo adjunta a un mensaje específico',
  })
  @ApiConsumes('multipart/form-data')
  @ApiParam({
    name: 'id',
    description: 'ID único del mensaje',
    type: 'string',
    format: 'uuid',
  })
  @ApiCreatedResponse({
    description: 'Archivo adjunto subido exitosamente',
    type: AttachmentResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Archivo inválido o datos incorrectos',
  })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para adjuntar archivos a este mensaje',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo a subir',
        },
      },
    },
  })
  async uploadAttachment(
    @Param('id', ParseUUIDPipe) messageId: string,
    @UploadedFile() file: Express.Multer.File,
  @Request() req: AuthenticatedRequest,
  ): Promise<AttachmentResponseDto> {
    // 🔍 Validar que se subió un archivo
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    // 📁 Crear DTO del archivo adjunto
    const createAttachmentDto: CreateAttachmentDto = {
      type: this.getAttachmentTypeFromMime(file.mimetype),
      originalName: file.originalname,
      fileName: `${Date.now()}_${file.originalname}`,
      filePath: file.path || `/uploads/${file.filename}`,
      mimeType: file.mimetype,
      size: file.size,
      fileHash: undefined, // Se calcularía en una implementación completa
      thumbnailUrl: undefined, // Se generaría automáticamente
      metadata: {
        uploadedAt: new Date(),
        clientSize: file.size,
      },
      isScanned: false,
      scanResult: undefined,
    };

    // 📎 Crear archivo adjunto usando el servicio
    const attachment = await this.communicationsService.addAttachment(
      messageId,
      createAttachmentDto,
      req.user.id,
    );

    // 📊 Transformar a DTO de respuesta
    return {
      id: attachment.id,
      type: attachment.type,
      originalName: attachment.originalName,
      size: attachment.size,
      formattedSize: attachment.getFormattedSize(),
      mimeType: attachment.mimeType,
      thumbnailUrl: attachment.thumbnailUrl,
      downloadCount: attachment.downloadCount,
      isImage: attachment.isImage(),
      isVideo: attachment.isVideo(),
      isSafe: attachment.isSafeToDownload(),
      isExpired: attachment.isExpired(),
      icon: attachment.getFileIcon(),
      createdAt: attachment.createdAt,
      metadata: attachment.metadata,
    };
  }

  // =============================================================================
  // 📊 ENDPOINTS DE ESTADÍSTICAS
  // =============================================================================

  /**
   * Obtiene estadísticas de una conversación
   * 
   * @param conversationId - ID de la conversación
   * @param req - Request con información del usuario
   * @returns Promise<StatsResponse> - Estadísticas de la conversación
   */
  @Get('conversations/:id/stats')
  @ApiOperation({
    summary: 'Estadísticas de conversación',
    description: 'Obtiene estadísticas detalladas de actividad de una conversación',
  })
  @ApiParam({
    name: 'id',
    description: 'ID único de la conversación',
    type: 'string',
    format: 'uuid',
  })
  @ApiOkResponse({
    description: 'Estadísticas obtenidas exitosamente',
    schema: {
      type: 'object',
      properties: {
        totalMessages: { type: 'number', example: 150 },
        totalParticipants: { type: 'number', example: 12 },
        lastActivity: { type: 'string', format: 'date-time' },
        messagesByType: {
          type: 'object',
          example: { text: 120, image: 20, file: 10 },
        },
        topActiveUsers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              messageCount: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Conversación no encontrada',
  })
  @ApiForbiddenResponse({
    description: 'No tienes permisos para ver las estadísticas de esta conversación',
  })
  async getConversationStats(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Request() req: AuthenticatedRequest,
  ): Promise<StatsResponse> {
    // 📊 Obtener estadísticas usando el servicio
    const stats = await this.communicationsService.getConversationStats(
      conversationId,
      req.user.id,
    );

    return stats;
  }

  // =============================================================================
  // 🔧 MÉTODOS AUXILIARES PRIVADOS
  // =============================================================================

  /**
   * Determina el tipo de adjunto basado en el MIME type
   * 
   * @param mimeType - Tipo MIME del archivo
   * @returns AttachmentType - Tipo de adjunto correspondiente
   */
  private getAttachmentTypeFromMime(mimeType: string): AttachmentType {
    if (mimeType.startsWith('image/')) {
      return AttachmentType.IMAGE;
    } else if (mimeType.startsWith('video/')) {
      return AttachmentType.VIDEO;
    } else if (mimeType.startsWith('audio/')) {
      return AttachmentType.AUDIO;
    } else if (mimeType.includes('pdf') || mimeType.includes('document')) {
      return AttachmentType.DOCUMENT;
    } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      return AttachmentType.SPREADSHEET;
    } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      return AttachmentType.PRESENTATION;
    } else if (mimeType.includes('zip') || mimeType.includes('rar')) {
      return AttachmentType.ARCHIVE;
    } else {
      return AttachmentType.DOCUMENT; // Default
    }
  }
}