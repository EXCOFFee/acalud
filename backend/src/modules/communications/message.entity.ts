/**
 * 💬 ENTIDAD DE MENSAJES - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Entidad que representa los mensajes del sistema de comunicación:
 * - Mensajes de texto simples
 * - Mensajes con archivos adjuntos
 * - Mensajes con menciones a usuarios
 * - Mensajes con reacciones/emojis
 * - Mensajes editados con historial
 * 
 * PRINCIPIOS SOLID APLICADOS:
 * - SRP: Responsabilidad única de modelar mensajes
 * - OCP: Extensible para nuevos tipos de contenido
 * - LSP: Implementa contratos bien definidos
 * - ISP: Interfaces específicas por funcionalidad
 * - DIP: Usa abstracciones, no implementaciones concretas
 * 
 * BUENAS PRÁCTICAS:
 * - Soft delete para conservar historial
 * - Índices optimizados para búsquedas
 * - Versionado para mensajes editados
 * - Validaciones robustas
 * - Encriptación de contenido sensible
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
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import * as crypto from 'crypto';
import { User } from '../users/user.entity';
import { Conversation } from './conversation.entity';
import { MessageReaction } from './message-reaction.entity';
import { MessageAttachment } from './message-attachment.entity';
import { MessageType, MessageStatus } from './message.enums';

export { MessageType, MessageStatus };

interface EnrichedLinkPreview {
  url: string;
  domain: string;
  title: string | null;
  description: string | null;
  image: string | null;
}

/**
 * Entidad principal que representa un mensaje
 * 
 * @description Esta entidad almacena todos los mensajes del sistema
 * con soporte para diferentes tipos de contenido y metadatos.
 * 
 * @example
 * ```typescript
 * // Mensaje de texto simple
 * const message = new Message();
 * message.type = MessageType.TEXT;
 * message.content = 'Hola, ¿cómo están?';
 * message.author = user;
 * message.conversation = conversation;
 * 
 * // Mensaje con mención
 * const mention = new Message();
 * mention.content = 'Hola @juan, revisa la tarea';
 * mention.mentions = [juanUser];
 * ```
 */
@Entity('messages')
@Index(['conversationId', 'createdAt']) // Índice para mensajes por conversación ordenados
@Index(['authorId', 'createdAt']) // Índice para mensajes por autor
@Index(['status', 'createdAt']) // Índice para filtrar por estado
@Index(['type', 'createdAt']) // Índice para filtrar por tipo
@Index(['parentMessageId']) // Índice para respuestas/hilos
@Check(`"type" IN ('text', 'file', 'image', 'audio', 'video', 'location', 'poll', 'system', 'system_announcement', 'welcome_message', 'moderation_action', 'announcement')`)
@Check(`"status" IN ('sent', 'delivered', 'read', 'edited', 'deleted', 'moderated', 'blocked', 'pending_approval', 'scheduled')`)
export class Message {
  /**
   * Identificador único del mensaje
   * UUID para mejor distribución y seguridad
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Conversación a la que pertenece el mensaje
   * Relación muchos-a-uno requerida
   */
  @ManyToOne(() => Conversation, conversation => conversation.messages, {
    eager: false,
    onDelete: 'CASCADE', // Si se elimina la conversación, se eliminan los mensajes
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  /**
   * ID de la conversación (para consultas optimizadas)
   * Desnormalización intencional para mejor rendimiento
   */
  @Column({ name: 'conversation_id' })
  conversationId: string;

  /**
   * Usuario autor del mensaje
   * Relación muchos-a-uno requerida
   */
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'author_id' })
  author: User;

  /**
   * ID del autor (para consultas optimizadas)
   * Campo indexado para búsquedas rápidas
   */
  @Column({ name: 'author_id' })
  authorId: string;

  /**
   * Tipo específico del mensaje
   * Determina cómo se procesa y muestra el contenido
   */
  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
    comment: 'Tipo de mensaje que determina el procesamiento del contenido',
  })
  type: MessageType;

  /**
   * Contenido principal del mensaje
   * Texto, HTML limpio o JSON según el tipo
   */
  @Column({
    type: 'text',
    comment: 'Contenido principal del mensaje (texto, HTML o JSON)',
  })
  content: string;

  /**
   * Contenido en texto plano para búsquedas
   * Versión sin formato para indexación full-text
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: 'Versión en texto plano para búsquedas full-text',
  })
  searchableContent?: string;

  /**
   * Mensaje padre (para respuestas e hilos)
   * Permite crear conversaciones anidadas
   */
  @ManyToOne(() => Message, { nullable: true, eager: false })
  @JoinColumn({ name: 'parent_message_id' })
  parentMessage?: Message;

  /**
   * ID del mensaje padre (para consultas optimizadas)
   * Null para mensajes principales, UUID para respuestas
   */
  @Column({ name: 'parent_message_id', nullable: true })
  parentMessageId?: string;

  /**
   * Respuestas a este mensaje
   * Relación uno-a-muchos para hilos de conversación
   */
  @OneToMany(() => Message, message => message.parentMessage, {
    cascade: true,
    eager: false,
  })
  replies: Message[];

  /**
   * Usuarios mencionados en el mensaje
   * Relación muchos-a-muchos para notificaciones
   */
  @ManyToMany(() => User, { eager: false })
  @JoinTable({
    name: 'message_mentions',
    joinColumn: { name: 'message_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  mentions: User[];

  /**
   * Reacciones al mensaje (emojis, likes, etc.)
   * Relación uno-a-muchos para engagement
   */
  @OneToMany(() => MessageReaction, reaction => reaction.message, {
    cascade: true,
    eager: false,
  })
  reactions: MessageReaction[];

  /**
   * Archivos adjuntos al mensaje
   * Relación uno-a-muchos para multimedia
   */
  @OneToMany(() => MessageAttachment, attachment => attachment.message, {
    cascade: true,
    eager: false,
  })
  attachments: MessageAttachment[];

  /**
   * Estado actual del mensaje
   * Controla visibilidad y funcionalidad
   */
  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.SENT,
    comment: 'Estado actual que controla visibilidad y funcionalidad',
  })
  status: MessageStatus;

  /**
   * Metadatos adicionales del mensaje en formato JSON
   * Permite extensibilidad sin cambios de esquema
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Metadatos específicos del tipo de mensaje',
  })
  metadata?: {
    // 📊 Para mensajes tipo POLL
    poll?: {
      question: string;
      options: Array<{
        id: string;
        text: string;
        votes: number;
        voters: string[]; // IDs de usuarios que votaron
      }>;
      allowMultiple: boolean;
      expiresAt?: Date;
    };
    
    // 📍 Para mensajes tipo LOCATION
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
      placeName?: string;
    };
    
    // 🔗 Para enlaces detectados automáticamente
    links?: Array<{
      url: string;
      title?: string;
      description?: string;
      image?: string;
      domain: string;
    }>;
    
    // ✏️ Para mensajes editados
    editHistory?: Array<{
      content: string;
      editedAt: Date;
      reason?: string;
    }>;
    
    // 🚫 Para acciones de moderación
    moderation?: {
      action: 'blocked' | 'deleted' | 'approved';
      reason: string;
      moderatorId: string;
      moderatedAt: Date;
    };
    
    // 📅 Para mensajes programados
    scheduling?: {
      scheduledFor: Date;
      timezone: string;
      isRecurring: boolean;
      recurrencePattern?: string;
    };
    
    // 🔒 Para mensajes encriptados
    encryption?: {
      isEncrypted: boolean;
      algorithm: string;
      keyVersion: number;
    };
    
    // Metadatos adicionales extensibles
    [key: string]: unknown;
  };

  /**
   * Número de respuestas a este mensaje
   * Campo calculado para evitar COUNT() costosos
   */
  @Column({
    type: 'int',
    default: 0,
    comment: 'Contador de respuestas para evitar consultas COUNT costosas',
  })
  replyCount: number;

  /**
   * Número de reacciones al mensaje
   * Campo calculado para mostrar engagement
   */
  @Column({
    type: 'int',
    default: 0,
    comment: 'Contador de reacciones para mostrar engagement',
  })
  reactionCount: number;

  /**
   * Hash del contenido para detectar duplicados
   * Previene spam y mensajes idénticos
   */
  @Column({
    type: 'varchar',
    length: 64,
    nullable: true,
    comment: 'Hash SHA-256 del contenido para detección de duplicados',
  })
  contentHash?: string;

  /**
   * Prioridad del mensaje (0=normal, 1=alta, 2=crítica)
   * Usado para ordenamiento y notificaciones
   */
  @Column({
    type: 'int',
    default: 0,
    comment: 'Prioridad del mensaje para ordenamiento y notificaciones',
  })
  priority: number;

  /**
   * Fecha programada para envío (opcional)
   * Para mensajes que se envían en el futuro
   */
  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Fecha programada para envío de mensajes futuros',
  })
  scheduledAt?: Date;

  /**
   * Fecha de lectura (para chats directos)
   * Indica cuando fue leído por el destinatario
   */
  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp de lectura para chats directos',
  })
  readAt?: Date;

  /**
   * Usuario que leyó el mensaje (para chats directos)
   * Referencia para confirmaciones de lectura
   */
  @ManyToOne(() => User, { nullable: true, eager: false })
  @JoinColumn({ name: 'read_by_id' })
  readBy?: User;

  /**
   * Fecha de última edición
   * Indica cuando fue modificado por última vez
   */
  @Column({
    type: 'timestamp with time zone',
    nullable: true,
    comment: 'Timestamp de última edición del mensaje',
  })
  editedAt?: Date;

  /**
   * Fecha de creación (automática)
   * Timestamp de cuando se creó el mensaje
   */
  @CreateDateColumn({ 
    name: 'created_at',
    comment: 'Timestamp de creación del mensaje',
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
   * Permite recuperación y mantiene historial
   */
  @DeleteDateColumn({ 
    name: 'deleted_at',
    comment: 'Timestamp de soft delete para conservar historial',
  })
  deletedAt?: Date;

  // =============================================================================
  // 🔧 HOOKS DE CICLO DE VIDA
  // =============================================================================

  /**
   * Hook que se ejecuta antes de insertar
   * Procesa el contenido y genera metadatos
   */
  @BeforeInsert()
  private async beforeInsert() {
    await this.processContent();
    this.generateContentHash();
    this.extractSearchableContent();
  }

  /**
   * Hook que se ejecuta antes de actualizar
   * Mantiene historial de ediciones
   */
  @BeforeUpdate()
  private async beforeUpdate() {
    // Si el contenido cambió, agregar al historial de ediciones
    if (this.status === MessageStatus.EDITED) {
      this.addToEditHistory();
      this.editedAt = new Date();
    }
    
    await this.processContent();
    this.generateContentHash();
    this.extractSearchableContent();
  }

  // =============================================================================
  // 🔧 MÉTODOS DE UTILIDAD SIGUIENDO PRINCIPIOS OOP
  // =============================================================================

  /**
   * Verifica si el mensaje está visible para un usuario
   * Encapsula lógica de visibilidad y permisos
   * 
   * @param user - Usuario que quiere ver el mensaje
   * @returns true si el mensaje es visible
   */
  isVisibleToUser(user: User): boolean {
    // Mensajes eliminados no son visibles (excepto para el autor y moderadores)
    if (this.status === MessageStatus.DELETED) {
      return this.authorId === user.id || this.isUserModerator(user);
    }
    
    // Mensajes bloqueados solo son visibles para moderadores
    if (this.status === MessageStatus.BLOCKED) {
      return this.isUserModerator(user);
    }
    
    // Mensajes pendientes solo son visibles para el autor y moderadores
    if (this.status === MessageStatus.PENDING_APPROVAL) {
      return this.authorId === user.id || this.isUserModerator(user);
    }
    
    // Mensajes programados solo son visibles para el autor hasta la fecha programada
    if (this.status === MessageStatus.SCHEDULED && this.scheduledAt) {
      if (new Date() < this.scheduledAt) {
        return this.authorId === user.id;
      }
    }
    
    return true;
  }

  /**
   * Verifica si un usuario puede editar el mensaje
   * Encapsula reglas de negocio para edición
   * 
   * @param user - Usuario que quiere editar
   * @returns true si puede editar
   */
  canUserEdit(user: User): boolean {
    // Solo el autor puede editar sus mensajes
    if (this.authorId !== user.id) {
      return false;
    }
    
    // No se pueden editar mensajes eliminados o bloqueados
    if ([MessageStatus.DELETED, MessageStatus.BLOCKED].includes(this.status)) {
      return false;
    }
    
    // Límite de tiempo para edición (configurable)
    const editTimeLimit = 24 * 60 * 60 * 1000; // 24 horas
    const timeSinceCreation = Date.now() - this.createdAt.getTime();
    
    return timeSinceCreation < editTimeLimit;
  }

  /**
   * Verifica si un usuario puede eliminar el mensaje
   * Encapsula reglas de negocio para eliminación
   * 
   * @param user - Usuario que quiere eliminar
   * @returns true si puede eliminar
   */
  canUserDelete(user: User): boolean {
    // El autor siempre puede eliminar sus mensajes
    if (this.authorId === user.id) {
      return true;
    }
    
    // Los moderadores pueden eliminar cualquier mensaje
    return this.isUserModerator(user);
  }

  /**
   * Verifica si un usuario es moderador en el contexto del mensaje
   * Lógica de permisos delegada a la conversación
   * 
   * @param user - Usuario a verificar
   * @returns true si es moderador
   */
  private isUserModerator(user: User): boolean {
    // Delegar verificación de permisos a la conversación
    return this.conversation?.isUserModerator(user) || user.role === 'admin';
  }

  /**
   * Marca el mensaje como leído por un usuario
   * Actualiza metadatos de lectura
   * 
   * @param user - Usuario que leyó el mensaje
   */
  markAsReadBy(user: User): void {
    if (this.status === MessageStatus.SENT) {
      this.status = MessageStatus.READ;
      this.readAt = new Date();
      this.readBy = user;
    }
  }

  /**
   * Agrega una reacción al mensaje
   * Incrementa contador para optimización
   * 
   * @param reaction - Reacción a agregar
   */
  addReaction(reaction: MessageReaction): void {
    if (!this.reactions) {
      this.reactions = [];
    }
    this.reactions.push(reaction);
    this.reactionCount += 1;
  }

  /**
   * Extrae menciones del contenido del mensaje
   * Detecta patrones @usuario en el texto
   * 
   * @returns Array de nombres de usuario mencionados
   */
  extractMentions(): string[] {
    const mentionPattern = /@(\w+)/g;
    const matches = this.content.match(mentionPattern);
    return matches ? matches.map(match => match.substring(1)) : [];
  }

  /**
   * Extrae enlaces del contenido del mensaje
   * Detecta URLs para generar previews
   * 
   * @returns Array de URLs encontradas
   */
  extractLinks(): string[] {
    const urlPattern = /https?:\/\/[^\s]+/g;
    return this.content.match(urlPattern) || [];
  }

  /**
   * Procesa el contenido del mensaje según su tipo
   * Aplica transformaciones y validaciones específicas
   */
  private async processContent(): Promise<void> {
    switch (this.type) {
      case MessageType.TEXT:
        // Sanitizar HTML y detectar menciones/enlaces
        this.content = this.sanitizeHtml(this.content);
        await this.processTextContent();
        break;
        
      case MessageType.POLL:
        // Validar estructura de encuesta
        this.validatePollContent();
        break;
        
      case MessageType.LOCATION:
        // Validar coordenadas geográficas
        this.validateLocationContent();
        break;
        
      default:
        // Procesamiento básico para otros tipos
        this.content = this.content.trim();
    }
  }

  /**
   * Procesa contenido de texto para detectar patrones
   * Extrae menciones, enlaces y otros elementos
   */
  private async processTextContent(): Promise<void> {
    if (!this.metadata) {
      this.metadata = {};
    }
    
    // Extraer y procesar enlaces
    const links = this.extractLinks();
    if (links.length > 0) {
      this.metadata.links = await this.enrichLinks(links);
    }
    
    // Detectar y marcar menciones
    const mentionedUsernames = this.extractMentions();
    if (mentionedUsernames.length > 0) {
      // TODO: Resolver usernames a User entities
      // this.mentions = await this.resolveMentions(mentionedUsernames);
    }
  }

  /**
   * Genera hash del contenido para detección de duplicados
   * Usa SHA-256 para identificación única
   */
  private generateContentHash(): void {
    const normalizedContent = this.content.toLowerCase().trim();
    this.contentHash = crypto
      .createHash('sha256')
      .update(normalizedContent)
      .digest('hex');
  }

  /**
   * Extrae versión en texto plano para búsquedas
   * Remueve formato HTML y caracteres especiales
   */
  private extractSearchableContent(): void {
    // Remover HTML y caracteres especiales
    this.searchableContent = this.content
      .replace(/<[^>]*>/g, '') // Remover HTML
      .replace(/[^\w\s]/g, ' ') // Remover caracteres especiales
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim()
      .toLowerCase();
  }

  /**
   * Sanitiza contenido HTML para prevenir XSS
   * Usa whitelist de tags seguros
   * 
   * @param html - Contenido HTML a sanitizar
   * @returns HTML sanitizado
   */
  private sanitizeHtml(html: string): string {
    // TODO: Implementar sanitización con librería como DOMPurify
    // Por ahora, escape básico
    return html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Valida estructura de encuesta
   * Verifica formato JSON y opciones válidas
   */
  private validatePollContent(): void {
    try {
      const pollData = JSON.parse(this.content);
      
      if (!pollData.question || !Array.isArray(pollData.options)) {
        throw new Error('Estructura de encuesta inválida');
      }
      
      if (pollData.options.length < 2 || pollData.options.length > 10) {
        throw new Error('La encuesta debe tener entre 2 y 10 opciones');
      }
      
    } catch (error) {
      throw new Error(`Error validando encuesta: ${error.message}`);
    }
  }

  /**
   * Valida contenido de ubicación
   * Verifica coordenadas geográficas válidas
   */
  private validateLocationContent(): void {
    try {
      const locationData = JSON.parse(this.content);
      
      const { latitude, longitude } = locationData;
      
      if (typeof latitude !== 'number' || typeof longitude !== 'number') {
        throw new Error('Coordenadas deben ser números');
      }
      
      if (latitude < -90 || latitude > 90) {
        throw new Error('Latitud debe estar entre -90 y 90');
      }
      
      if (longitude < -180 || longitude > 180) {
        throw new Error('Longitud debe estar entre -180 y 180');
      }
      
    } catch (error) {
      throw new Error(`Error validando ubicación: ${error.message}`);
    }
  }

  /**
   * Enriquece enlaces con metadatos
   * Obtiene título, descripción e imagen de URLs
   * 
   * @param links - Array de URLs a enriquecer
   * @returns Array de enlaces enriquecidos
   */
  private async enrichLinks(links: string[]): Promise<EnrichedLinkPreview[]> {
    // TODO: Implementar extracción de metadatos de enlaces
    // Por ahora, retornar estructura básica
    return links.map(url => ({
      url,
      domain: new URL(url).hostname,
      title: null,
      description: null,
      image: null,
    }));
  }

  /**
   * Agrega entrada al historial de ediciones
   * Mantiene registro de cambios para auditoría
   */
  private addToEditHistory(): void {
    if (!this.metadata) {
      this.metadata = {};
    }
    
    if (!this.metadata.editHistory) {
      this.metadata.editHistory = [];
    }
    
    // Agregar estado actual al historial
    this.metadata.editHistory.push({
      content: this.content,
      editedAt: new Date(),
      reason: 'Editado por el usuario', // TODO: Permitir razón personalizada
    });
  }

  /**
   * Obtiene resumen del mensaje para APIs
   * Proporciona datos optimizados para UI
   * 
   * @returns Objeto con datos esenciales del mensaje
   */
  getSummary() {
    return {
      id: this.id,
      type: this.type,
      content: this.getDisplayContent(),
      author: {
        id: this.author?.id,
        name: this.author?.name,
      },
      status: this.status,
      replyCount: this.replyCount,
      reactionCount: this.reactionCount,
      hasAttachments: this.attachments?.length > 0,
      hasMentions: this.mentions?.length > 0,
      isEdited: this.status === MessageStatus.EDITED,
      createdAt: this.createdAt,
      editedAt: this.editedAt,
      parentMessageId: this.parentMessageId,
    };
  }

  /**
   * Obtiene contenido para mostrar en UI
   * Aplica truncamiento y formateo según contexto
   * 
   * @param maxLength - Longitud máxima del contenido
   * @returns Contenido formateado para mostrar
   */
  private getDisplayContent(maxLength: number = 500): string {
    let displayContent = this.content;
    
    // Truncar si es muy largo
    if (displayContent.length > maxLength) {
      displayContent = displayContent.substring(0, maxLength) + '...';
    }
    
    // Para mensajes eliminados, mostrar placeholder
    if (this.status === MessageStatus.DELETED) {
      return '🗑️ Este mensaje ha sido eliminado';
    }
    
    // Para mensajes bloqueados, mostrar placeholder
    if (this.status === MessageStatus.BLOCKED) {
      return '🚫 Este mensaje ha sido bloqueado por moderación';
    }
    
    return displayContent;
  }
}