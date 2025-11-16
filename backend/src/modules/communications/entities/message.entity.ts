/**
 * 💌 ENTIDAD MESSAGE - MENSAJES DEL CHAT
 * 
 * Entidad que representa un mensaje individual dentro de un chat.
 * Soporta diferentes tipos de contenido y funcionalidades avanzadas.
 * 
 * TIPOS DE MENSAJE:
 * - TEXT: Mensaje de texto simple
 * - IMAGE: Imagen con descripción opcional
 * - FILE: Archivo adjunto
 * - AUDIO: Mensaje de voz
 * - SYSTEM: Mensaje del sistema (notificaciones automáticas)
 * - ANNOUNCEMENT: Anuncio oficial
 * 
 * FUNCIONALIDADES:
 * - Reacciones con emojis
 * - Respuestas a mensajes (threads)
 * - Menciones a usuarios
 * - Estados de lectura
 * - Edición y eliminación
 * - Moderación automática
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Chat } from './chat.entity';
import { MessageType, MessageStatus } from '../message.enums';

export { MessageType, MessageStatus };

/**
 * 📎 Información de archivo adjunto
 */
export interface AttachmentInfo {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number; // En bytes
  url: string;
  thumbnailUrl?: string; // Para imágenes/videos
  duration?: number; // Para audio/video en segundos
  dimensions?: {
    width: number;
    height: number;
  };
}

/**
 * 😀 Reacción a mensaje
 */
export interface MessageReaction {
  emoji: string;
  userId: string;
  userName: string;
  createdAt: Date;
}

/**
 * 👤 Mención en mensaje
 */
export interface MessageMention {
  userId: string;
  userName: string;
  startIndex: number;
  endIndex: number;
}

/**
 * 📊 Estadísticas del mensaje
 */
export interface MessageStats {
  reactions: { [emoji: string]: number };
  totalReactions: number;
  replies: number;
  views: number;
}

/**
 * 💌 Entidad Message
 * 
 * Representa un mensaje individual dentro de un chat.
 * Incluye contenido, metadatos y funcionalidades sociales.
 */
@Entity('chat_messages')
@Index(['chatId', 'createdAt'])
@Index(['senderId', 'createdAt'])
@Index(['type', 'status'])
@Index(['parentMessageId'])
export class ChatMessage {
  /**
   * 🔑 Identificador único del mensaje
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 💬 Chat al que pertenece el mensaje
   */
  @Column({ type: 'uuid' })
  @Index()
  chatId: string;

  /**
   * 👤 ID del usuario que envió el mensaje
   */
  @Column({ type: 'uuid' })
  @Index()
  senderId: string;

  /**
   * 👤 Nombre del remitente (desnormalizado para performance)
   */
  @Column({ type: 'varchar', length: 100 })
  senderName: string;

  /**
   * 🎨 Avatar del remitente (desnormalizado)
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  senderAvatar: string;

  /**
   * 🎭 Rol del remitente en el momento del envío
   */
  @Column({ type: 'varchar', length: 50, default: 'student' })
  senderRole: string;

  /**
   * 🏷️ Tipo de mensaje
   */
  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  /**
   * 📊 Estado del mensaje
   */
  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  /**
   * 📝 Contenido del mensaje
   */
  @Column({ type: 'text' })
  content: string;

  /**
   * 📝 Contenido sin formato (para búsquedas)
   */
  @Column({ type: 'text', nullable: true })
  @Index()
  plainContent: string;

  /**
   * 📎 Información de archivos adjuntos
   */
  @Column({
    type: 'jsonb',
    nullable: true,
  })
  attachments: AttachmentInfo[];

  /**
   * 😀 Reacciones al mensaje
   */
  @Column({
    type: 'jsonb',
    default: [],
  })
  reactions: MessageReaction[];

  /**
   * 👤 Menciones en el mensaje
   */
  @Column({
    type: 'jsonb',
    default: [],
  })
  mentions: MessageMention[];

  /**
   * 📊 Estadísticas del mensaje
   */
  @Column({
    type: 'jsonb',
    default: {
      reactions: {},
      totalReactions: 0,
      replies: 0,
      views: 0,
    },
  })
  stats: MessageStats;

  /**
   * 💬 ID del mensaje padre (para respuestas/threads)
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  parentMessageId: string;

  /**
   * 🕒 Mensaje programado (fecha de envío futuro)
   */
  @Column({ type: 'timestamp', nullable: true })
  scheduledFor: Date;

  /**
   * ✏️ Mensaje editado
   */
  @Column({ type: 'boolean', default: false })
  isEdited: boolean;

  /**
   * ⏰ Fecha de última edición
   */
  @Column({ type: 'timestamp', nullable: true })
  editedAt: Date;

  /**
   * 🗑️ Mensaje eliminado (soft delete)
   */
  @Column({ type: 'boolean', default: false })
  isDeleted: boolean;

  /**
   * ⏰ Fecha de eliminación
   */
  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date;

  /**
   * 📌 Mensaje fijado
   */
  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  /**
   * 🤖 Mensaje generado por sistema/bot
   */
  @Column({ type: 'boolean', default: false })
  isSystemMessage: boolean;

  /**
   * 🔴 Mensaje importante (destacado)
   */
  @Column({ type: 'boolean', default: false })
  isImportant: boolean;

  /**
   * 📍 Información de geolocalización (opcional)
   */
  @Column({
    type: 'jsonb',
    nullable: true,
  })
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };

  /**
   * 🏷️ Etiquetas del mensaje (para organización)
   */
  @Column({
    type: 'jsonb',
    default: [],
  })
  tags: string[];

  /**
   * ⏰ Fecha de creación
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * 🔄 Fecha de última actualización
   */
  @UpdateDateColumn()
  updatedAt: Date;

  // =============================================================================
  // RELACIONES
  // =============================================================================

  /**
   * 💬 Chat al que pertenece
   */
  @ManyToOne(() => Chat, chat => chat.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'chatId' })
  chat: Chat;

  /**
   * 💬 Mensaje padre (para threads)
   */
  @ManyToOne(() => ChatMessage, message => message.replies, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentMessageId' })
  parentMessage: ChatMessage;

  /**
   * 💬 Respuestas a este mensaje
   */
  @OneToMany(() => ChatMessage, message => message.parentMessage, {
    cascade: true,
  })
  replies: ChatMessage[];

  // =============================================================================
  // MÉTODOS DE NEGOCIO
  // =============================================================================

  /**
   * 👤 Verifica si un usuario es el autor del mensaje
   */
  isAuthor(userId: string): boolean {
    return this.senderId === userId;
  }

  /**
   * ✏️ Verifica si el mensaje puede ser editado
   */
  canEdit(userId: string, timeLimit: number = 15): boolean {
    // Solo el autor puede editar
    if (!this.isAuthor(userId)) {
      return false;
    }

    // No se puede editar si está eliminado
    if (this.isDeleted) {
      return false;
    }

    // Mensajes del sistema no se pueden editar
    if (this.isSystemMessage) {
      return false;
    }

    // Verificar límite de tiempo (15 minutos por defecto)
    const now = new Date();
    const timeDiff = (now.getTime() - this.createdAt.getTime()) / (1000 * 60); // minutos
    
    return timeDiff <= timeLimit;
  }

  /**
   * 🗑️ Verifica si el mensaje puede ser eliminado
   */
  canDelete(userId: string, userRole: string): boolean {
    // El autor siempre puede eliminar su mensaje
    if (this.isAuthor(userId)) {
      return true;
    }

    // Admins y moderadores pueden eliminar cualquier mensaje
    if (userRole === 'admin' || userRole === 'teacher') {
      return true;
    }

    return false;
  }

  /**
   * 😀 Agregar reacción al mensaje
   */
  addReaction(emoji: string, userId: string, userName: string): void {
    // Verificar si el usuario ya reaccionó con este emoji
    const existingReaction = this.reactions.find(
      r => r.emoji === emoji && r.userId === userId
    );

    if (existingReaction) {
      return; // Ya existe la reacción
    }

    // Agregar nueva reacción
    const newReaction: MessageReaction = {
      emoji,
      userId,
      userName,
      createdAt: new Date(),
    };

    this.reactions.push(newReaction);

    // Actualizar estadísticas
    if (!this.stats.reactions[emoji]) {
      this.stats.reactions[emoji] = 0;
    }
    this.stats.reactions[emoji]++;
    this.stats.totalReactions++;
  }

  /**
   * 😀 Remover reacción del mensaje
   */
  removeReaction(emoji: string, userId: string): void {
    const reactionIndex = this.reactions.findIndex(
      r => r.emoji === emoji && r.userId === userId
    );

    if (reactionIndex === -1) {
      return; // No existe la reacción
    }

    // Remover reacción
    this.reactions.splice(reactionIndex, 1);

    // Actualizar estadísticas
    if (this.stats.reactions[emoji]) {
      this.stats.reactions[emoji]--;
      this.stats.totalReactions--;

      // Remover emoji si no hay más reacciones
      if (this.stats.reactions[emoji] === 0) {
        delete this.stats.reactions[emoji];
      }
    }
  }

  /**
   * 👤 Obtener usuarios mencionados
   */
  getMentionedUserIds(): string[] {
    return this.mentions.map(mention => mention.userId);
  }

  /**
   * 📎 Verificar si tiene archivos adjuntos
   */
  hasAttachments(): boolean {
    return this.attachments && this.attachments.length > 0;
  }

  /**
   * 🎨 Obtener color del mensaje según tipo
   */
  getDisplayColor(): string {
    switch (this.type) {
      case MessageType.TEXT:
        return '#374151'; // Gris oscuro
      case MessageType.IMAGE:
        return '#10B981'; // Verde
      case MessageType.FILE:
        return '#3B82F6'; // Azul
      case MessageType.AUDIO:
        return '#8B5CF6'; // Púrpura
      case MessageType.SYSTEM:
        return '#6B7280'; // Gris
      case MessageType.ANNOUNCEMENT:
        return '#F59E0B'; // Ámbar
      default:
        return '#374151';
    }
  }

  /**
   * 🏷️ Obtener emoji representativo
   */
  getDisplayEmoji(): string {
    switch (this.type) {
      case MessageType.TEXT:
        return '💬';
      case MessageType.IMAGE:
        return '🖼️';
      case MessageType.FILE:
        return '📎';
      case MessageType.AUDIO:
        return '🎵';
      case MessageType.SYSTEM:
        return '🤖';
      case MessageType.ANNOUNCEMENT:
        return '📢';
      default:
        return '💭';
    }
  }

  /**
   * ✨ Serialización para API
   */
  toJSON() {
    return {
      id: this.id,
      chatId: this.chatId,
      senderId: this.senderId,
      senderName: this.senderName,
      senderAvatar: this.senderAvatar,
      senderRole: this.senderRole,
      type: this.type,
      status: this.status,
      content: this.isDeleted ? '[Mensaje eliminado]' : this.content,
      attachments: this.isDeleted ? [] : this.attachments,
      reactions: this.reactions,
      mentions: this.mentions,
      stats: this.stats,
      parentMessageId: this.parentMessageId,
      scheduledFor: this.scheduledFor,
      isEdited: this.isEdited,
      editedAt: this.editedAt,
      isDeleted: this.isDeleted,
      isPinned: this.isPinned,
      isSystemMessage: this.isSystemMessage,
      isImportant: this.isImportant,
      location: this.location,
      tags: this.tags,
      displayColor: this.getDisplayColor(),
      displayEmoji: this.getDisplayEmoji(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}