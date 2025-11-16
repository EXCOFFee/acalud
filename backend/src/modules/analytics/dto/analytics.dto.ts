/**
 * 📊 DTOs PARA ANALYTICS - VALIDACIÓN Y TRANSFERENCIA DE DATOS
 * 
 * Data Transfer Objects para el módulo de analytics:
 * - Creación de métricas
 * - Filtros de reportes
 * - Configuración de dashboards
 * - Consultas de estadísticas
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Cada DTO tiene una responsabilidad específica
 * - OCP: Extensible para nuevos tipos de datos
 * - ISP: Interfaces segregadas por funcionalidad
 * - Validación robusta con class-validator
 * - Documentación completa con Swagger
 */

import {
  IsEnum,
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsArray,
  IsObject,
  IsDateString,
  IsPositive,
  Min,
  Max,
  MinLength,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import { MetricType, AggregationPeriod } from '../analytics.entity';

// =============================================================================
// 📊 DTOs PARA MÉTRICAS
// =============================================================================

/**
 * DTO para crear una métrica
 */
export class CreateMetricDto {
  @ApiProperty({
    enum: MetricType,
    description: 'Tipo de métrica a registrar',
    example: MetricType.ACTIVITY_COMPLETED,
  })
  @IsEnum(MetricType)
  metricType: MetricType;

  @ApiProperty({
    description: 'ID del usuario asociado',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({
    description: 'ID del aula asociada (opcional)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @ApiProperty({
    description: 'Valor numérico de la métrica',
    example: 85.5,
    minimum: 0,
  })
  @IsNumber()
  @IsPositive()
  value: number;

  @ApiProperty({
    description: 'Unidad de medida',
    example: 'points',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  unit: string;

  @ApiPropertyOptional({
    type: 'object',
    description: 'Contexto adicional de la métrica',
    example: {
      activityId: '123e4567-e89b-12d3-a456-426614174002',
      difficulty: 'medium',
      subject: 'mathematics',
    },
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;

  @ApiPropertyOptional({
    enum: AggregationPeriod,
    description: 'Período de agregación',
    example: AggregationPeriod.DAILY,
    default: AggregationPeriod.DAILY,
  })
  @IsOptional()
  @IsEnum(AggregationPeriod)
  aggregationPeriod?: AggregationPeriod;

  @ApiPropertyOptional({
    description: 'Fecha y hora cuando ocurrió la métrica (ISO string)',
    example: '2024-01-15T10:30:00Z',
  })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}

/**
 * DTO para crear múltiples métricas
 */
export class CreateBulkMetricsDto {
  @ApiProperty({
    type: [CreateMetricDto],
    description: 'Array de métricas a crear',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateMetricDto)
  metrics: CreateMetricDto[];
}

// =============================================================================
// 🔍 DTOs PARA FILTROS Y CONSULTAS
// =============================================================================

/**
 * DTO para filtros de métricas
 */
export class MetricsFiltersDto {
  @ApiPropertyOptional({
    description: 'ID del usuario',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'ID del aula',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @ApiPropertyOptional({
    type: [String],
    enum: MetricType,
    description: 'Tipos de métricas a incluir',
    example: [MetricType.ACTIVITY_COMPLETED, MetricType.POINTS_EARNED],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(MetricType, { each: true })
  metricTypes?: MetricType[];

  @ApiPropertyOptional({
    description: 'Fecha de inicio (ISO string)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Fecha de fin (ISO string)',
    example: '2024-01-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    enum: AggregationPeriod,
    description: 'Período de agregación',
    example: AggregationPeriod.WEEKLY,
  })
  @IsOptional()
  @IsEnum(AggregationPeriod)
  aggregationPeriod?: AggregationPeriod;

  @ApiPropertyOptional({
    description: 'Página',
    example: 1,
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Elementos por página',
    example: 50,
    minimum: 1,
    maximum: 1000,
    default: 50,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(1000)
  limit?: number = 50;
}

/**
 * DTO para consultas de reportes
 */
export class ReportQueryDto {
  @ApiProperty({
    description: 'Tipo de reporte',
    example: 'student_progress',
    enum: [
      'student_progress',
      'classroom_summary',
      'activity_analytics',
      'gamification_report',
      'engagement_report',
      'performance_comparison',
    ],
  })
  @IsString()
  reportType: string;

  @ApiPropertyOptional({
    description: 'ID del usuario (para reportes individuales)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'ID del aula (para reportes de aula)',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  classroomId?: string;

  @ApiProperty({
    description: 'Fecha de inicio del período',
    example: '2024-01-01T00:00:00Z',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    description: 'Fecha de fin del período',
    example: '2024-01-31T23:59:59Z',
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    type: 'object',
    description: 'Filtros adicionales específicos del reporte',
    example: {
      subjects: ['mathematics', 'science'],
      difficultyLevels: ['medium', 'hard'],
      includeInactive: false,
    },
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Formato de salida',
    example: 'json',
    enum: ['json', 'pdf', 'excel', 'csv'],
    default: 'json',
  })
  @IsOptional()
  @IsString()
  format?: 'json' | 'pdf' | 'excel' | 'csv' = 'json';
}

// =============================================================================
// 📈 DTOs PARA DASHBOARDS
// =============================================================================

/**
 * DTO para configuración de widget
 */
export class WidgetConfigDto {
  @ApiProperty({
    description: 'ID único del widget',
    example: 'widget-1',
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: 'Tipo de widget',
    example: 'line-chart',
    enum: [
      'line-chart',
      'bar-chart',
      'pie-chart',
      'stat-card',
      'progress-bar',
      'table',
      'heatmap',
      'gauge',
    ],
  })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Título del widget',
    example: 'Progreso Semanal',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @ApiProperty({
    type: 'object',
    description: 'Posición y tamaño del widget',
    properties: {
      x: { type: 'number', example: 0 },
      y: { type: 'number', example: 0 },
      width: { type: 'number', example: 6 },
      height: { type: 'number', example: 4 },
    },
  })
  @ValidateNested()
  @Type(() => Object)
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  @ApiProperty({
    type: 'object',
    description: 'Configuración específica del widget',
    example: {
      chartType: 'line',
      showLegend: true,
      colors: ['#007bff', '#28a745'],
    },
  })
  @IsObject()
  config: Record<string, any>;

  @ApiProperty({
    description: 'Fuente de datos del widget',
    example: 'student_progress_metrics',
  })
  @IsString()
  dataSource: string;

  @ApiPropertyOptional({
    type: 'object',
    description: 'Filtros específicos del widget',
    example: {
      metricTypes: ['activity_completed', 'points_earned'],
      timePeriod: 'last_30_days',
    },
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;
}

/**
 * DTO para crear dashboard
 */
export class CreateDashboardDto {
  @ApiProperty({
    description: 'Nombre del dashboard',
    example: 'Mi Dashboard Personal',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Descripción del dashboard',
    example: 'Dashboard personalizado para seguimiento de progreso',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    type: 'object',
    description: 'Configuración del dashboard',
    properties: {
      layout: {
        type: 'object',
        properties: {
          rows: { type: 'number', example: 12 },
          columns: { type: 'number', example: 12 },
        },
      },
      widgets: {
        type: 'array',
        items: { $ref: '#/components/schemas/WidgetConfigDto' },
      },
    },
  })
  @ValidateNested()
  @Type(() => Object)
  configuration: {
    layout: {
      rows: number;
      columns: number;
    };
    widgets: WidgetConfigDto[];
    globalFilters?: Record<string, any>;
    refreshInterval?: number;
    theme?: string;
  };

  @ApiPropertyOptional({
    description: 'Dashboard público',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;

  @ApiPropertyOptional({
    description: 'Dashboard predeterminado',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean = false;
}

/**
 * DTO para actualizar dashboard
 */
export class UpdateDashboardDto extends PartialType(CreateDashboardDto) {
  @ApiPropertyOptional({
    description: 'Dashboard activo',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// =============================================================================
// 📊 DTOs PARA RESPUESTAS
// =============================================================================

/**
 * DTO para estadísticas resumidas
 */
export class AnalyticsStatsDto {
  @ApiProperty({
    description: 'Estadísticas totales',
    example: {
      totalActivities: 150,
      completedActivities: 128,
      totalPoints: 2450,
      averageScore: 87.5,
    },
  })
  totals: Record<string, number>;

  @ApiProperty({
    description: 'Promedios calculados',
    example: {
      dailyActivities: 3.2,
      weeklyProgress: 15.8,
      sessionDuration: 42.5,
    },
  })
  averages: Record<string, number>;

  @ApiProperty({
    description: 'Tendencias (cambio porcentual)',
    example: {
      activitiesCompleted: 12.5,
      pointsEarned: -3.2,
      engagement: 8.7,
    },
  })
  trends: Record<string, number>;

  @ApiProperty({
    description: 'Distribuciones por categoría',
    example: {
      bySubject: { mathematics: 45, science: 35, language: 20 },
      byDifficulty: { easy: 30, medium: 50, hard: 20 },
    },
  })
  distributions: Record<string, Record<string, number>>;

  @ApiProperty({
    description: 'Fecha de generación de las estadísticas',
    example: '2024-01-15T10:30:00Z',
  })
  generatedAt: Date;
}

/**
 * DTO para datos de gráficos
 */
export class ChartDataDto {
  @ApiProperty({
    description: 'Tipo de gráfico',
    example: 'line',
    enum: ['line', 'bar', 'pie', 'area', 'scatter', 'heatmap'],
  })
  type: string;

  @ApiProperty({
    description: 'Título del gráfico',
    example: 'Progreso Semanal',
  })
  title: string;

  @ApiProperty({
    type: 'array',
    description: 'Etiquetas del eje X',
    example: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
  })
  labels: string[];

  @ApiProperty({
    type: 'array',
    description: 'Series de datos',
    example: [
      {
        name: 'Actividades Completadas',
        data: [5, 3, 7, 2, 8, 4, 6],
        color: '#007bff',
      },
      {
        name: 'Puntos Ganados',
        data: [120, 85, 200, 65, 300, 150, 180],
        color: '#28a745',
      },
    ],
  })
  datasets: Array<{
    name: string;
    data: number[];
    color?: string;
  }>;

  @ApiProperty({
    type: 'object',
    description: 'Configuración adicional del gráfico',
    example: {
      showLegend: true,
      showGrid: true,
      yAxisLabel: 'Cantidad',
      xAxisLabel: 'Días',
    },
  })
  config: Record<string, any>;
}

/**
 * DTO para respuesta de reporte
 */
export class ReportResponseDto {
  @ApiProperty({
    description: 'ID del reporte',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'Tipo de reporte',
    example: 'student_progress',
  })
  reportType: string;

  @ApiProperty({
    description: 'Estado del reporte',
    example: 'completed',
    enum: ['generating', 'completed', 'failed'],
  })
  status: string;

  @ApiProperty({
    type: AnalyticsStatsDto,
    description: 'Estadísticas del reporte',
  })
  summary: AnalyticsStatsDto;

  @ApiProperty({
    type: [ChartDataDto],
    description: 'Datos de gráficos',
  })
  charts: ChartDataDto[];

  @ApiProperty({
    type: 'array',
    description: 'Insights y conclusiones',
    example: [
      'El rendimiento en matemáticas ha mejorado un 15% esta semana',
      'Se observa mayor actividad los martes y jueves',
      'Las actividades de dificultad media tienen mejor tasa de finalización',
    ],
  })
  insights: string[];

  @ApiPropertyOptional({
    type: 'array',
    description: 'Recomendaciones basadas en los datos',
    example: [
      'Considera asignar más actividades de ciencias',
      'Los estudiantes responden mejor a actividades interactivas',
    ],
  })
  recommendations?: string[];

  @ApiProperty({
    description: 'Período cubierto por el reporte',
    example: {
      start: '2024-01-01T00:00:00Z',
      end: '2024-01-31T23:59:59Z',
    },
  })
  period: {
    start: Date;
    end: Date;
  };

  @ApiProperty({
    description: 'Fecha de generación',
    example: '2024-01-15T10:30:00Z',
  })
  generatedAt: Date;
}