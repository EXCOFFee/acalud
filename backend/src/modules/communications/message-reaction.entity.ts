/**
 * 👍 ENTIDAD DE REACCIONES A MENSAJES - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Entidad que representa las reacciones/emojis a mensajes:
 * - Likes, dislikes, emojis específicos
 * - Una reacción por usuario por mensaje
 * - Contadores optimizados para UI
 * - Historial de reacciones para analytics
 * 
 * PRINCIPIOS SOLID APLICADOS:
 * - SRP: Responsabilidad única de modelar reacciones
 * - OCP: Extensible para nuevos tipos de reacciones
 * - LSP: Implementa contratos bien definidos
 * - ISP: Interface específica para reacciones
 * - DIP: Usa abstracciones de User y Message
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Message } from './message.entity';

/**
 * Enum de tipos de reacciones disponibles
 * Extensible para agregar nuevos emojis
 */
export enum ReactionType {
  // 👍 Reacciones básicas
  LIKE = 'like',
  DISLIKE = 'dislike',
  LOVE = 'love',
  
  // 😄 Emojis de emociones
  LAUGH = 'laugh',
  WOW = 'wow',
  SAD = 'sad',
  ANGRY = 'angry',
  
  // 🎯 Reacciones específicas de educación
  HELPFUL = 'helpful',
  CONFUSED = 'confused',
  CORRECT = 'correct',
  QUESTION = 'question',
}

/**
 * Entidad que representa una reacción a un mensaje
 * 
 * @description Almacena las reacciones de usuarios a mensajes específicos
 * con restricción de una reacción por usuario por mensaje.
 * 
 * @example
 * ```typescript
 * const reaction = new MessageReaction();
 * reaction.type = ReactionType.LIKE;
 * reaction.user = currentUser;
 * reaction.message = targetMessage;
 * ```
 */
@Entity('message_reactions')
@Index(['messageId', 'type']) // Índice para contar reacciones por tipo
@Index(['userId', 'messageId']) // Índice para verificar reacciones existentes
@Unique(['userId', 'messageId']) // Un usuario, una reacción por mensaje
export class MessageReaction {
  /**
   * Identificador único de la reacción
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Mensaje al que se reacciona
   */
  @ManyToOne(() => Message, message => message.reactions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'message_id' })
  message: Message;

  /**
   * ID del mensaje (para consultas optimizadas)
   */
  @Column({ name: 'message_id' })
  messageId: string;

  /**
   * Usuario que reaccionó
   */
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * ID del usuario (para consultas optimizadas)
   */
  @Column({ name: 'user_id' })
  userId: string;

  /**
   * Tipo de reacción
   */
  @Column({
    type: 'enum',
    enum: ReactionType,
    comment: 'Tipo específico de reacción del usuario',
  })
  type: ReactionType;

  /**
   * Fecha de creación
   */
  @CreateDateColumn({ 
    name: 'created_at',
    comment: 'Timestamp de cuando se creó la reacción',
  })
  createdAt: Date;

  /**
   * Fecha de actualización (si cambia el tipo)
   */
  @UpdateDateColumn({ 
    name: 'updated_at',
    comment: 'Timestamp de última modificación',
  })
  updatedAt: Date;

  /**
   * Obtiene el emoji correspondiente al tipo
   * 
   * @returns Emoji unicode para mostrar en UI
   */
  getEmoji(): string {
    const emojiMap: Record<ReactionType, string> = {
      [ReactionType.LIKE]: '👍',
      [ReactionType.DISLIKE]: '👎',
      [ReactionType.LOVE]: '❤️',
      [ReactionType.LAUGH]: '😂',
      [ReactionType.WOW]: '😮',
      [ReactionType.SAD]: '😢',
      [ReactionType.ANGRY]: '😠',
      [ReactionType.HELPFUL]: '💡',
      [ReactionType.CONFUSED]: '🤔',
      [ReactionType.CORRECT]: '✅',
      [ReactionType.QUESTION]: '❓',
    };

    return emojiMap[this.type] || '👍';
  }
}