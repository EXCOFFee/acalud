/**
 * ✏️ UPDATE EVENT CATEGORY DTO - ACTUALIZACIÓN DE CATEGORÍAS
 * 
 * DTO para actualización parcial de categorías de eventos existentes.
 * Permite modificaciones granulares preservando datos existentes.
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import { PartialType } from '@nestjs/swagger';
import { CreateEventCategoryDto } from './create-event-category.dto';

/**
 * ✏️ DTO para actualizar categorías de eventos
 */
export class UpdateEventCategoryDto extends PartialType(CreateEventCategoryDto) {
  // Hereda todos los campos de CreateEventCategoryDto como opcionales
  // Permite actualizaciones parciales sin requerir todos los campos
}