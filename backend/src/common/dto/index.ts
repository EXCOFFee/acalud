/**
 * 📋 DTOs COMUNES - PAGINACIÓN Y RESPUESTAS
 * 
 * DTOs reutilizables para paginación y respuestas estándar
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Cada DTO tiene una responsabilidad específica
 * - OCP: Extensibles mediante herencia
 * - LSP: Implementan contratos bien definidos
 * - ISP: Interfaces específicas y no dependientes
 * - DIP: No dependen de implementaciones concretas
 */

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min, Max } from 'class-validator';

/**
 * DTO para parámetros de paginación
 * 
 * @description Define los parámetros estándar para paginación en todas las consultas
 * 
 * @example
 * ```typescript
 * const pagination: PaginationDto = {
 *   page: 1,
 *   limit: 10
 * };
 * ```
 */
export class PaginationDto {
  /**
   * Número de página (base 1)
   * 
   * @default 1
   * @minimum 1
   * @example 1
   */
  @ApiPropertyOptional({
    description: 'Número de página (base 1)',
    minimum: 1,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La página debe ser un número entero' })
  @Min(1, { message: 'La página debe ser mayor a 0' })
  page: number = 1;

  /**
   * Cantidad de elementos por página
   * 
   * @default 10
   * @minimum 1
   * @maximum 100
   * @example 10
   */
  @ApiPropertyOptional({
    description: 'Cantidad de elementos por página',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'El límite debe ser un número entero' })
  @Min(1, { message: 'El límite debe ser mayor a 0' })
  @Max(100, { message: 'El límite no puede ser mayor a 100' })
  limit: number = 10;
}

/**
 * Información de paginación para respuestas
 */
export interface PaginationInfo {
  /** Página actual */
  page: number;
  /** Elementos por página */
  limit: number;
  /** Total de elementos */
  total: number;
  /** Total de páginas */
  totalPages: number;
  /** Indica si hay página siguiente */
  hasNext: boolean;
  /** Indica si hay página anterior */
  hasPrev: boolean;
}

/**
 * Respuesta paginada genérica
 * 
 * @template T Tipo de datos contenidos en la respuesta
 * 
 * @description Estructura estándar para todas las respuestas paginadas del sistema
 * 
 * @example
 * ```typescript
 * const response: PaginatedResponse<Contact> = {
 *   data: [contact1, contact2],
 *   pagination: {
 *     page: 1,
 *     limit: 10,
 *     total: 25,
 *     totalPages: 3,
 *     hasNext: true,
 *     hasPrev: false
 *   }
 * };
 * ```
 */
export interface PaginatedResponse<T> {
  /** Datos de la página actual */
  data: T[];
  /** Información de paginación */
  pagination: PaginationInfo;
}

/**
 * Respuesta estándar del API
 * 
 * @template T Tipo de datos contenidos en la respuesta
 * 
 * @description Estructura estándar para todas las respuestas exitosas del API
 * 
 * @example
 * ```typescript
 * const response: ApiResponse<Contact> = {
 *   success: true,
 *   message: 'Contacto creado exitosamente',
 *   data: contact
 * };
 * ```
 */
export interface ApiResponse<T = unknown, M = Record<string, unknown>> {
  /** Indica si la operación fue exitosa */
  success: boolean;
  /** Mensaje descriptivo de la operación */
  message: string;
  /** Datos de respuesta (opcional) */
  data?: T;
  /** Metadatos adicionales (opcional) */
  meta?: M;
  /** Timestamp de la respuesta */
  timestamp?: Date;
}

/**
 * Respuesta de error estándar
 * 
 * @description Estructura estándar para respuestas de error del API
 * 
 * @example
 * ```typescript
 * const errorResponse: ErrorResponse = {
 *   success: false,
 *   error: 'VALIDATION_ERROR',
 *   message: 'Los datos proporcionados son inválidos',
 *   details: ['Email requerido', 'Mensaje muy corto']
 * };
 * ```
 */
export interface ErrorResponse {
  /** Siempre false para errores */
  success: false;
  /** Código de error */
  error: string;
  /** Mensaje descriptivo del error */
  message: string;
  /** Detalles específicos del error (opcional) */
  details?: string[];
  /** Timestamp del error */
  timestamp?: Date;
  /** Path del endpoint que causó el error */
  path?: string;
}