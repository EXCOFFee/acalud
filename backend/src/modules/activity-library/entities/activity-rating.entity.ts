import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  CreateDateColumn, 
  UpdateDateColumn,
  Index,
  JoinColumn,
  Unique
} from 'typeorm';
import { User } from '../../users/user.entity';
import { ActivityLibrary } from './activity-library.entity';

/**
 * Entidad que representa una valoración/rating de una actividad en la biblioteca
 * Implementa el patrón Repository para gestión de valoraciones
 * Sigue principios SOLID para separación de responsabilidades
 * 
 * @description Gestiona las valoraciones que los usuarios dan a las actividades compartidas
 * @author Sistema de Gestión Educativa AcaLud
 * @version 1.0.0
 */
@Entity('activity_ratings')
@Unique(['userId', 'libraryActivityId']) // Un usuario solo puede valorar una vez cada actividad
@Index(['libraryActivityId', 'rating'])
@Index(['userId', 'createdAt'])
export class ActivityRating {
  /**
   * Identificador único de la valoración
   * Clave primaria auto-generada
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * ID del usuario que realiza la valoración
   * Referencia al profesor que valora la actividad
   */
  @Column('uuid')
  @Index()
  userId: string;

  /**
   * ID de la actividad de biblioteca valorada
   * Referencia a la actividad en la biblioteca pública
   */
  @Column('uuid')
  @Index()
  libraryActivityId: string;

  /**
   * Puntuación otorgada (1-5 estrellas)
   * Valoración numérica de la calidad de la actividad
   */
  @Column({ 
    type: 'int',
    transformer: {
      to: (value: number) => Math.max(1, Math.min(5, Math.round(value))),
      from: (value: number) => value
    }
  })
  rating: number;

  /**
   * Comentario opcional sobre la actividad
   * Feedback detallado del usuario
   */
  @Column({ type: 'text', nullable: true })
  comment: string;

  /**
   * Indica si la valoración está activa
   * Permite ocultar valoraciones sin eliminarlas
   */
  @Column({ type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  /**
   * Indica si el comentario fue reportado
   * Control de moderación de contenido
   */
  @Column({ type: 'boolean', default: false })
  isReported: boolean;

  /**
   * Número de "me gusta" que recibió el comentario
   * Permite valorar la utilidad del feedback
   */
  @Column({ type: 'int', default: 0 })
  helpfulVotes: number;

  /**
   * Fecha de creación de la valoración
   * Auditoría automática
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Fecha de última actualización
   * Auditoría automática de cambios
   */
  @UpdateDateColumn()
  updatedAt: Date;

  // =====================================
  // RELACIONES CON OTRAS ENTIDADES
  // =====================================

  /**
   * Relación con el usuario que valora
   * Permite acceso a información del evaluador
   */
  @ManyToOne(() => User, user => user.activityRatings, { 
    eager: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'userId' })
  user: User;

  /**
   * Relación con la actividad valorada
   * Permite acceso a la actividad de biblioteca
   */
  @ManyToOne(() => ActivityLibrary, activity => activity.ratings, { 
    eager: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'libraryActivityId' })
  libraryActivity: ActivityLibrary;

  // =====================================
  // MÉTODOS DE NEGOCIO
  // =====================================

  /**
   * Valida que la puntuación esté en el rango correcto
   * Implementa reglas de negocio para valoraciones
   * 
   * @returns {boolean} True si la puntuación es válida
   */
  isValidRating(): boolean {
    return this.rating >= 1 && this.rating <= 5 && Number.isInteger(this.rating);
  }

  /**
   * Verifica si el comentario es válido
   * Implementa validaciones de contenido
   * 
   * @returns {boolean} True si el comentario es válido
   */
  isValidComment(): boolean {
    if (!this.comment) return true; // Comentario opcional
    
    const trimmedComment = this.comment.trim();
    return trimmedComment.length >= 5 && trimmedComment.length <= 1000;
  }

  /**
   * Verifica si la valoración puede ser editada
   * Solo se puede editar dentro de un tiempo límite
   * 
   * @param {number} editTimeHours - Horas límite para edición (default: 24)
   * @returns {boolean} True si puede ser editada
   */
  canBeEdited(editTimeHours: number = 24): boolean {
    if (!this.isActive) return false;
    
    const now = new Date();
    const hoursElapsed = (now.getTime() - this.createdAt.getTime()) / (1000 * 60 * 60);
    
    return hoursElapsed <= editTimeHours;
  }

  /**
   * Obtiene el texto de la valoración en estrellas
   * Convierte la puntuación numérica a representación visual
   * 
   * @returns {string} Representación en estrellas
   */
  getStarsText(): string {
    const fullStars = '★'.repeat(this.rating);
    const emptyStars = '☆'.repeat(5 - this.rating);
    return fullStars + emptyStars;
  }

  /**
   * Verifica si es una valoración positiva
   * Considera positivas las valoraciones de 4-5 estrellas
   * 
   * @returns {boolean} True si es valoración positiva
   */
  isPositive(): boolean {
    return this.rating >= 4;
  }

  /**
   * Verifica si es una valoración negativa
   * Considera negativas las valoraciones de 1-2 estrellas
   * 
   * @returns {boolean} True si es valoración negativa
   */
  isNegative(): boolean {
    return this.rating <= 2;
  }

  /**
   * Verifica si es una valoración neutral
   * Considera neutral la valoración de 3 estrellas
   * 
   * @returns {boolean} True si es valoración neutral
   */
  isNeutral(): boolean {
    return this.rating === 3;
  }

  /**
   * Incrementa los votos de utilidad
   * Se llama cuando alguien marca el comentario como útil
   */
  incrementHelpfulVotes(): void {
    this.helpfulVotes += 1;
  }

  /**
   * Decrementa los votos de utilidad
   * Se llama cuando alguien quita el voto de útil
   */
  decrementHelpfulVotes(): void {
    if (this.helpfulVotes > 0) {
      this.helpfulVotes -= 1;
    }
  }

  /**
   * Marca la valoración como reportada
   * Se usa para moderación de contenido
   */
  markAsReported(): void {
    this.isReported = true;
  }

  /**
   * Desactiva la valoración
   * Oculta la valoración sin eliminarla físicamente
   */
  deactivate(): void {
    this.isActive = false;
  }

  /**
   * Reactiva la valoración
   * Vuelve a mostrar una valoración previamente oculta
   */
  reactivate(): void {
    this.isActive = true;
    this.isReported = false;
  }

  /**
   * Actualiza la valoración con nuevos datos
   * Método para modificación controlada
   * 
   * @param {number} newRating - Nueva puntuación
   * @param {string} newComment - Nuevo comentario (opcional)
   */
  updateRating(newRating: number, newComment?: string): void {
    if (newRating >= 1 && newRating <= 5) {
      this.rating = Math.round(newRating);
    }
    
    if (newComment !== undefined) {
      this.comment = newComment.trim() || null;
    }
  }

  /**
   * Obtiene un resumen de la valoración
   * Información completa para mostrar al usuario
   * 
   * @returns {object} Resumen de la valoración
   */
  getSummary(): {
    rating: number;
    stars: string;
    comment: string;
    isPositive: boolean;
    helpfulVotes: number;
    createdAt: Date;
  } {
    return {
      rating: this.rating,
      stars: this.getStarsText(),
      comment: this.comment || '',
      isPositive: this.isPositive(),
      helpfulVotes: this.helpfulVotes,
      createdAt: this.createdAt
    };
  }

  /**
   * Verifica si la valoración está verificada
   * Considera verificadas las valoraciones con comentarios útiles
   * 
   * @returns {boolean} True si está verificada
   */
  isVerified(): boolean {
    return this.isActive && 
           !this.isReported && 
           (this.helpfulVotes >= 3 || 
            (this.comment && this.comment.length >= 50));
  }
}