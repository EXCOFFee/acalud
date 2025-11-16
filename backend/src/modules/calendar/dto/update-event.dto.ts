/**
 * ✏️ UPDATE EVENT DTO - VALIDACIÓN PARA ACTUALIZAR EVENTOS
 * 
 * DTO para actualización parcial de eventos existentes.
 * Todos los campos son opcionales para permitir actualizaciones granulares.
 * 
 * FUNCIONALIDADES:
 * - Actualización parcial de campos
 * - Validaciones condicionales
 * - Preservación de datos existentes
 * - Control de cambios críticos
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';
import { CreateEventDto } from './create-event.dto';

/**
 * ✏️ DTO para actualizar eventos (hereda de CreateEventDto)
 */
export class UpdateEventDto extends PartialType(CreateEventDto) {
  @ApiPropertyOptional({
    description: 'Razón del cambio o actualización',
    example: 'Cambio de aula por mantenimiento',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(1, 500)
  updateReason?: string;

  @ApiPropertyOptional({
    description: 'Notificar a los asistentes sobre los cambios',
    example: true,
    default: true,
  })
  @IsOptional()
  notifyAttendees?: boolean;

  @ApiPropertyOptional({
    description: 'Aplicar cambios a todas las ocurrencias (eventos recurrentes)',
    example: false,
    default: false,
  })
  @IsOptional()
  applyToAllOccurrences?: boolean;
}