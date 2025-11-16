/**
 * 💬 ENTIDAD DE CONVERSACIONES - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Entidad que representa las conversaciones del sistema:
 * - Chats directos entre usuarios
 * - Conversaciones grupales de aulas
 * - Foros de discusión temáticos
 * - Canales de anuncios
 * 
 * PRINCIPIOS SOLID APLICADOS:
 * - SRP: Responsabilidad única de modelar conversaciones
 * - OCP: Extensible para nuevos tipos de conversaciones
 * - LSP: Implementa contratos bien definidos
 * - ISP: Interfaces específicas por funcionalidad
 * - DIP: Usa abstracciones, no implementaciones concretas
 * 
 * BUENAS PRÁCTICAS:
 * - Índices optimizados para consultas frecuentes
 * - Soft delete para conservar historial
 * - Auditoría completa de cambios
 * - Validaciones a nivel de base de datos
 * - Nombres descriptivos y documentación completa
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinTable,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
  Check,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Classroom } from '../classrooms/classroom.entity';
import { Message } from './message.entity';

/**
 * Enum que define los tipos de conversación disponibles
 * Cada tipo tiene comportamientos y reglas específicas
 */
export enum ConversationType {
  // 👥 Conversación directa entre dos usuarios
  DIRECT = 'direct',
  
  // 🎓 Chat grupal de aula (todos los miembros del aula)
  CLASSROOM_CHAT = 'classroom_chat',
  
  // 📋 Foro de discusión temático dentro de un aula
  FORUM_THREAD = 'forum_thread',
  
  // 📢 Canal de anuncios (solo profesores pueden escribir)
  ANNOUNCEMENT_CHANNEL = 'announcement_channel',
  
  // 👥 Grupo privado creado por usuarios
  PRIVATE_GROUP = 'private_group',
  
  // 🔧 Soporte técnico (usuario-admin)
  SUPPORT_TICKET = 'support_ticket',
}

/**
 * Enum que define el estado de la conversación
 * Permite gestionar el ciclo de vida y moderación
 */
export enum ConversationStatus {
  // ✅ Conversación activa y disponible
  ACTIVE = 'active',
  
  // 📚 Conversación archivada (no se muestran en listas principales)
  ARCHIVED = 'archived',
  
  // 🔒 Conversación bloqueada (no se pueden enviar mensajes)
  LOCKED = 'locked',
  
  // 🚫 Conversación eliminada (soft delete)
  DELETED = 'deleted',
  
  // ⏸️ Conversación pausada temporalmente
  PAUSED = 'paused',
}

/**
 * Enum que define los permisos dentro de la conversación
 * Aplicado por rol y configuración específica
 */
export enum ConversationPermission {
  // 👀 Solo puede leer mensajes
  READ_ONLY = 'read_only',
  
  // ✍️ Puede leer y escribir mensajes
  READ_WRITE = 'read_write',
  
  // 🛠️ Puede moderar (eliminar mensajes, silenciar usuarios)
  MODERATE = 'moderate',
  
  // 👑 Control total (cambiar configuraciones, agregar/quitar miembros)
  ADMIN = 'admin',
}

/**
 * Entidad principal que representa una conversación
 * 
 * @description Esta entidad almacena información de conversaciones
 * incluyendo metadatos, participantes y configuración específica.
 * 
 * @example
 * ```typescript
 * // Crear chat directo
 * const conversation = new Conversation();
 * conversation.type = ConversationType.DIRECT;
 * conversation.title = null; // Los chats directos no tienen título
 * conversation.creator = teacher;
 * conversation.participants = [teacher, student];
 * 
 * // Crear foro de aula
 * const forum = new Conversation();
 * forum.type = ConversationType.FORUM_THREAD;
 * forum.title = 'Dudas sobre Matemáticas';
 * forum.description = 'Espacio para resolver dudas del tema';
 * forum.classroom = mathClassroom;
 * ```
 */
@Entity('conversations')
@Index(['type', 'status', 'createdAt']) // Índice para filtros frecuentes
@Index(['classroomId', 'type']) // Índice para conversaciones de aula
@Index(['creatorId', 'createdAt']) // Índice para conversaciones por creador
@Index(['lastActivityAt']) // Índice para ordenar por actividad reciente
@Check(`"type" IN ('direct', 'classroom_chat', 'forum_thread', 'announcement_channel', 'private_group', 'support_ticket')`)
@Check(`"status" IN ('active', 'archived', 'locked', 'deleted', 'paused')`)
export class Conversation {
  /**
   * Identificador único de la conversación
   * Usando UUID para mejor distribución y seguridad
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tipo específico de conversación
   * Determina el comportamiento y reglas aplicables
   */
  @Column({
    type: 'enum',
    enum: ConversationType,
    comment: 'Tipo de conversación que determina comportamiento y permisos',
  })
  type: ConversationType;

  /**
   * Título de la conversación (opcional para chats directos)
   * Máximo 200 caracteres para mantener UI limpia
   */
  @Column({
    type: 'varchar',
    length: 200,
    nullable: true,
    comment: 'Título de la conversación, null para chats directos',
  })
  title?: string;

  /**
   * Descripción detallada de la conversación (opcional)
   * Útil para foros y canales de anuncios
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: 'Descripción detallada del propósito de la conversación',
  })
  description?: string;

  /**
   * Usuario que creó la conversación
   * Mantiene referencia para permisos y auditoría
   */
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  /**
   * ID del usuario creador (para consultas optimizadas)
   * Desnormalización intencional para mejorar rendimiento
   */
  @Column({ name: 'creator_id' })
  creatorId: string;

  /**
   * Aula asociada (para conversaciones de aula)
   * Null para chats directos y grupos privados
   */
  @ManyToOne(() => Classroom, { eager: false, nullable: true })
  @JoinColumn({ name: 'classroom_id' })
  classroom?: Classroom;

  /**
   * ID del aula asociada (para consultas optimizadas)
   * Permite filtrar rápidamente conversaciones por aula
   */
  @Column({ name: 'classroom_id', nullable: true })
  classroomId?: string;

  /**
   * Lista de participantes de la conversación
   * Relación many-to-many para flexibilidad
   */
  @ManyToMany(() => User, { eager: false })
  @JoinTable({
    name: 'conversation_participants',
    joinColumn: { name: 'conversation_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  participants: User[];

  /**
   * Mensajes de la conversación
   * Relación uno-a-muchos ordenada por fecha
   */
  @OneToMany(() => Message, message => message.conversation, {
    cascade: true,
    eager: false,
  })
  messages: Message[];

  /**
   * Estado actual de la conversación
   * Controla visibilidad y funcionalidad disponible
   */
  @Column({
    type: 'enum',
    enum: ConversationStatus,
    default: ConversationStatus.ACTIVE,
    comment: 'Estado actual que controla la funcionalidad disponible',
  })
  status: ConversationStatus;

  /**
   * Configuración específica de la conversación en formato JSON
   * Permite extensibilidad sin cambios de esquema
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Configuración específica como permisos, notificaciones, etc.',
  })
  settings?: {
    // 🔕 Configuración de notificaciones
    notifications?: {
      enabled: boolean;
      mentionsOnly: boolean;
      muteUntil?: Date;
    };
    
    // 🛡️ Configuración de moderación
    moderation?: {
      requireApproval: boolean;
      allowFileSharing: boolean;
      maxMessageLength: number;
      bannedWords: string[];
    };
    
    // 👥 Configuración de participantes
    participation?: {
      maxParticipants: number;
      allowInvites: boolean;
      requirePermissionToJoin: boolean;
    };
    
    // 📎 Configuración de archivos
    files?: {
      allowUploads: boolean;
      maxFileSize: number;
      allowedTypes: string[];
    };
    
    // 🔒 Configuración de privacidad
    privacy?: {
      isPublic: boolean;
      allowSearch: boolean;
      archiveAfterDays?: number;
    };
    
    // Configuraciones adicionales extensibles
    [key: string]: unknown;
  };

  /**
   * Número total de mensajes en la conversación
   * Campo calculado para evitar COUNT() costosos
   */
  @Column({
    type: 'int',
    default: 0,
    comment: 'Contador de mensajes para evitar consultas COUNT costosas',
  })
  messageCount: number;

  /**
   * Número de participantes activos
   * Campo calculado para optimizar consultas
   */
  @Column({
    type: 'int',
    default: 0,
    comment: 'Contador de participantes activos',
  })
  participantCount: number;

  /**
   * Fecha y hora del último mensaje
   * Usado para ordenar conversaciones por actividad reciente
   */
  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp del último mensaje para ordenamiento por actividad',
  })
  lastActivityAt?: Date;

  /**
   * ID del último mensaje para referencia rápida
   * Evita subconsultas para obtener el mensaje más reciente
   */
  @Column({
    type: 'uuid',
    nullable: true,
    comment: 'ID del último mensaje para acceso rápido',
  })
  lastMessageId?: string;

  /**
   * Usuario que envió el último mensaje
   * Información rápida para previews sin JOIN
   */
  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'last_message_author_id' })
  lastMessageAuthor?: User;

  /**
   * ID del autor del último mensaje
   * Desnormalización para mejor rendimiento en listas
   */
  @Column({ name: 'last_message_author_id', nullable: true })
  lastMessageAuthorId?: string;

  /**
   * Indicador de conversación fijada (pin)
   * Las conversaciones fijadas aparecen primero en listas
   */
  @Column({
    type: 'boolean',
    default: false,
    comment: 'Conversación fijada que aparece al inicio de las listas',
  })
  isPinned: boolean;

  /**
   * Fecha hasta la cual está fijada (opcional)
   * Permite fijado temporal automático
   */
  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Fecha límite para el fijado temporal',
  })
  pinnedUntil?: Date;

  /**
   * Usuario que fijó la conversación
   * Para auditoría y permisos
   */
  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'pinned_by_id' })
  pinnedBy?: User;

  /**
   * Tags/etiquetas para clasificación
   * Array de strings para categorización flexible
   */
  @Column({
    type: 'simple-array',
    nullable: true,
    comment: 'Etiquetas para categorización y filtrado',
  })
  tags?: string[];

  /**
   * Nivel de prioridad de la conversación
   * Usado para ordenamiento y notificaciones
   */
  @Column({
    type: 'int',
    default: 0,
    comment: 'Nivel de prioridad (0=normal, 1=alta, 2=crítica)',
  })
  priority: number;

  /**
   * Fecha de creación (automática)
   * Timestamp de cuando se creó la conversación
   */
  @CreateDateColumn({ 
    name: 'created_at',
    comment: 'Timestamp de creación de la conversación',
  })
  createdAt: Date;

  /**
   * Fecha de última actualización (automática)
   * Se actualiza en cualquier cambio de la entidad
   */
  @UpdateDateColumn({ 
    name: 'updated_at',
    comment: 'Timestamp de última modificación',
  })
  updatedAt: Date;

  /**
   * Fecha de eliminación (soft delete)
   * Permite recuperación y mantiene integridad referencial
   */
  @DeleteDateColumn({ 
    name: 'deleted_at',
    comment: 'Timestamp de soft delete para conservar historial',
  })
  deletedAt?: Date;

  // =============================================================================
  // 🔧 MÉTODOS DE UTILIDAD SIGUIENDO PRINCIPIOS OOP
  // =============================================================================

  /**
   * Verifica si la conversación está activa
   * Método que encapsula la lógica de estado
   * 
   * @returns {boolean} true si la conversación está activa
   */
  isActive(): boolean {
    return this.status === ConversationStatus.ACTIVE && !this.deletedAt;
  }

  /**
   * Verifica si un usuario puede escribir mensajes
   * Implementa lógica de negocio centralizada
   * 
   * @param {User} user - Usuario a verificar
   * @returns {boolean} true si puede escribir
   */
  canUserWrite(user: User): boolean {
    // Si la conversación está bloqueada, solo admins pueden escribir
    if (this.status === ConversationStatus.LOCKED) {
      return this.isUserAdmin(user);
    }
    
    // Si es canal de anuncios, solo el creador y moderadores pueden escribir
    if (this.type === ConversationType.ANNOUNCEMENT_CHANNEL) {
      return this.creatorId === user.id || this.isUserModerator(user);
    }
    
    // Para otros tipos, cualquier participante puede escribir
    return this.isUserParticipant(user);
  }

  /**
   * Verifica si un usuario es participante de la conversación
   * Encapsula la lógica de membresía
   * 
   * @param {User} user - Usuario a verificar
   * @returns {boolean} true si es participante
   */
  isUserParticipant(user: User): boolean {
    return this.participants?.some(p => p.id === user.id) || false;
  }

  /**
   * Verifica si un usuario es moderador de la conversación
   * Lógica de permisos centralizada
   * 
   * @param {User} user - Usuario a verificar
   * @returns {boolean} true si es moderador
   */
  isUserModerator(user: User): boolean {
    // El creador siempre es moderador
    if (this.creatorId === user.id) {
      return true;
    }
    
    // En conversaciones de aula, los profesores son moderadores
    if (this.classroom && user.role === 'teacher') {
      return true;
    }
    
    // Los admins del sistema siempre son moderadores
    return user.role === 'admin';
  }

  /**
   * Verifica si un usuario es administrador de la conversación
   * Máximo nivel de permisos
   * 
   * @param {User} user - Usuario a verificar
   * @returns {boolean} true si es administrador
   */
  isUserAdmin(user: User): boolean {
    // El creador es admin de su conversación
    if (this.creatorId === user.id) {
      return true;
    }
    
    // Los admins del sistema tienen control total
    return user.role === 'admin';
  }

  /**
   * Actualiza la actividad de la conversación
   * Mantiene campos calculados actualizados
   * 
   * @param {string} lastMessageId - ID del último mensaje
   * @param {User} author - Autor del último mensaje
   */
  updateLastActivity(lastMessageId: string, author: User): void {
    this.lastActivityAt = new Date();
    this.lastMessageId = lastMessageId;
    this.lastMessageAuthor = author;
    this.lastMessageAuthorId = author.id;
    this.messageCount += 1;
  }

  /**
   * Obtiene un resumen de la conversación para listas
   * Método que proporciona datos optimizados para UI
   * 
   * @returns {object} Resumen con datos esenciales
   */
  getSummary() {
    return {
      id: this.id,
      type: this.type,
      title: this.title || this.getDisplayTitle(),
      description: this.description,
      messageCount: this.messageCount,
      participantCount: this.participantCount,
      lastActivityAt: this.lastActivityAt,
      status: this.status,
      isPinned: this.isPinned,
      tags: this.tags,
      priority: this.priority,
      classroom: this.classroom ? {
        id: this.classroom.id,
        name: this.classroom.name,
      } : null,
      creator: {
        id: this.creator?.id,
        name: this.creator?.name,
      },
      lastMessage: this.lastMessageAuthor ? {
        authorId: this.lastMessageAuthorId,
        authorName: this.lastMessageAuthor.name,
        timestamp: this.lastActivityAt,
      } : null,
    };
  }

  /**
   * Genera un título para mostrar en la UI
   * Lógica centralizada para títulos dinámicos
   * 
   * @returns {string} Título apropiado según el tipo
   */
  private getDisplayTitle(): string {
    switch (this.type) {
      case ConversationType.DIRECT: {
        // Para chats directos, mostrar nombres de participantes
        const otherParticipants = this.participants?.filter(p => p.id !== this.creatorId) || [];
        return otherParticipants.map(p => p.name).join(', ') || 'Chat Directo';
      }
        
      case ConversationType.CLASSROOM_CHAT:
        return `Chat de ${this.classroom?.name || 'Aula'}`;
        
      case ConversationType.ANNOUNCEMENT_CHANNEL:
        return `Anuncios - ${this.classroom?.name || 'General'}`;
        
      case ConversationType.SUPPORT_TICKET:
        return 'Soporte Técnico';
        
      default:
        return this.title || 'Conversación';
    }
  }

  /**
   * Valida la configuración de la conversación
   * Método para asegurar consistencia de datos
   * 
   * @throws {Error} Si la configuración es inválida
   */
  validateConfiguration(): void {
    // Validar que chats directos tengan exactamente 2 participantes
    if (this.type === ConversationType.DIRECT && this.participantCount !== 2) {
      throw new Error('Los chats directos deben tener exactamente 2 participantes');
    }
    
    // Validar que conversaciones de aula tengan aula asociada
    if ([ConversationType.CLASSROOM_CHAT, ConversationType.FORUM_THREAD, ConversationType.ANNOUNCEMENT_CHANNEL]
        .includes(this.type) && !this.classroomId) {
      throw new Error('Las conversaciones de aula requieren un aula asociada');
    }
    
    // Validar límites de participantes si están configurados
    const maxParticipants = this.settings?.participation?.maxParticipants;
    if (maxParticipants && this.participantCount > maxParticipants) {
      throw new Error(`La conversación excede el límite de ${maxParticipants} participantes`);
    }
  }
}