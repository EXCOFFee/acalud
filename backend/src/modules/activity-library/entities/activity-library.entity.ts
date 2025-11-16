import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  ManyToOne, 
  OneToMany,
  CreateDateColumn, 
  UpdateDateColumn, 
  Index,
  JoinColumn
} from 'typeorm';
import { User } from '../../users/user.entity';
import { Activity } from '../../activities/activity.entity';
import { ActivityRating } from './activity-rating.entity';
import { ActivityTag } from './activity-tag.entity';

/**
 * Enumeración para el estado de visibilidad de una actividad en la biblioteca
 * Define si una actividad es pública, privada o está bajo revisión
 */
export enum ActivityVisibility {
  PRIVATE = 'private',           // Solo visible para el autor
  PUBLIC = 'public',             // Visible para todos los usuarios
  UNDER_REVIEW = 'under_review', // En proceso de revisión por moderadores
  REJECTED = 'rejected',         // Rechazada por moderadores
  FEATURED = 'featured'          // Destacada por moderadores
}

/**
 * Enumeración para las categorías de actividades
 * Permite clasificar las actividades por área de conocimiento
 */
export enum ActivityCategory {
  MATHEMATICS = 'mathematics',
  SCIENCE = 'science',
  LANGUAGE = 'language',
  HISTORY = 'history',
  GEOGRAPHY = 'geography',
  ART = 'art',
  MUSIC = 'music',
  PHYSICAL_EDUCATION = 'physical_education',
  TECHNOLOGY = 'technology',
  OTHER = 'other'
}

/**
 * Enumeración para el nivel de dificultad de las actividades
 * Permite filtrar actividades por complejidad
 */
export enum DifficultyLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

/**
 * Entidad que representa una actividad compartida en la biblioteca pública
 * Implementa el patrón Repository para gestión de datos
 * Sigue principios SOLID para separación de responsabilidades
 * 
 * @description Gestiona las actividades que los profesores comparten públicamente
 * @author Sistema de Gestión Educativa AcaLud
 * @version 1.0.0
 */
@Entity('activity_library')
@Index(['visibility', 'isActive'])
@Index(['category', 'difficultyLevel'])
@Index(['authorId', 'createdAt'])
@Index(['averageRating', 'totalRatings'])
export class ActivityLibrary {
  /**
   * Identificador único de la actividad en biblioteca
   * Clave primaria auto-generada
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * ID del usuario autor de la actividad
   * Referencia al profesor que compartió la actividad
   */
  @Column('uuid')
  @Index()
  authorId: string;

  /**
   * ID de la actividad original
   * Referencia a la actividad base que se comparte
   */
  @Column('uuid')
  @Index()
  originalActivityId: string;

  /**
   * Título público de la actividad
   * Puede ser diferente al título original para mejor marketing
   */
  @Column({ type: 'varchar', length: 200 })
  publicTitle: string;

  /**
   * Descripción pública detallada de la actividad
   * Marketing y explicación para otros profesores
   */
  @Column({ type: 'text' })
  publicDescription: string;

  /**
   * Categoría de la actividad para clasificación
   * Permite filtrado por área de conocimiento
   */
  @Column({
    type: 'enum',
    enum: ActivityCategory,
    default: ActivityCategory.OTHER
  })
  category: ActivityCategory;

  /**
   * Nivel de dificultad de la actividad
   * Ayuda a otros profesores a elegir según su audiencia
   */
  @Column({
    type: 'enum',
    enum: DifficultyLevel,
    default: DifficultyLevel.BEGINNER
  })
  difficultyLevel: DifficultyLevel;

  /**
   * Estado de visibilidad de la actividad
   * Controla quién puede ver y acceder a la actividad
   */
  @Column({
    type: 'enum',
    enum: ActivityVisibility,
    default: ActivityVisibility.PRIVATE
  })
  visibility: ActivityVisibility;

  /**
   * Rango de edad recomendado (mínimo)
   * Ayuda en la selección apropiada por edad
   */
  @Column({ type: 'int', nullable: true })
  recommendedAgeMin: number;

  /**
   * Rango de edad recomendado (máximo)
   * Completa el rango de edad objetivo
   */
  @Column({ type: 'int', nullable: true })
  recommendedAgeMax: number;

  /**
   * Duración estimada en minutos
   * Información útil para planificación de clases
   */
  @Column({ type: 'int', nullable: true })
  estimatedDurationMinutes: number;

  /**
   * Número de estudiantes recomendado (mínimo)
   * Información para organización grupal
   */
  @Column({ type: 'int', nullable: true })
  recommendedStudentsMin: number;

  /**
   * Número de estudiantes recomendado (máximo)
   * Completa la información de organización grupal
   */
  @Column({ type: 'int', nullable: true })
  recommendedStudentsMax: number;

  /**
   * Recursos o materiales necesarios
   * Lista de elementos requeridos para la actividad
   */
  @Column({ type: 'json', nullable: true })
  requiredMaterials: string[];

  /**
   * Objetivos de aprendizaje
   * Lo que los estudiantes lograrán con esta actividad
   */
  @Column({ type: 'json', nullable: true })
  learningObjectives: string[];

  /**
   * Instrucciones específicas para el profesor
   * Guía de implementación y consejos
   */
  @Column({ type: 'text', nullable: true })
  teacherInstructions: string;

  /**
   * Evaluación promedio de la actividad
   * Calculada a partir de todas las valoraciones
   */
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.00 })
  averageRating: number;

  /**
   * Número total de valoraciones recibidas
   * Indica la popularidad y confiabilidad de la puntuación
   */
  @Column({ type: 'int', default: 0 })
  totalRatings: number;

  /**
   * Número total de copias realizadas
   * Métrica de éxito y utilidad de la actividad
   */
  @Column({ type: 'int', default: 0 })
  totalCopies: number;

  /**
   * Número total de vistas de la actividad
   * Métrica de interés general
   */
  @Column({ type: 'int', default: 0 })
  totalViews: number;

  /**
   * Indica si la actividad está activa
   * Permite desactivación sin eliminación
   */
  @Column({ type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  /**
   * Indica si la actividad ha sido destacada
   * Permite promoción especial por parte de administradores
   */
  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  /**
   * Motivo de rechazo si aplica
   * Información para el autor en caso de rechazo por moderación
   */
  @Column({ type: 'text', nullable: true })
  rejectionReason: string;

  /**
   * ID del moderador que revisó la actividad
   * Trazabilidad de decisiones de moderación
   */
  @Column({ type: 'uuid', nullable: true })
  reviewedBy: string;

  /**
   * Fecha de revisión por moderador
   * Historial de moderación
   */
  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;

  /**
   * Fecha de creación del registro
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
   * Relación con el usuario autor
   * Permite acceso a información del profesor que compartió
   */
  @ManyToOne(() => User, user => user.sharedActivities, { 
    eager: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'authorId' })
  author: User;

  /**
   * Relación con la actividad original
   * Permite acceso al contenido completo de la actividad
   */
  @ManyToOne(() => Activity, activity => activity.libraryEntries, { 
    eager: false,
    onDelete: 'CASCADE'
  })
  @JoinColumn({ name: 'originalActivityId' })
  originalActivity: Activity;

  /**
   * Relación con las valoraciones recibidas
   * Permite gestionar todas las puntuaciones de la actividad
   */
  @OneToMany(() => ActivityRating, rating => rating.libraryActivity, { 
    cascade: true 
  })
  ratings: Promise<ActivityRating[]>;

  /**
   * Relación con las etiquetas de la actividad
   * Sistema de clasificación flexible mediante tags
   */
  @OneToMany(() => ActivityTag, tag => tag.libraryActivity, { 
    cascade: true 
  })
  tags: Promise<ActivityTag[]>;

  // =====================================
  // MÉTODOS DE NEGOCIO
  // =====================================

  /**
   * Verifica si la actividad es visible públicamente
   * Implementa lógica de negocio para visibilidad
   * 
   * @returns {boolean} True si es visible públicamente
   */
  isPubliclyVisible(): boolean {
    return this.isActive && 
           (this.visibility === ActivityVisibility.PUBLIC || 
            this.visibility === ActivityVisibility.FEATURED);
  }

  /**
   * Verifica si la actividad puede ser copiada
   * Solo actividades públicas y activas pueden ser copiadas
   * 
   * @returns {boolean} True si puede ser copiada
   */
  canBeCopied(): boolean {
    return this.isPubliclyVisible();
  }

  /**
   * Verifica si la actividad puede ser valorada por un usuario
   * No se puede valorar actividades propias
   * 
   * @param {string} userId - ID del usuario que quiere valorar
   * @returns {boolean} True si puede ser valorada
   */
  canBeRatedBy(userId: string): boolean {
    return this.isPubliclyVisible() && this.authorId !== userId;
  }

  /**
   * Calcula el rango de edad como string legible
   * Formatea la información de edad recomendada
   * 
   * @returns {string} Rango de edad formateado
   */
  getAgeRangeText(): string {
    if (!this.recommendedAgeMin && !this.recommendedAgeMax) {
      return 'Todas las edades';
    }
    
    if (this.recommendedAgeMin && this.recommendedAgeMax) {
      return `${this.recommendedAgeMin}-${this.recommendedAgeMax} años`;
    }
    
    if (this.recommendedAgeMin) {
      return `Desde ${this.recommendedAgeMin} años`;
    }
    
    return `Hasta ${this.recommendedAgeMax} años`;
  }

  /**
   * Obtiene el texto de duración formateado
   * Convierte minutos a formato legible
   * 
   * @returns {string} Duración formateada
   */
  getDurationText(): string {
    if (!this.estimatedDurationMinutes) {
      return 'Duración no especificada';
    }
    
    if (this.estimatedDurationMinutes < 60) {
      return `${this.estimatedDurationMinutes} minutos`;
    }
    
    const hours = Math.floor(this.estimatedDurationMinutes / 60);
    const minutes = this.estimatedDurationMinutes % 60;
    
    if (minutes === 0) {
      return `${hours} ${hours === 1 ? 'hora' : 'horas'}`;
    }
    
    return `${hours}h ${minutes}m`;
  }

  /**
   * Obtiene el rango de estudiantes como texto
   * Formatea la información de grupo recomendado
   * 
   * @returns {string} Rango de estudiantes formateado
   */
  getStudentRangeText(): string {
    if (!this.recommendedStudentsMin && !this.recommendedStudentsMax) {
      return 'Cualquier tamaño de grupo';
    }
    
    if (this.recommendedStudentsMin && this.recommendedStudentsMax) {
      if (this.recommendedStudentsMin === this.recommendedStudentsMax) {
        return `${this.recommendedStudentsMin} estudiantes`;
      }
      return `${this.recommendedStudentsMin}-${this.recommendedStudentsMax} estudiantes`;
    }
    
    if (this.recommendedStudentsMin) {
      return `Mínimo ${this.recommendedStudentsMin} estudiantes`;
    }
    
    return `Máximo ${this.recommendedStudentsMax} estudiantes`;
  }

  /**
   * Incrementa el contador de vistas
   * Método para tracking de popularidad
   */
  incrementViews(): void {
    this.totalViews += 1;
  }

  /**
   * Incrementa el contador de copias
   * Se llama cuando alguien copia la actividad
   */
  incrementCopies(): void {
    this.totalCopies += 1;
  }

  /**
   * Actualiza la puntuación promedio
   * Recalcula basado en todas las valoraciones
   * 
   * @param {number} newRating - Nueva valoración a incluir
   */
  updateAverageRating(newRating: number): void {
    const totalScore = (this.averageRating * this.totalRatings) + newRating;
    this.totalRatings += 1;
    this.averageRating = Number((totalScore / this.totalRatings).toFixed(2));
  }

  /**
   * Recalcula la puntuación promedio eliminando una valoración
   * Se usa cuando se elimina o modifica una valoración
   * 
   * @param {number} removedRating - Valoración que se elimina
   */
  removeFromAverageRating(removedRating: number): void {
    if (this.totalRatings <= 1) {
      this.averageRating = 0;
      this.totalRatings = 0;
      return;
    }
    
    const totalScore = (this.averageRating * this.totalRatings) - removedRating;
    this.totalRatings -= 1;
    this.averageRating = Number((totalScore / this.totalRatings).toFixed(2));
  }

  /**
   * Marca la actividad como destacada
   * Solo administradores pueden realizar esta acción
   */
  markAsFeatured(): void {
    this.isFeatured = true;
    this.visibility = ActivityVisibility.FEATURED;
  }

  /**
   * Remueve el estado destacado
   * Vuelve al estado público normal
   */
  unmarkAsFeatured(): void {
    this.isFeatured = false;
    if (this.visibility === ActivityVisibility.FEATURED) {
      this.visibility = ActivityVisibility.PUBLIC;
    }
  }

  /**
   * Marca la actividad como rechazada
   * Incluye el motivo del rechazo
   * 
   * @param {string} reason - Motivo del rechazo
   * @param {string} reviewerId - ID del moderador que rechaza
   */
  markAsRejected(reason: string, reviewerId: string): void {
    this.visibility = ActivityVisibility.REJECTED;
    this.rejectionReason = reason;
    this.reviewedBy = reviewerId;
    this.reviewedAt = new Date();
  }

  /**
   * Aprueba la actividad para publicación
   * Cambia el estado a público tras revisión
   * 
   * @param {string} reviewerId - ID del moderador que aprueba
   */
  markAsApproved(reviewerId: string): void {
    this.visibility = ActivityVisibility.PUBLIC;
    this.rejectionReason = null;
    this.reviewedBy = reviewerId;
    this.reviewedAt = new Date();
  }

  /**
   * Verifica si la actividad requiere revisión
   * Lógica de negocio para moderación
   * 
   * @returns {boolean} True si necesita revisión
   */
  needsReview(): boolean {
    return this.visibility === ActivityVisibility.UNDER_REVIEW;
  }

  /**
   * Obtiene el nivel de popularidad basado en métricas
   * Clasificación automática según engagement
   * 
   * @returns {string} Nivel de popularidad
   */
  getPopularityLevel(): string {
    const score = (this.totalViews * 0.1) + 
                  (this.totalCopies * 0.5) + 
                  (this.totalRatings * 0.3) + 
                  (this.averageRating / 5 * 0.1);
    
    if (score >= 50) return 'Muy Popular';
    if (score >= 20) return 'Popular';
    if (score >= 10) return 'Moderado';
    if (score >= 5) return 'Emergente';
    return 'Nuevo';
  }
}