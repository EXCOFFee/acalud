/**
 * 🏆 ENTIDAD GAME RESULT - RESULTADOS DE JUEGOS
 * 
 * Entidad que almacena los resultados de cada partida jugada por los usuarios.
 * Registra puntuaciones, progreso, tiempo y métricas de rendimiento.
 * 
 * FUNCIONALIDADES:
 * - Seguimiento detallado de cada partida
 * - Métricas de rendimiento y progreso
 * - Análisis de respuestas y patrones
 * - Sistema de logros y recompensas
 * - Comparación y ranking
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
  JoinColumn,
  Index,
} from 'typeorm';

/**
 * 📋 Enumeraciones para tipado fuerte
 */
export enum GameResultStatus {
  IN_PROGRESS = 'in_progress',   // Partida en curso
  COMPLETED = 'completed',       // Completada normalmente
  ABANDONED = 'abandoned',       // Abandonada por el usuario
  TIMEOUT = 'timeout',           // Terminada por tiempo
  ERROR = 'error',               // Error durante la partida
}

export enum CompletionType {
  FULL = 'full',                 // Completado al 100%
  PARTIAL = 'partial',           // Completado parcialmente
  MINIMUM = 'minimum',           // Completado lo mínimo requerido
  PERFECT = 'perfect',           // Completado con puntuación perfecta
}

/**
 * 📊 Métricas detalladas de la partida
 */
export interface GameSessionMetrics {
  // Métricas de tiempo
  totalTime: number;               // Tiempo total en segundos
  activeTime: number;              // Tiempo activo (sin pausas)
  pauseTime: number;               // Tiempo en pausa
  averageResponseTime: number;     // Tiempo promedio de respuesta
  
  // Métricas de interacción
  totalClicks: number;             // Total de clics/toques
  totalKeystrokes: number;         // Total de teclas presionadas
  hintsUsed: number;               // Pistas utilizadas
  helpRequests: number;            // Veces que pidió ayuda
  
  // Métricas de progreso
  questionsAnswered: number;       // Preguntas respondidas
  correctAnswers: number;          // Respuestas correctas
  incorrectAnswers: number;        // Respuestas incorrectas
  skippedQuestions: number;        // Preguntas omitidas
  
  // Métricas de rendimiento
  accuracyRate: number;            // Tasa de precisión (%)
  streakBest: number;              // Mejor racha de aciertos
  streakCurrent: number;           // Racha actual
  difficultyProgression: string[]; // Progresión de dificultad
}

/**
 * 🎯 Análisis de respuestas
 */
export interface AnswerAnalysis {
  questionId: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  responseTime: number;
  attempts: number;
  hintsUsed: number;
  confidence: number; // 1-5
  topic: string;
  difficulty: string;
}

/**
 * 🏆 Logros obtenidos durante la partida
 */
export interface AchievementEarned {
  achievementId: string;
  name: string;
  description: string;
  points: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt: Date;
}

/**
 * 💰 Recompensas obtenidas
 */
export interface RewardsSummary {
  coinsEarned: number;
  experienceGained: number;
  pointsScored: number;
  bonusMultiplier: number;
  achievements: AchievementEarned[];
  levelUps: {
    category: string;
    fromLevel: number;
    toLevel: number;
  }[];
}

/**
 * 🏆 Entidad GameResult
 * 
 * Almacena el resultado completo de una partida de juego educativo.
 */
@Entity('game_results')
@Index(['gameId', 'userId'])
@Index(['userId', 'createdAt'])
@Index(['gameId', 'score'])
@Index(['status', 'createdAt'])
export class GameResult {
  /**
   * 🔑 Identificador único del resultado
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 🎮 ID del juego
   */
  @Column({ type: 'uuid' })
  @Index()
  gameId: string;

  /**
   * 👤 ID del usuario/jugador
   */
  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  /**
   * 📊 Estado del resultado
   */
  @Column({
    type: 'enum',
    enum: GameResultStatus,
  })
  status: GameResultStatus;

  /**
   * ✅ Tipo de completitud
   */
  @Column({
    type: 'enum',
    enum: CompletionType,
    nullable: true,
  })
  completionType: CompletionType;

  /**
   * 🎯 Puntuación obtenida
   */
  @Column({ type: 'integer', default: 0 })
  @Index()
  score: number;

  /**
   * 🏆 Puntuación máxima posible
   */
  @Column({ type: 'integer' })
  maxScore: number;

  /**
   * 📊 Porcentaje de acierto
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  accuracyPercentage: number;

  /**
   * ⏱️ Tiempo total empleado (segundos)
   */
  @Column({ type: 'integer', default: 0 })
  timeSpent: number;

  /**
   * ⏰ Tiempo límite del juego (segundos)
   */
  @Column({ type: 'integer', nullable: true })
  timeLimit: number;

  /**
   * 🔢 Número de intento
   */
  @Column({ type: 'integer', default: 1 })
  attemptNumber: number;

  /**
   * ✅ Juego completado
   */
  @Column({ type: 'boolean', default: false })
  completed: boolean;

  /**
   * 🎖️ Aprobado (score >= passingScore)
   */
  @Column({ type: 'boolean', default: false })
  passed: boolean;

  /**
   * 🌟 Puntuación perfecta
   */
  @Column({ type: 'boolean', default: false })
  perfectScore: boolean;

  /**
   * 🔥 Mejor racha de aciertos consecutivos
   */
  @Column({ type: 'integer', default: 0 })
  bestStreak: number;

  /**
   * 💰 Monedas ganadas
   */
  @Column({ type: 'integer', default: 0 })
  coinsEarned: number;

  /**
   * ⭐ Experiencia ganada
   */
  @Column({ type: 'integer', default: 0 })
  experienceGained: number;

  /**
   * 📈 Nivel antes de jugar
   */
  @Column({ type: 'integer', default: 1 })
  levelBefore: number;

  /**
   * 📈 Nivel después de jugar
   */
  @Column({ type: 'integer', default: 1 })
  levelAfter: number;

  /**
   * 🎯 Dificultad jugada
   */
  @Column({ type: 'varchar', length: 20 })
  difficulty: string;

  /**
   * 🎲 Modo de juego utilizado
   */
  @Column({ type: 'varchar', length: 50 })
  gameMode: string;

  /**
   * 🌐 Plataforma/dispositivo usado
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  platform: string;

  /**
   * 📱 Información del navegador/app
   */
  @Column({ type: 'varchar', length: 200, nullable: true })
  userAgent: string;

  /**
   * 📊 Métricas detalladas de la sesión
   */
  @Column({
    type: 'jsonb',
    default: {},
  })
  metrics: GameSessionMetrics;

  /**
   * 📝 Análisis detallado de respuestas
   */
  @Column({
    type: 'jsonb',
    default: [],
  })
  answerAnalysis: AnswerAnalysis[];

  /**
   * 🏆 Logros desbloqueados en esta partida
   */
  @Column({
    type: 'jsonb',
    default: [],
  })
  achievementsEarned: AchievementEarned[];

  /**
   * 💎 Resumen de recompensas
   */
  @Column({
    type: 'jsonb',
    default: {},
  })
  rewardsSummary: RewardsSummary;

  /**
   * 📋 Datos específicos del tipo de juego
   */
  @Column({
    type: 'jsonb',
    default: {},
  })
  gameSpecificData: any;

  /**
   * 💬 Comentario del jugador (opcional)
   */
  @Column({ type: 'text', nullable: true })
  playerComment: string;

  /**
   * ⭐ Calificación del juego (1-5)
   */
  @Column({ type: 'integer', nullable: true })
  gameRating: number;

  /**
   * 🔄 Número de pausas
   */
  @Column({ type: 'integer', default: 0 })
  pauseCount: number;

  /**
   * 💡 Pistas utilizadas
   */
  @Column({ type: 'integer', default: 0 })
  hintsUsed: number;

  /**
   * ❓ Ayudas solicitadas
   */
  @Column({ type: 'integer', default: 0 })
  helpRequests: number;

  /**
   * 📱 Sesión multijugador (opcional)
   */
  @Column({ type: 'uuid', nullable: true })
  multiplayerSessionId: string;

  /**
   * 🏅 Posición en ranking (multijugador)
   */
  @Column({ type: 'integer', nullable: true })
  rankPosition: number;

  /**
   * ⏰ Fecha de inicio de la partida
   */
  @Column({ type: 'timestamp' })
  startedAt: Date;

  /**
   * 🏁 Fecha de finalización
   */
  @Column({ type: 'timestamp', nullable: true })
  finishedAt: Date;

  /**
   * 📅 Fecha de creación del registro
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
   * 🎮 Relación con el juego
   */
  @ManyToOne('Game', (game: any) => game.results)
  @JoinColumn({ name: 'gameId' })
  game: any;

  // =============================================================================
  // MÉTODOS DE NEGOCIO
  // =============================================================================

  /**
   * 📊 Calcular porcentaje de precisión
   */
  calculateAccuracy(): number {
    if (!this.metrics || this.metrics.questionsAnswered === 0) {
      return 0;
    }

    const accuracy = (this.metrics.correctAnswers / this.metrics.questionsAnswered) * 100;
    this.accuracyPercentage = Math.round(accuracy * 100) / 100;
    return this.accuracyPercentage;
  }

  /**
   * ⏱️ Calcular tiempo efectivo de juego
   */
  calculateEffectiveTime(): number {
    if (!this.metrics) {
      return this.timeSpent;
    }

    return this.metrics.activeTime || this.timeSpent;
  }

  /**
   * 🎯 Verificar si es un resultado excepcional
   */
  isExceptionalResult(): boolean {
    return this.perfectScore || 
           this.accuracyPercentage >= 95 ||
           this.bestStreak >= 10 ||
           (this.timeLimit && this.timeSpent <= this.timeLimit * 0.5);
  }

  /**
   * 📈 Obtener nivel de rendimiento
   */
  getPerformanceLevel(): string {
    if (this.perfectScore) return 'PERFECTO';
    if (this.accuracyPercentage >= 90) return 'EXCELENTE';
    if (this.accuracyPercentage >= 80) return 'MUY_BUENO';
    if (this.accuracyPercentage >= 70) return 'BUENO';
    if (this.accuracyPercentage >= 60) return 'REGULAR';
    return 'NECESITA_MEJORAR';
  }

  /**
   * 🏆 Determinar si merece insignia especial
   */
  shouldEarnSpecialBadge(): { earned: boolean; badge?: string; reason?: string } {
    // Insignia de velocidad
    if (this.timeLimit && this.timeSpent <= this.timeLimit * 0.3 && this.passed) {
      return { earned: true, badge: 'LIGHTNING_FAST', reason: 'Completado en tiempo récord' };
    }

    // Insignia de perfección
    if (this.perfectScore && this.hintsUsed === 0) {
      return { earned: true, badge: 'FLAWLESS', reason: 'Puntuación perfecta sin ayuda' };
    }

    // Insignia de persistencia
    if (this.attemptNumber >= 5 && this.passed) {
      return { earned: true, badge: 'PERSISTENT', reason: 'Superado tras múltiples intentos' };
    }

    // Insignia de racha
    if (this.bestStreak >= 15) {
      return { earned: true, badge: 'STREAK_MASTER', reason: 'Racha excepcional de aciertos' };
    }

    return { earned: false };
  }

  /**
   * 📊 Generar resumen de rendimiento
   */
  generatePerformanceSummary(): any {
    return {
      overall: {
        score: this.score,
        maxScore: this.maxScore,
        percentage: Math.round((this.score / this.maxScore) * 100),
        passed: this.passed,
        performanceLevel: this.getPerformanceLevel(),
      },
      time: {
        total: this.timeSpent,
        effective: this.calculateEffectiveTime(),
        average: this.metrics?.averageResponseTime || 0,
        efficiency: this.timeLimit ? Math.round((1 - this.timeSpent / this.timeLimit) * 100) : null,
      },
      accuracy: {
        percentage: this.accuracyPercentage,
        correct: this.metrics?.correctAnswers || 0,
        incorrect: this.metrics?.incorrectAnswers || 0,
        total: this.metrics?.questionsAnswered || 0,
        bestStreak: this.bestStreak,
      },
      engagement: {
        hintsUsed: this.hintsUsed,
        helpRequests: this.helpRequests,
        pauseCount: this.pauseCount,
        completionType: this.completionType,
      },
      rewards: {
        coins: this.coinsEarned,
        experience: this.experienceGained,
        levelUp: this.levelAfter > this.levelBefore,
        achievements: this.achievementsEarned.length,
      },
      exceptional: this.isExceptionalResult(),
      specialBadge: this.shouldEarnSpecialBadge(),
    };
  }

  /**
   * 📈 Comparar con resultados anteriores
   */
  compareWithPrevious(previousResult: GameResult): any {
    if (!previousResult) {
      return { isFirst: true };
    }

    return {
      isFirst: false,
      improvement: {
        score: this.score - previousResult.score,
        accuracy: this.accuracyPercentage - previousResult.accuracyPercentage,
        time: previousResult.timeSpent - this.timeSpent, // Negativo si tardó más
        streak: this.bestStreak - previousResult.bestStreak,
      },
      trends: {
        scoreImproving: this.score > previousResult.score,
        accuracyImproving: this.accuracyPercentage > previousResult.accuracyPercentage,
        timeImproving: this.timeSpent < previousResult.timeSpent,
        streakImproving: this.bestStreak > previousResult.bestStreak,
      },
    };
  }

  /**
   * ✨ Serialización para API
   */
  toJSON() {
    return {
      id: this.id,
      gameId: this.gameId,
      userId: this.userId,
      status: this.status,
      completionType: this.completionType,
      score: this.score,
      maxScore: this.maxScore,
      accuracyPercentage: this.accuracyPercentage,
      timeSpent: this.timeSpent,
      timeLimit: this.timeLimit,
      attemptNumber: this.attemptNumber,
      completed: this.completed,
      passed: this.passed,
      perfectScore: this.perfectScore,
      bestStreak: this.bestStreak,
      coinsEarned: this.coinsEarned,
      experienceGained: this.experienceGained,
      levelBefore: this.levelBefore,
      levelAfter: this.levelAfter,
      difficulty: this.difficulty,
      gameMode: this.gameMode,
      platform: this.platform,
      metrics: this.metrics,
      answerAnalysis: this.answerAnalysis,
      achievementsEarned: this.achievementsEarned,
      rewardsSummary: this.rewardsSummary,
      gameSpecificData: this.gameSpecificData,
      playerComment: this.playerComment,
      gameRating: this.gameRating,
      pauseCount: this.pauseCount,
      hintsUsed: this.hintsUsed,
      helpRequests: this.helpRequests,
      multiplayerSessionId: this.multiplayerSessionId,
      rankPosition: this.rankPosition,
      startedAt: this.startedAt,
      finishedAt: this.finishedAt,
      performanceLevel: this.getPerformanceLevel(),
      isExceptional: this.isExceptionalResult(),
      performanceSummary: this.generatePerformanceSummary(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}