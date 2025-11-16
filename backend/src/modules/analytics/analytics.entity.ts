/**
 * 📊 ENTIDADES DE ANALYTICS - MÉTRICAS Y REPORTES
 * 
 * Entidades para almacenar y procesar datos de analytics:
 * - Métricas de actividades completadas
 * - Progreso estudiantil por aulas
 * - Estadísticas de gamificación
 * - Reportes de rendimiento académico
 * - Métricas de uso de la plataforma
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Cada entidad tiene una responsabilidad específica
 * - OCP: Extensible para nuevos tipos de métricas
 * - LSP: Implementa contratos bien definidos
 * - ISP: Interfaces específicas por funcionalidad
 * - DIP: Usa abstracciones para flexibilidad
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
} from 'typeorm';
import { User } from '../users/user.entity';
import { Classroom } from '../classrooms/classroom.entity';

/**
 * Tipos de métricas disponibles
 */
export enum MetricType {
  // 📚 Métricas de actividades
  ACTIVITY_COMPLETED = 'activity_completed',
  ACTIVITY_STARTED = 'activity_started',
  ACTIVITY_TIME_SPENT = 'activity_time_spent',
  ACTIVITY_SCORE = 'activity_score',
  ACTIVITY_ATTEMPTS = 'activity_attempts',

  // 🎮 Métricas de juegos
  GAME_PLAYED = 'game_played',
  GAME_COMPLETED = 'game_completed',
  GAME_SCORE = 'game_score',
  GAME_TIME = 'game_time',

  // 🏆 Métricas de gamificación
  POINTS_EARNED = 'points_earned',
  LEVEL_ACHIEVED = 'level_achieved',
  ACHIEVEMENT_UNLOCKED = 'achievement_unlocked',
  STREAK_COUNT = 'streak_count',

  // 👥 Métricas de aulas
  CLASSROOM_PARTICIPATION = 'classroom_participation',
  CLASSROOM_ATTENDANCE = 'classroom_attendance',
  CLASSROOM_ENGAGEMENT = 'classroom_engagement',

  // 🕐 Métricas de tiempo
  SESSION_DURATION = 'session_duration',
  DAILY_ACTIVE_TIME = 'daily_active_time',
  LOGIN_COUNT = 'login_count',

  // 📈 Métricas de progreso
  PROGRESS_PERCENTAGE = 'progress_percentage',
  SKILL_IMPROVEMENT = 'skill_improvement',
  LEARNING_VELOCITY = 'learning_velocity',
}

/**
 * Períodos de agregación
 */
export enum AggregationPeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
}

/**
 * Entidad principal de métricas
 * 
 * @description Almacena todas las métricas del sistema con
 * información detallada sobre usuarios, aulas y actividades.
 */
@Entity('analytics_metrics')
@Index(['userId', 'metricType', 'recordedAt'])
@Index(['classroomId', 'metricType', 'recordedAt'])
@Index(['metricType', 'aggregationPeriod', 'recordedAt'])
export class AnalyticsMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tipo de métrica
   */
  @Column({
    type: 'enum',
    enum: MetricType,
    comment: 'Tipo específico de métrica registrada',
  })
  metricType: MetricType;

  /**
   * Usuario asociado a la métrica
   */
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  /**
   * Aula asociada (opcional)
   */
  @ManyToOne(() => Classroom, { eager: false, nullable: true })
  @JoinColumn({ name: 'classroom_id' })
  classroom?: Classroom;

  @Column({ name: 'classroom_id', nullable: true })
  classroomId?: string;

  /**
   * Valor numérico de la métrica
   */
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 4,
    comment: 'Valor numérico de la métrica (puntos, tiempo, porcentaje, etc.)',
  })
  value: number;

  /**
   * Unidad de medida
   */
  @Column({
    type: 'varchar',
    length: 50,
    comment: 'Unidad de medida (seconds, points, percentage, count, etc.)',
  })
  unit: string;

  /**
   * Contexto adicional en JSON
   */
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Contexto adicional específico de la métrica',
  })
  context?: {
    activityId?: string;
    gameId?: string;
    achievementId?: string;
    difficulty?: string;
    subject?: string;
    chapter?: string;
    sessionId?: string;
    deviceType?: string;
    userAgent?: string;
    [key: string]: any;
  };

  /**
   * Período de agregación
   */
  @Column({
    type: 'enum',
    enum: AggregationPeriod,
    default: AggregationPeriod.DAILY,
    comment: 'Período para agregación de datos',
  })
  aggregationPeriod: AggregationPeriod;

  /**
   * Fecha y hora de registro
   */
  @Column({
    type: 'timestamp with time zone',
    comment: 'Momento exacto cuando ocurrió la métrica',
  })
  recordedAt: Date;

  /**
   * Fecha de creación del registro
   */
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  /**
   * Fecha de actualización
   */
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/**
 * Entidad para reportes pre-calculados
 */
@Entity('analytics_reports')
@Index(['userId', 'reportType', 'periodStart'])
@Index(['classroomId', 'reportType', 'periodStart'])
export class AnalyticsReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Tipo de reporte
   */
  @Column({
    type: 'varchar',
    length: 100,
    comment: 'Tipo de reporte (student_progress, classroom_summary, etc.)',
  })
  reportType: string;

  /**
   * Usuario asociado (opcional)
   */
  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  /**
   * Aula asociada (opcional)
   */
  @ManyToOne(() => Classroom, { eager: false, nullable: true })
  @JoinColumn({ name: 'classroom_id' })
  classroom?: Classroom;

  @Column({ name: 'classroom_id', nullable: true })
  classroomId?: string;

  /**
   * Datos del reporte en JSON
   */
  @Column({
    type: 'jsonb',
    comment: 'Datos completos del reporte pre-calculado',
  })
  reportData: {
    summary: Record<string, any>;
    metrics: Record<string, any>;
    charts: Record<string, any>;
    insights: string[];
    recommendations?: string[];
    [key: string]: any;
  };

  /**
   * Período de inicio
   */
  @Column({
    type: 'timestamp with time zone',
    comment: 'Inicio del período cubierto por el reporte',
  })
  periodStart: Date;

  /**
   * Período de fin
   */
  @Column({
    type: 'timestamp with time zone',
    comment: 'Fin del período cubierto por el reporte',
  })
  periodEnd: Date;

  /**
   * Estado del reporte
   */
  @Column({
    type: 'enum',
    enum: ['generating', 'completed', 'failed'],
    default: 'generating',
    comment: 'Estado actual del reporte',
  })
  status: 'generating' | 'completed' | 'failed';

  /**
   * Información de error si falló
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: 'Información de error si la generación falló',
  })
  errorMessage?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

/**
 * Entidad para dashboards personalizados
 */
@Entity('analytics_dashboards')
@Index(['userId', 'isActive'])
export class AnalyticsDashboard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Nombre del dashboard
   */
  @Column({
    type: 'varchar',
    length: 200,
    comment: 'Nombre descriptivo del dashboard',
  })
  name: string;

  /**
   * Descripción
   */
  @Column({
    type: 'text',
    nullable: true,
    comment: 'Descripción del propósito del dashboard',
  })
  description?: string;

  /**
   * Usuario propietario
   */
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  /**
   * Configuración del dashboard
   */
  @Column({
    type: 'jsonb',
    comment: 'Configuración completa del dashboard (widgets, layout, filtros)',
  })
  configuration: {
    layout: {
      rows: number;
      columns: number;
    };
    widgets: Array<{
      id: string;
      type: string;
      title: string;
      position: { x: number; y: number; width: number; height: number };
      config: Record<string, any>;
      dataSource: string;
      filters?: Record<string, any>;
    }>;
    globalFilters?: Record<string, any>;
    refreshInterval?: number;
    theme?: string;
  };

  /**
   * Dashboard público o privado
   */
  @Column({
    type: 'boolean',
    default: false,
    comment: 'Si el dashboard es público (visible para otros usuarios)',
  })
  isPublic: boolean;

  /**
   * Dashboard activo
   */
  @Column({
    type: 'boolean',
    default: true,
    comment: 'Si el dashboard está activo y visible',
  })
  isActive: boolean;

  /**
   * Dashboard predeterminado del usuario
   */
  @Column({
    type: 'boolean',
    default: false,
    comment: 'Si es el dashboard predeterminado del usuario',
  })
  isDefault: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}