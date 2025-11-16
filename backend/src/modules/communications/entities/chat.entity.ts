/**
 * 💬 ENTIDAD CHAT - SISTEMA DE COMUNICACIONES
 * 
 * Entidad que representa una conversación entre usuarios en el sistema educativo.
 * Soporta chats individuales, grupales y de aula.
 * 
 * TIPOS DE CHAT:
 * - INDIVIDUAL: Conversación 1:1 entre profesor-estudiante
 * - GROUP: Chat grupal entre múltiples usuarios
 * - CLASSROOM: Canal de comunicación oficial del aula
 * - ANNOUNCEMENT: Canal solo para anuncios (solo profesores pueden escribir)
 * 
 * FUNCIONALIDADES:
 * - Mensajes en tiempo real
 * - Historial persistente
 * - Estados de lectura
 * - Archivos adjuntos
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
  OneToMany,
  Index,
} from 'typeorm';
import { ChatMessage } from './message.entity';
// import { User } from '../../users/entities/user.entity'; // Descomentar cuando User esté disponible

/**
 * 📋 Enumeraciones para tipado fuerte
 */
export enum ChatType {
  INDIVIDUAL = 'individual',     // Chat 1:1
  GROUP = 'group',              // Chat grupal
  CLASSROOM = 'classroom',      // Chat oficial del aula
  ANNOUNCEMENT = 'announcement', // Canal de anuncios
}

export enum ChatStatus {
  ACTIVE = 'active',       // Chat activo
  ARCHIVED = 'archived',   // Chat archivado
  BLOCKED = 'blocked',     // Chat bloqueado por moderación
  DELETED = 'deleted',     // Chat eliminado (soft delete)
}

/**
 * 📊 Configuración de chat
 */
export interface ChatSettings {
  allowFileUploads: boolean;
  maxFileSize: number; // En MB
  allowedFileTypes: string[];
  moderationEnabled: boolean;
  autoDeleteMessages: boolean;
  autoDeleteDays: number;
  allowMentions: boolean;
  allowEmojis: boolean;
}

/**
 * 📈 Estadísticas del chat
 */
export interface ChatStats {
  totalMessages: number;
  totalParticipants: number;
  lastActivityDate: Date;
  averageResponseTime: number; // En minutos
  mostActiveUser: string;
  messagesPerDay: number;
}

/**
 * 💬 Entidad Chat
 * 
 * Representa una conversación entre usuarios del sistema.
 * Incluye configuración, moderación y estadísticas.
 */
@Entity('chats')
@Index(['type', 'status'])
@Index(['classroomId', 'type'])
@Index(['createdAt'])
export class Chat {
  /**
   * 🔑 Identificador único del chat
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 📝 Nombre del chat (opcional para chats individuales)
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string;

  /**
   * 📄 Descripción del chat
   */
  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * 🏷️ Tipo de chat
   */
  @Column({
    type: 'enum',
    enum: ChatType,
    default: ChatType.INDIVIDUAL,
  })
  type: ChatType;

  /**
   * 📊 Estado del chat
   */
  @Column({
    type: 'enum',
    enum: ChatStatus,
    default: ChatStatus.ACTIVE,
  })
  status: ChatStatus;

  /**
   * 🏫 ID del aula asociada (para chats de aula)
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  classroomId: string;

  /**
   * 👤 ID del creador del chat
   */
  @Column({ type: 'uuid' })
  @Index()
  createdBy: string;

  /**
   * 🎨 Avatar del chat (URL de imagen)
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar: string;

  /**
   * ⚙️ Configuración del chat
   */
  @Column({
    type: 'jsonb',
    default: {
      allowFileUploads: true,
      maxFileSize: 10,
      allowedFileTypes: ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'],
      moderationEnabled: true,
      autoDeleteMessages: false,
      autoDeleteDays: 90,
      allowMentions: true,
      allowEmojis: true,
    },
  })
  settings: ChatSettings;

  /**
   * 📈 Estadísticas del chat
   */
  @Column({
    type: 'jsonb',
    default: {
      totalMessages: 0,
      totalParticipants: 0,
      lastActivityDate: null,
      averageResponseTime: 0,
      mostActiveUser: null,
      messagesPerDay: 0,
    },
  })
  stats: ChatStats;

  /**
   * 🔄 Última actividad registrada
   */
  @Column({ type: 'timestamp', nullable: true })
  @Index()
  lastActivity: Date;

  /**
   * 💬 Último mensaje enviado (desnormalizado para performance)
   */
  @Column({ type: 'text', nullable: true })
  lastMessage: string;

  /**
   * 👤 ID del último usuario que envió mensaje
   */
  @Column({ type: 'uuid', nullable: true })
  lastMessageBy: string;

  /**
   * ⏰ Fecha del último mensaje
   */
  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date;

  /**
   * 🔢 Número total de mensajes
   */
  @Column({ type: 'integer', default: 0 })
  messageCount: number;

  /**
   * 🔢 Número total de participantes activos
   */
  @Column({ type: 'integer', default: 0 })
  participantCount: number;

  /**
   * 📌 Chat fijado (para destacar chats importantes)
   */
  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  /**
   * 🔇 Chat silenciado por defecto para nuevos participantes
   */
  @Column({ type: 'boolean', default: false })
  isMuted: boolean;

  /**
   * 🔒 Chat privado (solo por invitación)
   */
  @Column({ type: 'boolean', default: false })
  isPrivate: boolean;

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
   * 💬 Mensajes del chat
   */
  @OneToMany(() => ChatMessage, message => message.chat, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  messages: ChatMessage[];

  /**
   * 👥 Participantes del chat
   */
  // @ManyToMany(() => User, user => user.chats, {
  //   cascade: ['insert', 'update'],
  // })
  // @JoinTable({
  //   name: 'chat_participants',
  //   joinColumn: { name: 'chatId', referencedColumnName: 'id' },
  //   inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' },
  // })
  // participants: User[];

  // Array temporal de IDs de participantes hasta que User esté disponible
  @Column({ type: 'json', nullable: true })
  participantIds?: string[];

  // =============================================================================
  // MÉTODOS DE NEGOCIO
  // =============================================================================

  /**
   * 👤 Verifica si un usuario es participante del chat
   */
  isParticipant(userId: string): boolean {
    return this.participantIds?.includes(userId) || false;
  }

  /**
   * 👑 Verifica si un usuario es el creador del chat
   */
  isCreator(userId: string): boolean {
    return this.createdBy === userId;
  }

  /**
   * 📝 Verifica si un usuario puede escribir mensajes
   */
  canWrite(userId: string, userRole: string): boolean {
    // Chats de anuncios: solo profesores pueden escribir
    if (this.type === ChatType.ANNOUNCEMENT) {
      return userRole === 'teacher' || userRole === 'admin';
    }

    // Chat bloqueado: nadie puede escribir
    if (this.status === ChatStatus.BLOCKED) {
      return false;
    }

    // Debe ser participante del chat
    return this.isParticipant(userId);
  }

  /**
   * 📖 Verifica si un usuario puede leer mensajes
   */
  canRead(userId: string): boolean {
    // Chat eliminado: nadie puede leer
    if (this.status === ChatStatus.DELETED) {
      return false;
    }

    // Debe ser participante del chat
    return this.isParticipant(userId);
  }

  /**
   * ⚙️ Verifica si un usuario puede moderar el chat
   */
  canModerate(userId: string, userRole: string): boolean {
    // Admins y creadores siempre pueden moderar
    if (userRole === 'admin' || this.isCreator(userId)) {
      return true;
    }

    // En chats de aula, los profesores pueden moderar
    if (this.type === ChatType.CLASSROOM && userRole === 'teacher') {
      return true;
    }

    return false;
  }

  /**
   * 📊 Actualizar estadísticas del chat
   */
  updateStats(newMessage?: ChatMessage): void {
    const now = new Date();
    
    if (newMessage) {
      this.stats.totalMessages += 1;
      this.lastActivity = now;
      this.lastMessage = newMessage.content.substring(0, 100); // Primeros 100 caracteres
      this.lastMessageBy = newMessage.senderId;
      this.lastMessageAt = newMessage.createdAt;
      this.messageCount += 1;
    }

    // Calcular mensajes por día (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);
    
    if (this.createdAt >= thirtyDaysAgo) {
      const daysSinceCreation = Math.max(1, Math.ceil((now.getTime() - this.createdAt.getTime()) / (1000 * 60 * 60 * 24)));
      this.stats.messagesPerDay = Math.round(this.stats.totalMessages / daysSinceCreation);
    }

    this.stats.lastActivityDate = now;
    this.participantCount = this.participantIds?.length || 0;
    this.stats.totalParticipants = this.participantCount;
  }

  /**
   * 🎨 Obtener color representativo del chat
   */
  getDisplayColor(): string {
    switch (this.type) {
      case ChatType.INDIVIDUAL:
        return '#3B82F6'; // Azul
      case ChatType.GROUP:
        return '#10B981'; // Verde
      case ChatType.CLASSROOM:
        return '#8B5CF6'; // Púrpura
      case ChatType.ANNOUNCEMENT:
        return '#F59E0B'; // Ámbar
      default:
        return '#6B7280'; // Gris
    }
  }

  /**
   * 📝 Obtener nombre para mostrar
   */
  getDisplayName(): string {
    if (this.name) {
      return this.name;
    }

    switch (this.type) {
      case ChatType.INDIVIDUAL:
        return 'Chat Privado';
      case ChatType.GROUP:
        return 'Chat Grupal';
      case ChatType.CLASSROOM:
        return 'Chat de Aula';
      case ChatType.ANNOUNCEMENT:
        return 'Anuncios';
      default:
        return 'Chat';
    }
  }

  /**
   * 🏷️ Obtener emoji representativo
   */
  getDisplayEmoji(): string {
    switch (this.type) {
      case ChatType.INDIVIDUAL:
        return '💬';
      case ChatType.GROUP:
        return '👥';
      case ChatType.CLASSROOM:
        return '🏫';
      case ChatType.ANNOUNCEMENT:
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
      name: this.getDisplayName(),
      description: this.description,
      type: this.type,
      status: this.status,
      classroomId: this.classroomId,
      createdBy: this.createdBy,
      avatar: this.avatar,
      settings: this.settings,
      stats: this.stats,
      lastActivity: this.lastActivity,
      lastMessage: this.lastMessage,
      lastMessageBy: this.lastMessageBy,
      lastMessageAt: this.lastMessageAt,
      messageCount: this.messageCount,
      participantCount: this.participantCount,
      isPinned: this.isPinned,
      isMuted: this.isMuted,
      isPrivate: this.isPrivate,
      displayColor: this.getDisplayColor(),
      displayEmoji: this.getDisplayEmoji(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}