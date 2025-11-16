/**
 * 🎮 ENTIDAD GAME - JUEGOS EDUCATIVOS
 * 
 * Entidad principal que representa un juego educativo en el sistema.
 * Soporta diferentes tipos de juegos: trivia, crucigramas, simulaciones, etc.
 * 
 * TIPOS DE JUEGO:
 * - TRIVIA: Preguntas y respuestas de selección múltiple
 * - CROSSWORD: Crucigramas educativos
 * - MEMORY: Juegos de memoria y matching
 * - SIMULATION: Simulaciones interactivas
 * - PUZZLE: Rompecabezas y desafíos lógicos
 * - DRAG_DROP: Actividades de arrastrar y soltar
 * 
 * FUNCIONALIDADES:
 * - Configuración flexible por tipo de juego
 * - Sistema de puntuación y recompensas
 * - Niveles de dificultad adaptativos
 * - Seguimiento de progreso
 * - Multijugador y competencias
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

/**
 * 📋 Enumeraciones para tipado fuerte
 */
export enum GameType {
  TRIVIA = 'trivia',
  CROSSWORD = 'crossword',
  MEMORY = 'memory',
  SIMULATION = 'simulation',
  PUZZLE = 'puzzle',
  DRAG_DROP = 'drag_drop',
}

export enum GameStatus {
  DRAFT = 'draft',           // En desarrollo
  ACTIVE = 'active',         // Disponible para jugar
  PAUSED = 'paused',         // Pausado temporalmente
  ARCHIVED = 'archived',     // Archivado
  DELETED = 'deleted',       // Eliminado (soft delete)
}

export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  EXPERT = 'expert',
}

export enum GameMode {
  SINGLE_PLAYER = 'single_player',
  MULTIPLAYER = 'multiplayer',
  TOURNAMENT = 'tournament',
  PRACTICE = 'practice',
}

/**
 * ⚙️ Configuración de juego por tipo
 */
export interface GameConfig {
  // Configuración general
  timeLimit?: number; // Tiempo límite en segundos
  allowPause?: boolean;
  showHints?: boolean;
  randomizeQuestions?: boolean;
  
  // Configuración de puntuación
  basePoints?: number;
  timeBonus?: boolean;
  streakBonus?: boolean;
  penaltyForWrong?: number;
  
  // Configuración específica por tipo
  triviaConfig?: {
    questionsPerGame: number;
    multipleChoice: boolean;
    showCorrectAnswer: boolean;
    explanations: boolean;
  };
  
  crosswordConfig?: {
    gridSize: { width: number; height: number };
    showClueNumbers: boolean;
    allowChecking: boolean;
    revealLetters: boolean;
  };
  
  memoryConfig?: {
    cardPairs: number;
    flipTime: number;
    matchingType: 'image' | 'text' | 'mixed';
  };
  
  simulationConfig?: {
    scenarios: string[];
    decisionPoints: number;
    realTimeUpdates: boolean;
  };
}

/**
 * 🏆 Sistema de recompensas
 */
export interface RewardSystem {
  coinsPerCorrect: number;
  coinsPerCompletion: number;
  experiencePerCorrect: number;
  experiencePerCompletion: number;
  achievementIds: string[];
  bonusMultipliers: {
    perfectScore: number;
    fastCompletion: number;
    streak: number;
  };
}

/**
 * 📊 Estadísticas del juego
 */
export interface GameStats {
  totalPlays: number;
  uniquePlayers: number;
  averageScore: number;
  averageTime: number;
  completionRate: number;
  difficulty: {
    easy: number;
    medium: number;
    hard: number;
    expert: number;
  };
  ratings: {
    average: number;
    count: number;
    distribution: { [rating: number]: number };
  };
}

/**
 * 🎮 Entidad Game
 * 
 * Representa un juego educativo con toda su configuración y contenido.
 * Soporta múltiples tipos de juegos con configuraciones específicas.
 */
@Entity('games')
@Index(['type', 'status'])
@Index(['createdBy', 'status'])
@Index(['classroomId', 'status'])
@Index(['difficulty', 'type'])
export class Game {
  /**
   * 🔑 Identificador único del juego
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 🏷️ Título del juego
   */
  @Column({ type: 'varchar', length: 200 })
  title: string;

  /**
   * 📄 Descripción del juego
   */
  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * 🎮 Tipo de juego
   */
  @Column({
    type: 'enum',
    enum: GameType,
  })
  type: GameType;

  /**
   * 📊 Estado del juego
   */
  @Column({
    type: 'enum',
    enum: GameStatus,
    default: GameStatus.DRAFT,
  })
  status: GameStatus;

  /**
   * 🎯 Nivel de dificultad
   */
  @Column({
    type: 'enum',
    enum: DifficultyLevel,
    default: DifficultyLevel.MEDIUM,
  })
  difficulty: DifficultyLevel;

  /**
   * 🎲 Modo de juego
   */
  @Column({
    type: 'enum',
    enum: GameMode,
    default: GameMode.SINGLE_PLAYER,
  })
  mode: GameMode;

  /**
   * 👤 ID del creador del juego
   */
  @Column({ type: 'uuid' })
  @Index()
  createdBy: string;

  /**
   * 🏫 ID del aula asociada (opcional)
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  classroomId: string;

  /**
   * 📚 Materia o tema
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index()
  subject: string;

  /**
   * 🏷️ Etiquetas para categorización
   */
  @Column({
    type: 'jsonb',
    default: [],
  })
  tags: string[];

  /**
   * 🎨 Imagen de portada del juego
   */
  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnail: string;

  /**
   * ⚙️ Configuración del juego
   */
  @Column({
    type: 'jsonb',
    default: {},
  })
  config: GameConfig;

  /**
   * 🎮 Contenido del juego (preguntas, datos, etc.)
   */
  @Column({
    type: 'jsonb',
    default: {},
  })
  content: any;

  /**
   * 🏆 Sistema de recompensas
   */
  @Column({
    type: 'jsonb',
    default: {
      coinsPerCorrect: 10,
      coinsPerCompletion: 50,
      experiencePerCorrect: 25,
      experiencePerCompletion: 100,
      achievementIds: [],
      bonusMultipliers: {
        perfectScore: 2.0,
        fastCompletion: 1.5,
        streak: 1.2,
      },
    },
  })
  rewards: RewardSystem;

  /**
   * 📊 Estadísticas del juego
   */
  @Column({
    type: 'jsonb',
    default: {
      totalPlays: 0,
      uniquePlayers: 0,
      averageScore: 0,
      averageTime: 0,
      completionRate: 0,
      difficulty: { easy: 0, medium: 0, hard: 0, expert: 0 },
      ratings: { average: 0, count: 0, distribution: {} },
    },
  })
  stats: GameStats;

  /**
   * ⏱️ Tiempo estimado de juego (minutos)
   */
  @Column({ type: 'integer', default: 15 })
  estimatedDuration: number;

  /**
   * 🏆 Puntuación máxima posible
   */
  @Column({ type: 'integer', default: 1000 })
  maxScore: number;

  /**
   * 🎯 Puntuación mínima para aprobar
   */
  @Column({ type: 'integer', default: 600 })
  passingScore: number;

  /**
   * 🔄 Número máximo de intentos permitidos
   */
  @Column({ type: 'integer', default: 3 })
  maxAttempts: number;

  /**
   * 🌟 Calificación promedio (1-5)
   */
  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  /**
   * 👀 Número de veces jugado
   */
  @Column({ type: 'integer', default: 0 })
  playCount: number;

  /**
   * ❤️ Número de "me gusta"
   */
  @Column({ type: 'integer', default: 0 })
  likes: number;

  /**
   * 💬 Permitir comentarios
   */
  @Column({ type: 'boolean', default: true })
  allowComments: boolean;

  /**
   * 🌍 Juego público (visible para todos)
   */
  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  /**
   * ⭐ Juego destacado
   */
  @Column({ type: 'boolean', default: false })
  isFeatured: boolean;

  /**
   * 📅 Fecha de publicación
   */
  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

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
   * 🎯 Resultados de juego
   */
  @OneToMany('GameResult', (gameResult: any) => gameResult.game, {
    cascade: true,
  })
  results: any[];

  /**
   * 💬 Comentarios del juego
   */
  @OneToMany('GameComment', (comment: any) => comment.game, {
    cascade: true,
  })
  comments: any[];

  /**
   * ⭐ Calificaciones del juego
   */
  @OneToMany('GameRating', (rating: any) => rating.game, {
    cascade: true,
  })
  ratings: any[];

  // =============================================================================
  // MÉTODOS DE NEGOCIO
  // =============================================================================

  /**
   * 🎯 Verificar si el juego está disponible para jugar
   */
  isPlayable(): boolean {
    return this.status === GameStatus.ACTIVE && 
           this.publishedAt !== null && 
           this.publishedAt <= new Date();
  }

  /**
   * 👤 Verificar si un usuario puede jugar este juego
   */
  canUserPlay(userId: string, userRole: string): boolean {
    // El juego debe estar disponible
    if (!this.isPlayable()) {
      return false;
    }

    // Si es público, cualquiera puede jugar
    if (this.isPublic) {
      return true;
    }

    // Si es del aula, solo participantes del aula
    if (this.classroomId) {
      // TODO: Verificar membresía del aula
      return true;
    }

    // Si es del creador
    if (this.createdBy === userId) {
      return true;
    }

    // Profesores y admins pueden jugar cualquier juego
    if (userRole === 'teacher' || userRole === 'admin') {
      return true;
    }

    return false;
  }

  /**
   * ✏️ Verificar si un usuario puede editar este juego
   */
  canUserEdit(userId: string, userRole: string): boolean {
    // El creador siempre puede editar
    if (this.createdBy === userId) {
      return true;
    }

    // Admins pueden editar cualquier juego
    if (userRole === 'admin') {
      return true;
    }

    return false;
  }

  /**
   * 📊 Actualizar estadísticas del juego
   */
  updateStats(gameResult: any): void {
    this.stats.totalPlays++;
    this.playCount = this.stats.totalPlays;

    // Actualizar promedio de puntuación
    if (this.stats.totalPlays === 1) {
      this.stats.averageScore = gameResult.score;
      this.stats.averageTime = gameResult.timeSpent;
    } else {
      this.stats.averageScore = 
        (this.stats.averageScore * (this.stats.totalPlays - 1) + gameResult.score) / this.stats.totalPlays;
      this.stats.averageTime = 
        (this.stats.averageTime * (this.stats.totalPlays - 1) + gameResult.timeSpent) / this.stats.totalPlays;
    }

    // Actualizar tasa de completitud
    if (gameResult.completed) {
      const completedGames = Math.floor(this.stats.completionRate * (this.stats.totalPlays - 1) / 100) + 1;
      this.stats.completionRate = (completedGames / this.stats.totalPlays) * 100;
    }

    // Actualizar estadísticas de dificultad
    this.stats.difficulty[gameResult.difficulty as keyof typeof this.stats.difficulty]++;
  }

  /**
   * ⭐ Actualizar calificación del juego
   */
  updateRating(rating: number): void {
    if (this.stats.ratings.count === 0) {
      this.stats.ratings.average = rating;
    } else {
      this.stats.ratings.average = 
        (this.stats.ratings.average * this.stats.ratings.count + rating) / (this.stats.ratings.count + 1);
    }

    this.stats.ratings.count++;
    
    // Actualizar distribución
    if (!this.stats.ratings.distribution[rating]) {
      this.stats.ratings.distribution[rating] = 0;
    }
    this.stats.ratings.distribution[rating]++;

    this.averageRating = this.stats.ratings.average;
  }

  /**
   * 🎨 Obtener color representativo según tipo de juego
   */
  getTypeColor(): string {
    switch (this.type) {
      case GameType.TRIVIA:
        return '#3B82F6'; // Azul
      case GameType.CROSSWORD:
        return '#10B981'; // Verde
      case GameType.MEMORY:
        return '#8B5CF6'; // Púrpura
      case GameType.SIMULATION:
        return '#F59E0B'; // Ámbar
      case GameType.PUZZLE:
        return '#EF4444'; // Rojo
      case GameType.DRAG_DROP:
        return '#06B6D4'; // Cian
      default:
        return '#6B7280'; // Gris
    }
  }

  /**
   * 🏷️ Obtener emoji representativo
   */
  getTypeEmoji(): string {
    switch (this.type) {
      case GameType.TRIVIA:
        return '🧠';
      case GameType.CROSSWORD:
        return '📝';
      case GameType.MEMORY:
        return '🧩';
      case GameType.SIMULATION:
        return '🎮';
      case GameType.PUZZLE:
        return '🧩';
      case GameType.DRAG_DROP:
        return '🎯';
      default:
        return '🎲';
    }
  }

  /**
   * 🎯 Obtener texto de dificultad
   */
  getDifficultyText(): string {
    switch (this.difficulty) {
      case DifficultyLevel.EASY:
        return 'Fácil';
      case DifficultyLevel.MEDIUM:
        return 'Medio';
      case DifficultyLevel.HARD:
        return 'Difícil';
      case DifficultyLevel.EXPERT:
        return 'Experto';
      default:
        return 'Medio';
    }
  }

  /**
   * ✨ Serialización para API
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      type: this.type,
      status: this.status,
      difficulty: this.difficulty,
      difficultyText: this.getDifficultyText(),
      mode: this.mode,
      createdBy: this.createdBy,
      classroomId: this.classroomId,
      subject: this.subject,
      tags: this.tags,
      thumbnail: this.thumbnail,
      config: this.config,
      content: this.content,
      rewards: this.rewards,
      stats: this.stats,
      estimatedDuration: this.estimatedDuration,
      maxScore: this.maxScore,
      passingScore: this.passingScore,
      maxAttempts: this.maxAttempts,
      averageRating: this.averageRating,
      playCount: this.playCount,
      likes: this.likes,
      allowComments: this.allowComments,
      isPublic: this.isPublic,
      isFeatured: this.isFeatured,
      publishedAt: this.publishedAt,
      typeColor: this.getTypeColor(),
      typeEmoji: this.getTypeEmoji(),
      isPlayable: this.isPlayable(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}