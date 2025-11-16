/**
 * 🚨 ENTIDAD DE REPORTES - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Representa un reporte de contenido inapropiado o actividad problemática.
 * Permite a estudiantes, docentes y administradores reportar contenido que
 * viola las políticas de la plataforma.
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Responsabilidad única de representar un reporte
 * - OCP: Extensible mediante herencia o composición
 * - LSP: Puede sustituir a cualquier entidad base
 * - ISP: Expone solo propiedades relevantes al reporte
 * - DIP: Usa relaciones abstractas con otras entidades
 * 
 * CASOS DE USO CUBIERTOS:
 * - CU-40: Reportar actividad por contenido inapropiado
 * - CU-41: Ver lista de reportes como moderador
 * - CU-42: Gestionar reportes (aprobar/rechazar/resolver)
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
import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  IsUUID,
  IsDate,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../users/user.entity';
import { Activity } from '../../activities/activity.entity';

/**
 * Tipos de reportes disponibles
 * 
 * @description Define las categorías de reportes que los usuarios pueden crear
 */
export enum ReportType {
  /** Contenido que ofende o discrimina */
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  
  /** Spam o contenido repetitivo no deseado */
  SPAM = 'spam',
  
  /** Contenido copiado sin atribución */
  PLAGIARISM = 'plagiarism',
  
  /** Contenido falso o engañoso */
  MISINFORMATION = 'misinformation',
  
  /** Acoso o comportamiento abusivo */
  HARASSMENT = 'harassment',
  
  /** Violación de derechos de autor */
  COPYRIGHT = 'copyright',
  
  /** Otro tipo de problema */
  OTHER = 'other',
}

/**
 * Estados posibles de un reporte
 * 
 * @description Representa el ciclo de vida de un reporte desde su creación hasta su resolución
 */
export enum ReportStatus {
  /** Recién creado, esperando revisión */
  PENDING = 'pending',
  
  /** En proceso de revisión por un moderador */
  REVIEWING = 'reviewing',
  
  /** Reporte aceptado, contenido eliminado/sancionado */
  RESOLVED = 'resolved',
  
  /** Reporte rechazado, contenido es aceptable */
  REJECTED = 'rejected',
  
  /** Reporte cerrado sin acción */
  CLOSED = 'closed',
}

/**
 * Severidad del reporte
 * 
 * @description Indica qué tan grave es el problema reportado
 */
export enum ReportSeverity {
  /** Problema menor, revisión normal */
  LOW = 'low',
  
  /** Problema moderado, requiere atención */
  MEDIUM = 'medium',
  
  /** Problema grave, requiere acción inmediata */
  HIGH = 'high',
  
  /** Problema crítico, requiere acción urgente */
  CRITICAL = 'critical',
}

/**
 * Entidad que representa un reporte de contenido
 * 
 * @description Almacena información sobre reportes de contenido inapropiado,
 * incluyendo el usuario que reporta, el contenido reportado, la razón,
 * el estado de revisión y las acciones tomadas.
 * 
 * @example
 * ```typescript
 * const report = new Report();
 * report.type = ReportType.INAPPROPRIATE_CONTENT;
 * report.reason = "Esta actividad contiene lenguaje ofensivo";
 * report.description = "En la pregunta 3 hay insultos hacia minorías";
 * report.severity = ReportSeverity.HIGH;
 * report.reporter = usuario;
 * report.reportedActivity = actividad;
 * await reportRepository.save(report);
 * ```
 */
@Entity('reports')
@Index(['status', 'createdAt']) // Índice para búsquedas por estado y fecha
@Index(['reporterId', 'createdAt']) // Índice para reportes de un usuario
@Index(['reportedActivityId', 'status']) // Índice para reportes de una actividad
export class Report {
  /**
   * ID único del reporte (UUID v4)
   */
  @ApiProperty({
    description: 'ID único del reporte',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // =============================================================================
  // INFORMACIÓN DEL REPORTE
  // =============================================================================

  /**
   * Tipo de reporte
   * 
   * @description Categoría que describe el tipo de problema reportado
   */
  @ApiProperty({
    description: 'Tipo de reporte',
    enum: ReportType,
    example: ReportType.INAPPROPRIATE_CONTENT,
  })
  @Column({
    type: 'enum',
    enum: ReportType,
    nullable: false,
    comment: 'Tipo de problema reportado',
  })
  @IsEnum(ReportType, { message: 'El tipo de reporte debe ser válido' })
  @IsNotEmpty({ message: 'El tipo de reporte es obligatorio' })
  type: ReportType;

  /**
   * Razón breve del reporte
   * 
   * @description Título corto que resume el problema (ej: "Contenido ofensivo")
   */
  @ApiProperty({
    description: 'Razón breve del reporte',
    example: 'Contenido ofensivo en pregunta 3',
    minLength: 10,
    maxLength: 200,
  })
  @Column({
    type: 'varchar',
    length: 200,
    nullable: false,
    comment: 'Resumen breve del problema',
  })
  @IsString({ message: 'La razón debe ser texto' })
  @IsNotEmpty({ message: 'La razón es obligatoria' })
  @MinLength(10, { message: 'La razón debe tener al menos 10 caracteres' })
  @MaxLength(200, { message: 'La razón no puede exceder 200 caracteres' })
  reason: string;

  /**
   * Descripción detallada del reporte
   * 
   * @description Explicación completa del problema, incluyendo contexto y evidencia
   */
  @ApiProperty({
    description: 'Descripción detallada del problema',
    example: 'En la pregunta 3 del cuestionario se utilizan términos ofensivos...',
    minLength: 20,
    maxLength: 2000,
  })
  @Column({
    type: 'text',
    nullable: false,
    comment: 'Descripción detallada del problema reportado',
  })
  @IsString({ message: 'La descripción debe ser texto' })
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @MinLength(20, { message: 'La descripción debe tener al menos 20 caracteres' })
  @MaxLength(2000, { message: 'La descripción no puede exceder 2000 caracteres' })
  description: string;

  /**
   * Severidad del reporte
   * 
   * @description Indica qué tan grave es el problema (bajo, medio, alto, crítico)
   */
  @ApiProperty({
    description: 'Severidad del reporte',
    enum: ReportSeverity,
    example: ReportSeverity.HIGH,
  })
  @Column({
    type: 'enum',
    enum: ReportSeverity,
    default: ReportSeverity.MEDIUM,
    nullable: false,
    comment: 'Nivel de gravedad del problema',
  })
  @IsEnum(ReportSeverity, { message: 'La severidad debe ser válida' })
  @IsOptional()
  severity: ReportSeverity;

  /**
   * Estado actual del reporte
   * 
   * @description Indica en qué fase del proceso de revisión está el reporte
   */
  @ApiProperty({
    description: 'Estado del reporte',
    enum: ReportStatus,
    example: ReportStatus.PENDING,
  })
  @Column({
    type: 'enum',
    enum: ReportStatus,
    default: ReportStatus.PENDING,
    nullable: false,
    comment: 'Estado actual del reporte',
  })
  @IsEnum(ReportStatus, { message: 'El estado debe ser válido' })
  status: ReportStatus;

  // =============================================================================
  // RELACIONES
  // =============================================================================

  /**
   * ID del usuario que creó el reporte
   */
  @ApiProperty({
    description: 'ID del usuario que reportó',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @Column({ type: 'uuid', nullable: false })
  @IsUUID(4, { message: 'El ID del reportero debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del reportero es obligatorio' })
  reporterId: string;

  /**
   * Usuario que creó el reporte
   * 
   * @description Relación con la entidad User del usuario que reportó el contenido
   */
  @ApiProperty({
    description: 'Usuario que reportó',
    type: () => User,
  })
  @ManyToOne(() => User, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporterId' })
  reporter: User;

  /**
   * ID de la actividad reportada
   * 
   * @description Puede ser null si el reporte es sobre otro tipo de contenido
   */
  @ApiProperty({
    description: 'ID de la actividad reportada (opcional)',
    example: '123e4567-e89b-12d3-a456-426614174002',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  @IsUUID(4, { message: 'El ID de la actividad debe ser un UUID válido' })
  @IsOptional()
  reportedActivityId: string | null;

  /**
   * Actividad reportada
   * 
   * @description Relación con la entidad Activity que fue reportada
   */
  @ApiProperty({
    description: 'Actividad reportada',
    type: () => Activity,
    required: false,
  })
  @ManyToOne(() => Activity, { eager: false, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reportedActivityId' })
  reportedActivity: Activity | null;

  // En el futuro se pueden agregar más tipos de contenido reportable:
  // - reportedUserId / reportedUser (para reportar usuarios)
  // - reportedCommentId / reportedComment (para reportar comentarios)
  // - reportedClassroomId / reportedClassroom (para reportar aulas)

  // =============================================================================
  // INFORMACIÓN DE MODERACIÓN
  // =============================================================================

  /**
   * ID del moderador asignado
   * 
   * @description Moderador que está revisando el reporte
   */
  @ApiProperty({
    description: 'ID del moderador asignado (opcional)',
    example: '123e4567-e89b-12d3-a456-426614174003',
    required: false,
  })
  @Column({ type: 'uuid', nullable: true })
  @IsUUID(4, { message: 'El ID del moderador debe ser un UUID válido' })
  @IsOptional()
  moderatorId: string | null;

  /**
   * Moderador asignado al reporte
   * 
   * @description Usuario con rol MODERATOR o ADMIN que revisa el reporte
   */
  @ApiProperty({
    description: 'Moderador asignado',
    type: () => User,
    required: false,
  })
  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'moderatorId' })
  moderator: User | null;

  /**
   * Notas del moderador
   * 
   * @description Comentarios internos del moderador sobre su decisión
   */
  @ApiProperty({
    description: 'Notas del moderador sobre la decisión tomada',
    example: 'Contenido revisado, efectivamente contiene lenguaje inapropiado. Actividad desactivada.',
    required: false,
  })
  @Column({
    type: 'text',
    nullable: true,
    comment: 'Notas internas del moderador',
  })
  @IsString({ message: 'Las notas deben ser texto' })
  @IsOptional()
  @ValidateIf(o => o.moderatorNotes !== null)
  @MaxLength(2000, { message: 'Las notas no pueden exceder 2000 caracteres' })
  moderatorNotes: string | null;

  /**
   * Acción tomada por el moderador
   * 
   * @description Describe qué acción se tomó (ej: "Actividad desactivada", "Usuario advertido")
   */
  @ApiProperty({
    description: 'Acción tomada por el moderador',
    example: 'Actividad eliminada y usuario advertido',
    required: false,
  })
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'Acción concreta tomada por el moderador',
  })
  @IsString({ message: 'La acción debe ser texto' })
  @IsOptional()
  @ValidateIf(o => o.actionTaken !== null)
  @MaxLength(500, { message: 'La acción no puede exceder 500 caracteres' })
  actionTaken: string | null;

  /**
   * Fecha de revisión del reporte
   * 
   * @description Timestamp de cuándo el moderador revisó el reporte
   */
  @ApiProperty({
    description: 'Fecha de revisión',
    example: '2023-12-15T14:30:00Z',
    required: false,
  })
  @Column({
    type: 'timestamp',
    nullable: true,
    comment: 'Fecha de revisión por el moderador',
  })
  @IsDate({ message: 'La fecha de revisión debe ser válida' })
  @IsOptional()
  reviewedAt: Date | null;

  // =============================================================================
  // METADATA
  // =============================================================================

  /**
   * Dirección IP del reportero
   * 
   * @description Usado para detectar spam y abusos del sistema de reportes
   */
  @Column({
    type: 'varchar',
    length: 45,
    nullable: true,
    comment: 'IP del usuario que reportó (para detección de spam)',
  })
  @IsString()
  @IsOptional()
  ipAddress: string | null;

  /**
   * User-Agent del reportero
   * 
   * @description Información del navegador/dispositivo (para análisis de spam)
   */
  @Column({
    type: 'varchar',
    length: 500,
    nullable: true,
    comment: 'User-Agent del reportero',
  })
  @IsString()
  @IsOptional()
  userAgent: string | null;

  // =============================================================================
  // TIMESTAMPS
  // =============================================================================

  /**
   * Fecha de creación del reporte
   */
  @ApiProperty({
    description: 'Fecha de creación del reporte',
    example: '2023-12-01T10:00:00Z',
  })
  @CreateDateColumn({ comment: 'Fecha de creación del reporte' })
  @IsDate()
  createdAt: Date;

  /**
   * Fecha de última actualización
   */
  @ApiProperty({
    description: 'Fecha de última actualización',
    example: '2023-12-15T14:30:00Z',
  })
  @UpdateDateColumn({ comment: 'Fecha de última actualización' })
  @IsDate()
  updatedAt: Date;

  // =============================================================================
  // MÉTODOS DE UTILIDAD
  // =============================================================================

  /**
   * Verifica si el reporte está pendiente de revisión
   * 
   * @returns true si el estado es PENDING
   */
  isPending(): boolean {
    return this.status === ReportStatus.PENDING;
  }

  /**
   * Verifica si el reporte está siendo revisado
   * 
   * @returns true si el estado es REVIEWING
   */
  isReviewing(): boolean {
    return this.status === ReportStatus.REVIEWING;
  }

  /**
   * Verifica si el reporte fue resuelto
   * 
   * @returns true si el estado es RESOLVED
   */
  isResolved(): boolean {
    return this.status === ReportStatus.RESOLVED;
  }

  /**
   * Verifica si el reporte fue rechazado
   * 
   * @returns true si el estado es REJECTED
   */
  isRejected(): boolean {
    return this.status === ReportStatus.REJECTED;
  }

  /**
   * Verifica si el reporte está cerrado
   * 
   * @returns true si el estado es CLOSED o RESOLVED o REJECTED
   */
  isClosed(): boolean {
    return [ReportStatus.CLOSED, ReportStatus.RESOLVED, ReportStatus.REJECTED].includes(this.status);
  }

  /**
   * Verifica si el reporte es de alta prioridad
   * 
   * @returns true si la severidad es HIGH o CRITICAL
   */
  isHighPriority(): boolean {
    return [ReportSeverity.HIGH, ReportSeverity.CRITICAL].includes(this.severity);
  }

  /**
   * Calcula el tiempo transcurrido desde la creación
   * 
   * @returns Número de días desde la creación
   */
  getDaysSinceCreation(): number {
    const now = new Date();
    const diffMs = now.getTime() - this.createdAt.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  /**
   * Obtiene el nombre del tipo de reporte para mostrar al usuario
   * 
   * @returns Nombre legible del tipo de reporte
   */
  getTypeDisplayName(): string {
    const names: Record<ReportType, string> = {
      [ReportType.INAPPROPRIATE_CONTENT]: 'Contenido Inapropiado',
      [ReportType.SPAM]: 'Spam',
      [ReportType.PLAGIARISM]: 'Plagio',
      [ReportType.MISINFORMATION]: 'Desinformación',
      [ReportType.HARASSMENT]: 'Acoso',
      [ReportType.COPYRIGHT]: 'Violación de Copyright',
      [ReportType.OTHER]: 'Otro',
    };
    return names[this.type] || 'Desconocido';
  }

  /**
   * Obtiene el nombre del estado para mostrar al usuario
   * 
   * @returns Nombre legible del estado
   */
  getStatusDisplayName(): string {
    const names: Record<ReportStatus, string> = {
      [ReportStatus.PENDING]: 'Pendiente',
      [ReportStatus.REVIEWING]: 'En Revisión',
      [ReportStatus.RESOLVED]: 'Resuelto',
      [ReportStatus.REJECTED]: 'Rechazado',
      [ReportStatus.CLOSED]: 'Cerrado',
    };
    return names[this.status] || 'Desconocido';
  }

  /**
   * Obtiene un emoji representativo de la severidad
   * 
   * @returns Emoji correspondiente al nivel de severidad
   */
  getSeverityEmoji(): string {
    const emojis: Record<ReportSeverity, string> = {
      [ReportSeverity.LOW]: '🟢',
      [ReportSeverity.MEDIUM]: '🟡',
      [ReportSeverity.HIGH]: '🟠',
      [ReportSeverity.CRITICAL]: '🔴',
    };
    return emojis[this.severity] || '⚪';
  }
}
