/**
 * 📊 ENTIDAD STUDENT ANALYTICS - ANÁLISIS DE ESTUDIANTES
 * 
 * Entidad que almacena métricas y estadísticas de rendimiento de estudiantes.
 * Incluye progreso académico, actividad en plataforma y análisis temporal.
 * 
 * MÉTRICAS INCLUIDAS:
 * - Rendimiento académico por materia
 * - Tiempo de estudio y actividad
 * - Progreso en actividades y juegos
 * - Patrones de aprendizaje
 * - Comparativas y rankings
 * 
 * FUNCIONALIDADES:
 * - Análisis temporal (diario, semanal, mensual)
 * - Comparativas con promedios de grupo
 * - Identificación de fortalezas y debilidades
 * - Recomendaciones personalizadas
 * - Alertas de rendimiento
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
  Unique,
} from 'typeorm';

/**
 * 📋 Enumeraciones para tipado fuerte
 */
export enum AnalyticsPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

export enum PerformanceLevel {
  EXCELLENT = 'excellent',     // 90-100%
  GOOD = 'good',              // 75-89%
  AVERAGE = 'average',        // 60-74%
  BELOW_AVERAGE = 'below_average', // 40-59%
  POOR = 'poor',              // 0-39%
}

export enum ActivityType {
  LESSON = 'lesson',
  QUIZ = 'quiz',
  GAME = 'game',
  ASSIGNMENT = 'assignment',
  PROJECT = 'project',
  DISCUSSION = 'discussion',
}

/**
 * 📊 Métricas de rendimiento por materia
 */
export interface SubjectMetrics {
  subjectId: string;
  subjectName: string;
  averageScore: number;
  completedActivities: number;
  totalActivities: number;
  completionRate: number;
  timeSpent: number; // En minutos
  lastActivity: Date;
  performanceLevel: PerformanceLevel;
  strongTopics: string[];
  weakTopics: string[];
}

/**
 * 📈 Métricas de actividad en plataforma
 */
export interface PlatformActivityMetrics {
  sessionsCount: number;
  totalTimeSpent: number; // En minutos
  averageSessionDuration: number; // En minutos
  loginStreak: number; // Días consecutivos
  lastLogin: Date;
  mostActiveHour: number; // 0-23
  mostActiveDay: string; // Monday, Tuesday, etc.
  deviceUsage: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
}

/**
 * 🎮 Métricas de juegos educativos
 */
export interface GameMetrics {
  totalGamesPlayed: number;
  averageScore: number;
  bestScore: number;
  favoriteGameType: string;
  completionRate: number;
  timeSpent: number; // En minutos
  achievements: number;
  level: number;
  experiencePoints: number;
}

/**
 * 📚 Métricas de aprendizaje
 */
export interface LearningMetrics {
  conceptsMastered: number;
  conceptsInProgress: number;
  conceptsStruggling: number;
  learningVelocity: number; // Conceptos por semana
  retentionRate: number; // Porcentaje
  preferredLearningStyle: string;
  attentionSpan: number; // Minutos promedio
  errorPatterns: string[];
}

/**
 * 🏆 Métricas de gamificación
 */
export interface GamificationMetrics {
  totalCoins: number;
  coinsEarned: number;
  coinsSpent: number;
  level: number;
  experience: number;
  achievementsUnlocked: number;
  badgesEarned: number;
  streaks: {
    current: number;
    longest: number;
  };
  leaderboardPosition: number;
}

/**
 * 📊 Entidad StudentAnalytics
 * 
 * Almacena todas las métricas y análisis de un estudiante para un período específico.
 * Permite análisis temporal y comparativo del rendimiento estudiantil.
 */
@Entity('student_analytics')
@Index(['userId', 'period', 'periodDate'])
@Index(['classroomId', 'period', 'periodDate'])
@Index(['periodDate', 'period'])
@Unique(['userId', 'period', 'periodDate'])
export class StudentAnalytics {
  /**
   * 🔑 Identificador único del registro analítico
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 👤 ID del estudiante
   */
  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  /**
   * 📝 Nombre del estudiante (desnormalizado para performance)
   */
  @Column({ type: 'varchar', length: 100 })
  userName: string;

  /**
   * 🏫 ID del aula (opcional)
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  classroomId: string;

  /**
   * 📅 Período de análisis
   */
  @Column({
    type: 'enum',
    enum: AnalyticsPeriod,
    default: AnalyticsPeriod.DAILY,
  })
  period: AnalyticsPeriod;

  /**
   * 📆 Fecha del período analizado
   */
  @Column({ type: 'date' })
  @Index()
  periodDate: Date;

  /**
   * 📚 Métricas por materia
   */
  @Column({
    type: 'jsonb',
    default: [],
  })
  subjectMetrics: SubjectMetrics[];

  /**
   * 💻 Métricas de actividad en plataforma
   */
  @Column({
    type: 'jsonb',
    default: {
      sessionsCount: 0,
      totalTimeSpent: 0,
      averageSessionDuration: 0,
      loginStreak: 0,
      lastLogin: null,
      mostActiveHour: 12,
      mostActiveDay: 'Monday',
      deviceUsage: { desktop: 0, mobile: 0, tablet: 0 },
    },
  })
  platformActivity: PlatformActivityMetrics;

  /**
   * 🎮 Métricas de juegos
   */
  @Column({
    type: 'jsonb',
    default: {
      totalGamesPlayed: 0,
      averageScore: 0,
      bestScore: 0,
      favoriteGameType: '',
      completionRate: 0,
      timeSpent: 0,
      achievements: 0,
      level: 1,
      experiencePoints: 0,
    },
  })
  gameMetrics: GameMetrics;

  /**
   * 🧠 Métricas de aprendizaje
   */
  @Column({
    type: 'jsonb',
    default: {
      conceptsMastered: 0,
      conceptsInProgress: 0,
      conceptsStruggling: 0,
      learningVelocity: 0,
      retentionRate: 0,
      preferredLearningStyle: 'visual',
      attentionSpan: 15,
      errorPatterns: [],
    },
  })
  learningMetrics: LearningMetrics;

  /**
   * 🏆 Métricas de gamificación
   */
  @Column({
    type: 'jsonb',
    default: {
      totalCoins: 0,
      coinsEarned: 0,
      coinsSpent: 0,
      level: 1,
      experience: 0,
      achievementsUnlocked: 0,
      badgesEarned: 0,
      streaks: { current: 0, longest: 0 },
      leaderboardPosition: 0,
    },
  })
  gamificationMetrics: GamificationMetrics;

  /**
   * 📊 Puntuación general del período
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  overallScore: number;

  /**
   * 🎯 Nivel de rendimiento general
   */
  @Column({
    type: 'enum',
    enum: PerformanceLevel,
    default: PerformanceLevel.AVERAGE,
  })
  performanceLevel: PerformanceLevel;

  /**
   * ⏱️ Tiempo total activo en el período (minutos)
   */
  @Column({ type: 'integer', default: 0 })
  totalActiveTime: number;

  /**
   * 🎯 Actividades completadas en el período
   */
  @Column({ type: 'integer', default: 0 })
  activitiesCompleted: number;

  /**
   * 📈 Tasa de mejora respecto al período anterior (porcentaje)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  improvementRate: number;

  /**
   * 🎪 Rango en el aula (posición)
   */
  @Column({ type: 'integer', nullable: true })
  classroomRank: number;

  /**
   * 📊 Percentil en el aula (0-100)
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  classroomPercentile: number;

  /**
   * 🎯 Objetivos del período
   */
  @Column({
    type: 'jsonb',
    default: [],
  })
  goals: {
    id: string;
    description: string;
    targetValue: number;
    currentValue: number;
    completed: boolean;
    deadline: Date;
  }[];

  /**
   * ⚠️ Alertas y recomendaciones
   */
  @Column({
    type: 'jsonb',
    default: [],
  })
  alerts: {
    type: 'warning' | 'success' | 'info' | 'danger';
    message: string;
    priority: 'low' | 'medium' | 'high';
    actionRequired: boolean;
    createdAt: Date;
  }[];

  /**
   * 📝 Notas del profesor
   */
  @Column({ type: 'text', nullable: true })
  teacherNotes: string;

  /**
   * 🔄 Estado de procesamiento
   */
  @Column({ type: 'boolean', default: false })
  isProcessed: boolean;

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
  // MÉTODOS DE NEGOCIO
  // =============================================================================

  /**
   * 📊 Calcular puntuación general basada en todas las métricas
   */
  calculateOverallScore(): number {
    let totalScore = 0;
    let weightSum = 0;

    // Peso por categoría
    const weights = {
      subjects: 0.4,      // 40% - Rendimiento académico
      platform: 0.2,     // 20% - Actividad en plataforma
      games: 0.15,       // 15% - Juegos educativos
      learning: 0.15,    // 15% - Métricas de aprendizaje
      gamification: 0.1, // 10% - Gamificación
    };

    // Puntuación de materias (promedio ponderado)
    if (this.subjectMetrics.length > 0) {
      const subjectScore = this.subjectMetrics.reduce((acc, subject) => 
        acc + subject.averageScore, 0) / this.subjectMetrics.length;
      totalScore += subjectScore * weights.subjects;
      weightSum += weights.subjects;
    }

    // Puntuación de actividad (basada en tiempo y consistencia)
    const platformScore = Math.min(100, 
      (this.platformActivity.sessionsCount * 10) + 
      (this.platformActivity.loginStreak * 5) +
      Math.min(50, this.platformActivity.totalTimeSpent / 10)
    );
    totalScore += platformScore * weights.platform;
    weightSum += weights.platform;

    // Puntuación de juegos
    const gameScore = Math.min(100, this.gameMetrics.averageScore || 0);
    totalScore += gameScore * weights.games;
    weightSum += weights.games;

    // Puntuación de aprendizaje
    const learningScore = Math.min(100, 
      (this.learningMetrics.conceptsMastered * 5) +
      (this.learningMetrics.retentionRate || 0)
    );
    totalScore += learningScore * weights.learning;
    weightSum += weights.learning;

    // Puntuación de gamificación (normalizada)
    const gamificationScore = Math.min(100, 
      (this.gamificationMetrics.level * 10) +
      (this.gamificationMetrics.achievementsUnlocked * 2)
    );
    totalScore += gamificationScore * weights.gamification;
    weightSum += weights.gamification;

    this.overallScore = weightSum > 0 ? totalScore / weightSum : 0;
    return this.overallScore;
  }

  /**
   * 🎯 Determinar nivel de rendimiento basado en puntuación
   */
  updatePerformanceLevel(): void {
    const score = this.overallScore;

    if (score >= 90) {
      this.performanceLevel = PerformanceLevel.EXCELLENT;
    } else if (score >= 75) {
      this.performanceLevel = PerformanceLevel.GOOD;
    } else if (score >= 60) {
      this.performanceLevel = PerformanceLevel.AVERAGE;
    } else if (score >= 40) {
      this.performanceLevel = PerformanceLevel.BELOW_AVERAGE;
    } else {
      this.performanceLevel = PerformanceLevel.POOR;
    }
  }

  /**
   * ⚠️ Generar alertas automáticas basadas en métricas
   */
  generateAlerts(): void {
    this.alerts = [];
    const now = new Date();

    // Alerta por bajo rendimiento
    if (this.overallScore < 60) {
      this.alerts.push({
        type: 'warning',
        message: 'Rendimiento por debajo del promedio esperado',
        priority: 'high',
        actionRequired: true,
        createdAt: now,
      });
    }

    // Alerta por inactividad
    if (this.platformActivity.sessionsCount === 0) {
      this.alerts.push({
        type: 'danger',
        message: 'Sin actividad registrada en el período',
        priority: 'high',
        actionRequired: true,
        createdAt: now,
      });
    }

    // Alerta por baja participación en juegos
    if (this.gameMetrics.totalGamesPlayed === 0 && this.activitiesCompleted > 0) {
      this.alerts.push({
        type: 'info',
        message: 'No ha participado en juegos educativos',
        priority: 'low',
        actionRequired: false,
        createdAt: now,
      });
    }

    // Alerta de felicitación por excelente rendimiento
    if (this.overallScore >= 90 && this.improvementRate > 10) {
      this.alerts.push({
        type: 'success',
        message: '¡Excelente rendimiento y mejora continua!',
        priority: 'low',
        actionRequired: false,
        createdAt: now,
      });
    }
  }

  /**
   * 📈 Comparar con período anterior
   */
  compareWithPrevious(previousAnalytics: StudentAnalytics): void {
    if (previousAnalytics && previousAnalytics.overallScore > 0) {
      this.improvementRate = 
        ((this.overallScore - previousAnalytics.overallScore) / previousAnalytics.overallScore) * 100;
    } else {
      this.improvementRate = 0;
    }
  }

  /**
   * 🎯 Obtener color representativo según rendimiento
   */
  getPerformanceColor(): string {
    switch (this.performanceLevel) {
      case PerformanceLevel.EXCELLENT:
        return '#10B981'; // Verde
      case PerformanceLevel.GOOD:
        return '#3B82F6'; // Azul
      case PerformanceLevel.AVERAGE:
        return '#F59E0B'; // Amarillo
      case PerformanceLevel.BELOW_AVERAGE:
        return '#F97316'; // Naranja
      case PerformanceLevel.POOR:
        return '#EF4444'; // Rojo
      default:
        return '#6B7280'; // Gris
    }
  }

  /**
   * ✨ Serialización para API
   */
  toJSON() {
    return {
      id: this.id,
      userId: this.userId,
      userName: this.userName,
      classroomId: this.classroomId,
      period: this.period,
      periodDate: this.periodDate,
      subjectMetrics: this.subjectMetrics,
      platformActivity: this.platformActivity,
      gameMetrics: this.gameMetrics,
      learningMetrics: this.learningMetrics,
      gamificationMetrics: this.gamificationMetrics,
      overallScore: this.overallScore,
      performanceLevel: this.performanceLevel,
      performanceColor: this.getPerformanceColor(),
      totalActiveTime: this.totalActiveTime,
      activitiesCompleted: this.activitiesCompleted,
      improvementRate: this.improvementRate,
      classroomRank: this.classroomRank,
      classroomPercentile: this.classroomPercentile,
      goals: this.goals,
      alerts: this.alerts,
      teacherNotes: this.teacherNotes,
      isProcessed: this.isProcessed,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}