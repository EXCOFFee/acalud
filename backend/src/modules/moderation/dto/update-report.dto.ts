/**
 * 📝 DTO PARA ACTUALIZAR REPORTES (MODERADORES)
 * 
 * Define la estructura para que moderadores actualicen el estado y resolución de reportes.
 * Solo accesible para usuarios con rol MODERATOR o ADMIN.
 * 
 * CASO DE USO: CU-42 - Gestionar Reportes
 */

import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ReportStatus } from '../entities/report.entity';

/**
 * DTO para actualizar un reporte existente
 * 
 * @description Estructura de datos que los moderadores usan para actualizar
 * el estado de un reporte, agregar notas y registrar acciones tomadas.
 * 
 * @example
 * ```json
 * {
 *   "status": "resolved",
 *   "moderatorNotes": "Contenido revisado, efectivamente viola políticas. Actividad desactivada.",
 *   "actionTaken": "Actividad eliminada y usuario advertido por email"
 * }
 * ```
 */
export class UpdateReportDto {
  /**
   * Nuevo estado del reporte
   * 
   * @description Permite al moderador cambiar el estado del reporte.
   * 
   * Estados disponibles:
   * - pending: Pendiente de revisión (estado inicial)
   * - reviewing: En proceso de revisión
   * - resolved: Reporte aceptado, contenido eliminado/sancionado
   * - rejected: Reporte rechazado, contenido es aceptable
   * - closed: Reporte cerrado sin acción
   * 
   * @example "resolved"
   */
  @ApiProperty({
    description: 'Nuevo estado del reporte',
    enum: ReportStatus,
    example: ReportStatus.RESOLVED,
    required: false,
  })
  @IsEnum(ReportStatus, {
    message: 'El estado debe ser uno de: pending, reviewing, resolved, rejected, closed',
  })
  @IsOptional()
  status?: ReportStatus;

  /**
   * Notas internas del moderador
   * 
   * @description Comentarios del moderador sobre su análisis y decisión.
   * Estos comentarios son internos y no se muestran al usuario que reportó.
   * 
   * @example "Contenido revisado en detalle. La pregunta 3 efectivamente contiene lenguaje inapropiado según políticas institucionales. Se procedió a desactivar la actividad completa."
   */
  @ApiProperty({
    description: 'Notas internas del moderador sobre la decisión',
    example: 'Contenido revisado, efectivamente viola políticas. Actividad desactivada.',
    maxLength: 2000,
    required: false,
  })
  @IsString({ message: 'Las notas deben ser texto' })
  @IsOptional()
  @ValidateIf(o => o.moderatorNotes !== null && o.moderatorNotes !== undefined)
  @MinLength(10, {
    message: 'Las notas del moderador deben tener al menos 10 caracteres si se proporcionan',
  })
  @MaxLength(2000, {
    message: 'Las notas del moderador no pueden exceder 2000 caracteres',
  })
  moderatorNotes?: string;

  /**
   * Acción tomada por el moderador
   * 
   * @description Describe la acción concreta realizada como resultado de la revisión.
   * Este texto puede ser visible al usuario que reportó.
   * 
   * Ejemplos:
   * - "Actividad eliminada"
   * - "Usuario advertido por email"
   * - "Contenido editado para remover lenguaje inapropiado"
   * - "Sin acción requerida, contenido cumple políticas"
   * 
   * @example "Actividad desactivada y usuario notificado"
   */
  @ApiProperty({
    description: 'Acción concreta tomada por el moderador',
    example: 'Actividad eliminada y usuario advertido',
    maxLength: 500,
    required: false,
  })
  @IsString({ message: 'La acción debe ser texto' })
  @IsOptional()
  @ValidateIf(o => o.actionTaken !== null && o.actionTaken !== undefined)
  @MinLength(5, {
    message: 'La descripción de la acción debe tener al menos 5 caracteres si se proporciona',
  })
  @MaxLength(500, {
    message: 'La descripción de la acción no puede exceder 500 caracteres',
  })
  actionTaken?: string;
}
