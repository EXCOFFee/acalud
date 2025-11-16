/**
 * 📋 DTOs DEL MÓDULO INSTITUCIONAL - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Data Transfer Objects para el módulo institucional
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Cada DTO tiene una responsabilidad única
 * - OCP: Extensibles mediante herencia y composition
 * - LSP: Implementan contratos bien definidos
 * - ISP: Interfaces segregadas por funcionalidad
 * - DIP: No dependen de implementaciones concretas
 */

import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  MinLength,
  IsDateString,
  ValidateNested,
  IsArray,
  IsUrl,
} from 'class-validator';
import { ContactType, ContactStatus } from '../entities/contact.entity';

/**
 * DTO para crear un nuevo contacto
 * 
 * @description Define la estructura de datos requerida para crear un mensaje de contacto
 * desde la página institucional
 * 
 * @example
 * ```typescript
 * const createContactDto: CreateContactDto = {
 *   name: 'Juan Pérez',
 *   email: 'juan@email.com',
 *   phone: '+54 11 1234-5678',
 *   type: ContactType.COMPLAINT,
 *   subject: 'Problema con el acceso',
 *   message: 'No puedo acceder a mi cuenta desde ayer...'
 * };
 * ```
 */
export class CreateContactDto {
  /**
   * Nombre completo del contacto
   * 
   * @required Sí
   * @minLength 2
   * @maxLength 100
   * @example 'María García'
   */
  @ApiProperty({
    description: 'Nombre completo del contacto',
    minLength: 2,
    maxLength: 100,
    example: 'María García',
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name: string;

  /**
   * Dirección de email para contacto
   * 
   * @required Sí
   * @format email
   * @maxLength 255
   * @example 'maria@email.com'
   */
  @ApiProperty({
    description: 'Dirección de email para contacto',
    format: 'email',
    maxLength: 255,
    example: 'maria@email.com',
  })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @MaxLength(255, { message: 'El email no puede exceder 255 caracteres' })
  email: string;

  /**
   * Número de teléfono (opcional)
   * 
   * @required No
   * @maxLength 20
   * @example '+54 11 1234-5678'
   */
  @ApiPropertyOptional({
    description: 'Número de teléfono (opcional)',
    maxLength: 20,
    example: '+54 11 1234-5678',
  })
  @IsOptional()
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @MaxLength(20, { message: 'El teléfono no puede exceder 20 caracteres' })
  phone?: string;

  /**
   * Tipo de contacto
   * 
   * @required Sí
   * @enum ContactType
   * @default ContactType.GENERAL
   * @example ContactType.COMPLAINT
   */
  @ApiProperty({
    description: 'Tipo de contacto',
    enum: ContactType,
    default: ContactType.GENERAL,
    example: ContactType.COMPLAINT,
  })
  @IsEnum(ContactType, { message: 'Tipo de contacto inválido' })
  type: ContactType;

  /**
   * Asunto del mensaje
   * 
   * @required Sí
   * @minLength 5
   * @maxLength 200
   * @example 'Problema con el acceso a la plataforma'
   */
  @ApiProperty({
    description: 'Asunto del mensaje',
    minLength: 5,
    maxLength: 200,
    example: 'Problema con el acceso a la plataforma',
  })
  @IsString({ message: 'El asunto debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El asunto es obligatorio' })
  @MinLength(5, { message: 'El asunto debe tener al menos 5 caracteres' })
  @MaxLength(200, { message: 'El asunto no puede exceder 200 caracteres' })
  subject: string;

  /**
   * Contenido del mensaje
   * 
   * @required Sí
   * @minLength 10
   * @maxLength 2000
   * @example 'Desde ayer no puedo acceder a mi cuenta. Cuando intento hacer login...'
   */
  @ApiProperty({
    description: 'Contenido completo del mensaje',
    minLength: 10,
    maxLength: 2000,
    example: 'Desde ayer no puedo acceder a mi cuenta. Cuando intento hacer login...',
  })
  @IsString({ message: 'El mensaje debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El mensaje es obligatorio' })
  @MinLength(10, { message: 'El mensaje debe tener al menos 10 caracteres' })
  @MaxLength(2000, { message: 'El mensaje no puede exceder 2000 caracteres' })
  message: string;
}

/**
 * DTO para actualizar un contacto existente (solo administradores)
 * 
 * @description Define los campos que pueden ser actualizados por un administrador
 * 
 * @example
 * ```typescript
 * const updateContactDto: UpdateContactDto = {
 *   status: ContactStatus.RESOLVED,
 *   adminResponse: 'Problema resuelto mediante reinicio de contraseña'
 * };
 * ```
 */
export class UpdateContactDto extends PartialType(CreateContactDto) {
  /**
   * Estado del contacto
   * 
   * @required No
   * @enum ContactStatus
   * @example ContactStatus.RESOLVED
   */
  @ApiPropertyOptional({
    description: 'Estado del contacto',
    enum: ContactStatus,
    example: ContactStatus.RESOLVED,
  })
  @IsOptional()
  @IsEnum(ContactStatus, { message: 'Estado de contacto inválido' })
  status?: ContactStatus;

  /**
   * Respuesta del administrador
   * 
   * @required No
   * @maxLength 2000
   * @example 'Problema resuelto mediante reinicio de contraseña'
   */
  @ApiPropertyOptional({
    description: 'Respuesta del administrador',
    maxLength: 2000,
    example: 'Problema resuelto mediante reinicio de contraseña',
  })
  @IsOptional()
  @IsString({ message: 'La respuesta debe ser una cadena de texto' })
  @MaxLength(2000, { message: 'La respuesta no puede exceder 2000 caracteres' })
  adminResponse?: string;
}

/**
 * DTO para filtrar contactos
 * 
 * @description Define los filtros disponibles para buscar contactos
 * 
 * @example
 * ```typescript
 * const filters: ContactFilterDto = {
 *   type: ContactType.COMPLAINT,
 *   status: ContactStatus.PENDING,
 *   startDate: new Date('2023-01-01'),
 *   endDate: new Date('2023-12-31'),
 *   search: 'acceso'
 * };
 * ```
 */
export class ContactFilterDto {
  /**
   * Filtrar por tipo de contacto
   * 
   * @required No
   * @enum ContactType
   * @example ContactType.COMPLAINT
   */
  @ApiPropertyOptional({
    description: 'Filtrar por tipo de contacto',
    enum: ContactType,
    example: ContactType.COMPLAINT,
  })
  @IsOptional()
  @IsEnum(ContactType, { message: 'Tipo de contacto inválido' })
  type?: ContactType;

  /**
   * Filtrar por estado
   * 
   * @required No
   * @enum ContactStatus
   * @example ContactStatus.PENDING
   */
  @ApiPropertyOptional({
    description: 'Filtrar por estado',
    enum: ContactStatus,
    example: ContactStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(ContactStatus, { message: 'Estado de contacto inválido' })
  status?: ContactStatus;

  /**
   * Fecha de inicio para el filtro de rango
   * 
   * @required No
   * @format date-time
   * @example '2023-01-01T00:00:00Z'
   */
  @ApiPropertyOptional({
    description: 'Fecha de inicio para el filtro de rango',
    format: 'date-time',
    example: '2023-01-01T00:00:00Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Fecha de inicio inválida' })
  @Type(() => Date)
  startDate?: Date;

  /**
   * Fecha de fin para el filtro de rango
   * 
   * @required No
   * @format date-time
   * @example '2023-12-31T23:59:59Z'
   */
  @ApiPropertyOptional({
    description: 'Fecha de fin para el filtro de rango',
    format: 'date-time',
    example: '2023-12-31T23:59:59Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Fecha de fin inválida' })
  @Type(() => Date)
  endDate?: Date;

  /**
   * Búsqueda de texto en el asunto
   * 
   * @required No
   * @maxLength 100
   * @example 'acceso'
   */
  @ApiPropertyOptional({
    description: 'Búsqueda de texto en el asunto',
    maxLength: 100,
    example: 'acceso',
  })
  @IsOptional()
  @IsString({ message: 'La búsqueda debe ser una cadena de texto' })
  @MaxLength(100, { message: 'La búsqueda no puede exceder 100 caracteres' })
  search?: string;

  /**
   * Filtrar por email específico
   * 
   * @required No
   * @format email
   * @example 'usuario@email.com'
   */
  @ApiPropertyOptional({
    description: 'Filtrar por email específico',
    format: 'email',
    example: 'usuario@email.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email inválido' })
  email?: string;
}

/**
 * DTO para estadísticas de contactos
 * 
 * @description Estructura de respuesta para estadísticas de contactos
 * 
 * @example
 * ```typescript
 * const stats: ContactStatsDto = {
 *   total: 150,
 *   byType: {
 *     [ContactType.GENERAL]: 50,
 *     [ContactType.COMPLAINT]: 30,
 *     // ...
 *   },
 *   byStatus: {
 *     [ContactStatus.PENDING]: 20,
 *     [ContactStatus.RESOLVED]: 100,
 *     // ...
 *   },
 *   avgResponseTime: 4.5,
 *   recentTrend: 15
 * };
 * ```
 */
export class ContactStatsDto {
  /**
   * Total de contactos
   * 
   * @example 150
   */
  @ApiProperty({
    description: 'Total de contactos',
    example: 150,
  })
  total: number;

  /**
   * Contactos agrupados por tipo
   * 
   * @example { "general": 50, "complaint": 30, "support": 25 }
   */
  @ApiProperty({
    description: 'Contactos agrupados por tipo',
    example: { general: 50, complaint: 30, support: 25 },
  })
  byType: Record<ContactType, number>;

  /**
   * Contactos agrupados por estado
   * 
   * @example { "pending": 20, "resolved": 100, "closed": 30 }
   */
  @ApiProperty({
    description: 'Contactos agrupados por estado',
    example: { pending: 20, resolved: 100, closed: 30 },
  })
  byStatus: Record<ContactStatus, number>;

  /**
   * Tiempo promedio de respuesta en horas
   * 
   * @example 4.5
   */
  @ApiProperty({
    description: 'Tiempo promedio de respuesta en horas',
    example: 4.5,
  })
  avgResponseTime: number;

  /**
   * Tendencia reciente (porcentaje de cambio)
   * 
   * @example 15
   */
  @ApiProperty({
    description: 'Tendencia reciente (porcentaje de cambio)',
    example: 15,
  })
  recentTrend: number;
}

/**
 * DTO para redes sociales
 */
export class SocialMediaDto {
  /**
   * URL de Facebook
   * 
   * @required No
   * @format url
   * @example 'https://facebook.com/acalud'
   */
  @ApiPropertyOptional({
    description: 'URL de Facebook',
    format: 'url',
    example: 'https://facebook.com/acalud',
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL de Facebook inválida' })
  facebook?: string;

  /**
   * URL de Twitter
   * 
   * @required No
   * @format url
   * @example 'https://twitter.com/acalud'
   */
  @ApiPropertyOptional({
    description: 'URL de Twitter',
    format: 'url',
    example: 'https://twitter.com/acalud',
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL de Twitter inválida' })
  twitter?: string;

  /**
   * URL de Instagram
   * 
   * @required No
   * @format url
   * @example 'https://instagram.com/acalud'
   */
  @ApiPropertyOptional({
    description: 'URL de Instagram',
    format: 'url',
    example: 'https://instagram.com/acalud',
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL de Instagram inválida' })
  instagram?: string;

  /**
   * URL de LinkedIn
   * 
   * @required No
   * @format url
   * @example 'https://linkedin.com/company/acalud'
   */
  @ApiPropertyOptional({
    description: 'URL de LinkedIn',
    format: 'url',
    example: 'https://linkedin.com/company/acalud',
  })
  @IsOptional()
  @IsUrl({}, { message: 'URL de LinkedIn inválida' })
  linkedin?: string;
}

/**
 * DTO para información institucional
 * 
 * @description Estructura de respuesta para información general de la institución
 * 
 * @example
 * ```typescript
 * const info: InstitutionalInfoDto = {
 *   name: 'AcaLud - Plataforma Educativa',
 *   description: 'Plataforma innovadora...',
 *   address: 'Av. Educación 123',
 *   phone: '+54 11 1234-5678',
 *   email: 'contacto@acalud.edu',
 *   // ...
 * };
 * ```
 */
export class InstitutionalInfoDto {
  /**
   * Nombre de la institución
   * 
   * @example 'AcaLud - Plataforma Educativa'
   */
  @ApiProperty({
    description: 'Nombre de la institución',
    example: 'AcaLud - Plataforma Educativa',
  })
  name: string;

  /**
   * Descripción de la institución
   * 
   * @example 'Plataforma innovadora que conecta docentes, estudiantes y familias...'
   */
  @ApiProperty({
    description: 'Descripción de la institución',
    example: 'Plataforma innovadora que conecta docentes, estudiantes y familias...',
  })
  description: string;

  /**
   * Dirección física
   * 
   * @example 'Av. Educación 123, Ciudad Educativa'
   */
  @ApiProperty({
    description: 'Dirección física',
    example: 'Av. Educación 123, Ciudad Educativa',
  })
  address: string;

  /**
   * Teléfono de contacto
   * 
   * @example '+54 11 1234-5678'
   */
  @ApiProperty({
    description: 'Teléfono de contacto',
    example: '+54 11 1234-5678',
  })
  phone: string;

  /**
   * Email de contacto
   * 
   * @format email
   * @example 'contacto@acalud.edu'
   */
  @ApiProperty({
    description: 'Email de contacto',
    format: 'email',
    example: 'contacto@acalud.edu',
  })
  email: string;

  /**
   * Sitio web
   * 
   * @format url
   * @example 'https://acalud.edu'
   */
  @ApiProperty({
    description: 'Sitio web',
    format: 'url',
    example: 'https://acalud.edu',
  })
  website: string;

  /**
   * Horarios de atención
   * 
   * @example 'Lunes a Viernes: 8:00 - 18:00, Sábados: 9:00 - 13:00'
   */
  @ApiProperty({
    description: 'Horarios de atención',
    example: 'Lunes a Viernes: 8:00 - 18:00, Sábados: 9:00 - 13:00',
  })
  supportHours: string;

  /**
   * Redes sociales
   */
  @ApiProperty({
    description: 'Enlaces a redes sociales',
    type: SocialMediaDto,
  })
  @ValidateNested()
  @Type(() => SocialMediaDto)
  socialMedia: SocialMediaDto;

  /**
   * Misión de la institución
   * 
   * @example 'Transformar la educación mediante tecnología innovadora...'
   */
  @ApiProperty({
    description: 'Misión de la institución',
    example: 'Transformar la educación mediante tecnología innovadora...',
  })
  mission: string;

  /**
   * Visión de la institución
   * 
   * @example 'Ser la plataforma educativa líder en Latinoamérica...'
   */
  @ApiProperty({
    description: 'Visión de la institución',
    example: 'Ser la plataforma educativa líder en Latinoamérica...',
  })
  vision: string;

  /**
   * Valores institucionales
   * 
   * @example ['Innovación educativa', 'Accesibilidad universal', ...]
   */
  @ApiProperty({
    description: 'Valores institucionales',
    type: [String],
    example: ['Innovación educativa', 'Accesibilidad universal', 'Colaboración comunitaria'],
  })
  @IsArray({ message: 'Los valores deben ser un array' })
  @IsString({ each: true, message: 'Cada valor debe ser una cadena de texto' })
  values: string[];
}