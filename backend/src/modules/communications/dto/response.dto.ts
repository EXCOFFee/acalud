/**
 * 📝 DTOs DE RESPUESTA PARA COMUNICACIONES
 * 
 * Define las estructuras de respuesta para las APIs del sistema de comunicaciones.
 * Incluye metadatos, paginación y información contextual.
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Chat } from '../entities/chat.entity';
import { ChatMessage } from '../entities/message.entity';

/**
 * 📊 Metadatos de paginación
 */
export class PaginationMeta {
  @ApiProperty({ description: 'Página actual' })
  currentPage: number;

  @ApiProperty({ description: 'Elementos por página' })
  itemsPerPage: number;

  @ApiProperty({ description: 'Total de elementos' })
  totalItems: number;

  @ApiProperty({ description: 'Total de páginas' })
  totalPages: number;

  @ApiProperty({ description: 'Hay página siguiente' })
  hasNextPage: boolean;

  @ApiProperty({ description: 'Hay página anterior' })
  hasPrevPage: boolean;
}

/**
 * 📋 Respuesta paginada genérica
 */
export class PaginatedResponse<T> {
  @ApiProperty({ description: 'Datos de la respuesta' })
  data: T[];

  @ApiProperty({ description: 'Metadatos de paginación', type: PaginationMeta })
  meta: PaginationMeta;

  @ApiPropertyOptional({ description: 'Mensaje adicional' })
  message?: string;
}

/**
 * 💬 Respuesta de chat con información adicional
 */
export class ChatResponse {
  @ApiProperty({ description: 'Datos del chat' })
  chat: Chat;

  @ApiProperty({ description: 'Número de mensajes no leídos' })
  unreadCount: number;

  @ApiProperty({ description: 'Si el usuario es participante' })
  isParticipant: boolean;

  @ApiProperty({ description: 'Si el usuario puede escribir' })
  canWrite: boolean;

  @ApiProperty({ description: 'Si el usuario puede moderar' })
  canModerate: boolean;

  @ApiPropertyOptional({ description: 'Último mensaje leído por el usuario' })
  lastReadMessageId?: string;

  @ApiPropertyOptional({ description: 'Fecha de último acceso' })
  lastAccessedAt?: Date;
}

/**
 * 💌 Respuesta de mensaje con contexto
 */
export class MessageResponse {
  @ApiProperty({ description: 'Datos del mensaje' })
  message: ChatMessage;

  @ApiProperty({ description: 'Si el usuario puede editar el mensaje' })
  canEdit: boolean;

  @ApiProperty({ description: 'Si el usuario puede eliminar el mensaje' })
  canDelete: boolean;

  @ApiProperty({ description: 'Si el mensaje fue leído por el usuario' })
  isRead: boolean;

  @ApiPropertyOptional({ description: 'Información del mensaje padre' })
  parentMessage?: {
    id: string;
    content: string;
    senderName: string;
    type: string;
  };

  @ApiPropertyOptional({ description: 'Número de respuestas' })
  replyCount?: number;
}

/**
 * 📊 Estadísticas de chat
 */
export class ChatStatsResponse {
  @ApiProperty({ description: 'Total de chats' })
  totalChats: number;

  @ApiProperty({ description: 'Chats activos' })
  activeChats: number;

  @ApiProperty({ description: 'Total de mensajes hoy' })
  messagesToday: number;

  @ApiProperty({ description: 'Total de mensajes esta semana' })
  messagesThisWeek: number;

  @ApiProperty({ description: 'Usuario más activo' })
  mostActiveUser: {
    id: string;
    name: string;
    messageCount: number;
  };

  @ApiProperty({ description: 'Chat más activo' })
  mostActiveChat: {
    id: string;
    name: string;
    messageCount: number;
  };
}

/**
 * ✅ Respuesta de operación exitosa
 */
export class SuccessResponse {
  @ApiProperty({ description: 'Indica si la operación fue exitosa' })
  success: boolean;

  @ApiProperty({ description: 'Mensaje de confirmación' })
  message: string;

  @ApiPropertyOptional({ description: 'Datos adicionales' })
  data?: unknown;

  @ApiPropertyOptional({ description: 'Timestamp de la operación' })
  timestamp?: Date;
}