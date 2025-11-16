/**
 * 📝 DTO PARA CREAR REPORTES
 * 
 * Define la estructura de datos necesaria para crear un nuevo reporte de contenido.
 * Incluye validaciones exhaustivas para asegurar datos de calidad.
 * 
 * CASO DE USO: CU-40 - Reportar Actividad
 */

import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReportType, ReportSeverity } from '../entities/report.entity';

/**
 * DTO para crear un nuevo reporte
 * 
 * @description Estructura de datos requerida cuando un usuario reporta contenido inapropiado.
 * Incluye el tipo de problema, descripción detallada y opcionalmente el contenido reportado.
 * 
 * @example
 * ```json
 * {
 *   "type": "inappropriate_content",
 *   "reason": "Contiene lenguaje ofensivo",
 *   "description": "La pregunta 3 del cuestionario usa términos discriminatorios...",
 *   "severity": "high",
 *   "reportedActivityId": "123e4567-e89b-12d3-a456-426614174000"
 * }
 * ```
 */
export class CreateReportDto {
  /**
   * Tipo de reporte
   * 
   * @description Categoría del problema reportado
   * 
   * @example "inappropriate_content"
   */
  @ApiProperty({
    description: 'Tipo de reporte',
    enum: ReportType,
    example: ReportType.INAPPROPRIATE_CONTENT,
    required: true,
  })
  @IsEnum(ReportType, {
    message: 'El tipo de reporte debe ser uno de los valores permitidos: inappropriate_content, spam, plagiarism, misinformation, harassment, copyright, other',
  })
  @IsNotEmpty({ message: 'El tipo de reporte es obligatorio' })
  type: ReportType;

  /**
   * Razón breve del reporte
   * 
   * @description Título corto que resume el problema (10-200 caracteres)
   * 
   * @example "Contiene lenguaje ofensivo en pregunta 3"
   */
  @ApiProperty({
    description: 'Razón breve del reporte',
    example: 'Contiene lenguaje ofensivo',
    minLength: 10,
    maxLength: 200,
    required: true,
  })
  @IsString({ message: 'La razón debe ser texto' })
  @IsNotEmpty({ message: 'La razón es obligatoria' })
  @MinLength(10, {
    message: 'La razón debe tener al menos 10 caracteres para ser descriptiva',
  })
  @MaxLength(200, {
    message: 'La razón no puede exceder 200 caracteres. Use el campo descripción para detalles adicionales',
  })
  reason: string;

  /**
   * Descripción detallada del problema
   * 
   * @description Explicación completa del problema, incluyendo contexto,
   * ubicación específica del contenido problemático, y cualquier evidencia relevante (20-2000 caracteres)
   * 
   * @example "En la pregunta 3 del cuestionario 'Historia Mundial', se utiliza el término [...]. Esto es ofensivo porque..."
   */
  @ApiProperty({
    description: 'Descripción detallada del problema',
    example: 'En la pregunta 3 se utilizan términos discriminatorios hacia minorías étnicas. Específicamente, se usa el término [...] que es considerado ofensivo.',
    minLength: 20,
    maxLength: 2000,
    required: true,
  })
  @IsString({ message: 'La descripción debe ser texto' })
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @MinLength(20, {
    message: 'La descripción debe tener al menos 20 caracteres para proporcionar suficiente contexto',
  })
  @MaxLength(2000, {
    message: 'La descripción no puede exceder 2000 caracteres',
  })
  description: string;

  /**
   * Severidad del reporte
   * 
   * @description Indica qué tan grave considera el reportero que es el problema.
   * Si no se proporciona, se asigna automáticamente "medium".
   * 
   * Niveles:
   * - low: Problema menor, no urgente
   * - medium: Problema moderado, requiere atención
   * - high: Problema grave, requiere acción pronta
   * - critical: Problema crítico, requiere acción inmediata
   * 
   * @example "high"
   */
  @ApiProperty({
    description: 'Severidad del problema (opcional, por defecto "medium")',
    enum: ReportSeverity,
    example: ReportSeverity.MEDIUM,
    required: false,
    default: ReportSeverity.MEDIUM,
  })
  @IsEnum(ReportSeverity, {
    message: 'La severidad debe ser uno de: low, medium, high, critical',
  })
  @IsOptional()
  severity?: ReportSeverity;

  /**
   * ID de la actividad reportada
   * 
   * @description UUID de la actividad que contiene el contenido inapropiado.
   * Opcional: si el reporte es sobre otro tipo de contenido (usuario, comentario, etc.)
   * 
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  @ApiProperty({
    description: 'ID de la actividad reportada (opcional)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    required: false,
  })
  @IsUUID(4, {
    message: 'El ID de la actividad debe ser un UUID válido en formato v4',
  })
  @IsOptional()
  reportedActivityId?: string;

  // En el futuro se pueden agregar:
  // reportedUserId?: string;
  // reportedCommentId?: string;
  // reportedClassroomId?: string;
}
