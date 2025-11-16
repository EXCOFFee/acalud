/**
 * 📝 DTO PARA FILTRAR REPORTES
 * 
 * Define los parámetros de filtrado y búsqueda para listar reportes.
 * Usado por moderadores para encontrar reportes específicos.
 * 
 * CASO DE USO: CU-41 - Ver Lista de Reportes (Moderador)
 */

import {
  IsEnum,
  IsOptional,
  IsUUID,
  IsDateString,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReportType, ReportStatus, ReportSeverity } from '../entities/report.entity';

/**
 * DTO para filtrar reportes en búsquedas
 * 
 * @description Permite a moderadores filtrar reportes por múltiples criterios:
 * tipo, estado, severidad, fechas, usuario reportero, contenido reportado, etc.
 * 
 * Todos los filtros son opcionales y se pueden combinar.
 * 
 * @example
 * ```typescript
 * // Buscar reportes pendientes de alta prioridad sobre actividades
 * {
 *   status: 'pending',
 *   severity: 'high',
 *   type: 'inappropriate_content'
 * }
 * 
 * // Buscar reportes de un usuario específico en un rango de fechas
 * {
 *   reporterId: '123e4567-e89b-12d3-a456-426614174001',
 *   startDate: '2023-12-01',
 *   endDate: '2023-12-31'
 * }
 * ```
 */
export class ReportFilterDto {
  /**
   * Filtrar por tipo de reporte
   * 
   * @description Permite buscar solo reportes de un tipo específico
   * (inappropriate_content, spam, plagiarism, etc.)
   * 
   * @example "inappropriate_content"
   */
  @ApiProperty({
    description: 'Filtrar por tipo de reporte',
    enum: ReportType,
    example: ReportType.INAPPROPRIATE_CONTENT,
    required: false,
  })
  @IsEnum(ReportType, {
    message: 'El tipo debe ser uno de los valores permitidos',
  })
  @IsOptional()
  type?: ReportType;

  /**
   * Filtrar por estado del reporte
   * 
   * @description Permite buscar reportes en un estado específico
   * (pending, reviewing, resolved, rejected, closed)
   * 
   * @example "pending"
   */
  @ApiProperty({
    description: 'Filtrar por estado',
    enum: ReportStatus,
    example: ReportStatus.PENDING,
    required: false,
  })
  @IsEnum(ReportStatus, {
    message: 'El estado debe ser uno de los valores permitidos',
  })
  @IsOptional()
  status?: ReportStatus;

  /**
   * Filtrar por severidad
   * 
   * @description Permite buscar reportes de una severidad específica
   * (low, medium, high, critical)
   * 
   * @example "high"
   */
  @ApiProperty({
    description: 'Filtrar por severidad',
    enum: ReportSeverity,
    example: ReportSeverity.HIGH,
    required: false,
  })
  @IsEnum(ReportSeverity, {
    message: 'La severidad debe ser uno de los valores permitidos',
  })
  @IsOptional()
  severity?: ReportSeverity;

  /**
   * Filtrar por ID del usuario que reportó
   * 
   * @description Útil para ver todos los reportes de un usuario específico
   * (por ejemplo, para detectar abuso del sistema de reportes)
   * 
   * @example "123e4567-e89b-12d3-a456-426614174001"
   */
  @ApiProperty({
    description: 'ID del usuario que reportó',
    example: '123e4567-e89b-12d3-a456-426614174001',
    required: false,
  })
  @IsUUID(4, {
    message: 'El ID del reportero debe ser un UUID válido',
  })
  @IsOptional()
  reporterId?: string;

  /**
   * Filtrar por ID del moderador asignado
   * 
   * @description Permite a un moderador ver solo sus reportes asignados,
   * o a un admin ver reportes asignados a un moderador específico
   * 
   * @example "123e4567-e89b-12d3-a456-426614174002"
   */
  @ApiProperty({
    description: 'ID del moderador asignado',
    example: '123e4567-e89b-12d3-a456-426614174002',
    required: false,
  })
  @IsUUID(4, {
    message: 'El ID del moderador debe ser un UUID válido',
  })
  @IsOptional()
  moderatorId?: string;

  /**
   * Filtrar por ID de la actividad reportada
   * 
   * @description Útil para ver todos los reportes sobre una actividad específica
   * 
   * @example "123e4567-e89b-12d3-a456-426614174003"
   */
  @ApiProperty({
    description: 'ID de la actividad reportada',
    example: '123e4567-e89b-12d3-a456-426614174003',
    required: false,
  })
  @IsUUID(4, {
    message: 'El ID de la actividad debe ser un UUID válido',
  })
  @IsOptional()
  reportedActivityId?: string;

  /**
   * Fecha de inicio del rango de búsqueda
   * 
   * @description Busca reportes creados desde esta fecha (inclusive)
   * Formato ISO 8601: YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss.sssZ
   * 
   * @example "2023-12-01"
   */
  @ApiProperty({
    description: 'Fecha de inicio (ISO 8601)',
    example: '2023-12-01T00:00:00Z',
    required: false,
  })
  @IsDateString(
    {},
    {
      message: 'La fecha de inicio debe estar en formato ISO 8601 (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss.sssZ)',
    }
  )
  @IsOptional()
  startDate?: string;

  /**
   * Fecha de fin del rango de búsqueda
   * 
   * @description Busca reportes creados hasta esta fecha (inclusive)
   * Formato ISO 8601: YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss.sssZ
   * 
   * @example "2023-12-31"
   */
  @ApiProperty({
    description: 'Fecha de fin (ISO 8601)',
    example: '2023-12-31T23:59:59Z',
    required: false,
  })
  @IsDateString(
    {},
    {
      message: 'La fecha de fin debe estar en formato ISO 8601 (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss.sssZ)',
    }
  )
  @IsOptional()
  endDate?: string;

  /**
   * Búsqueda de texto libre
   * 
   * @description Busca en los campos: reason, description, moderatorNotes, actionTaken
   * No distingue mayúsculas/minúsculas
   * 
   * @example "lenguaje ofensivo"
   */
  @ApiProperty({
    description: 'Búsqueda de texto en razón y descripción',
    example: 'lenguaje ofensivo',
    maxLength: 200,
    required: false,
  })
  @IsString({ message: 'La búsqueda debe ser texto' })
  @IsOptional()
  @MaxLength(200, {
    message: 'La búsqueda no puede exceder 200 caracteres',
  })
  search?: string;
}
