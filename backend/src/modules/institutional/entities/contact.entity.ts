/**
 * 🏛️ ENTIDAD DE CONTACTO - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Representa un mensaje de contacto o reclamo enviado desde la página institucional.
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Responsabilidad única de representar datos de contacto
 * - OCP: Extensible para nuevos tipos de contacto sin modificar la entidad base
 * - LSP: Implementa correctamente la interfaz de entidad de TypeORM
 * - ISP: No fuerza dependencias innecesarias
 * - DIP: Depende de abstracciones (decoradores de TypeORM)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { IsEmail, IsNotEmpty, IsString, IsEnum, MaxLength, MinLength } from 'class-validator';

/**
 * Tipos de contacto disponibles para categorizar los mensajes
 */
export enum ContactType {
  GENERAL = 'general',           // Consulta general
  SUPPORT = 'support',           // Soporte técnico
  COMPLAINT = 'complaint',       // Reclamo o queja
  SUGGESTION = 'suggestion',     // Sugerencia de mejora
  BUG_REPORT = 'bug_report',     // Reporte de error
  FEATURE_REQUEST = 'feature_request', // Solicitud de funcionalidad
}

/**
 * Estados de procesamiento del mensaje de contacto
 */
export enum ContactStatus {
  PENDING = 'pending',           // Pendiente de revisión
  IN_PROGRESS = 'in_progress',   // En proceso de resolución
  RESOLVED = 'resolved',         // Resuelto
  CLOSED = 'closed',             // Cerrado sin resolución
}

/**
 * Entidad Contact - Almacena mensajes de contacto desde la página institucional
 * 
 * @description Esta entidad maneja todos los mensajes de contacto, reclamos y consultas
 * que los usuarios envían desde la página pública de la institución.
 * 
 * @example
 * ```typescript
 * const contact = new Contact();
 * contact.name = 'Juan Pérez';
 * contact.email = 'juan@email.com';
 * contact.type = ContactType.COMPLAINT;
 * contact.subject = 'Problema con el login';
 * contact.message = 'No puedo acceder a mi cuenta...';
 * await contactRepository.save(contact);
 * ```
 */
@Entity('contacts')
@Index(['status', 'createdAt']) // Índice para búsquedas eficientes por estado y fecha
@Index(['type', 'createdAt'])   // Índice para filtrar por tipo y fecha
export class Contact {
  /**
   * Identificador único del mensaje de contacto
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Nombre completo de la persona que envía el mensaje
   * 
   * @validation Entre 2 y 100 caracteres
   * @required Sí
   */
  @Column({ length: 100 })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  name: string;

  /**
   * Dirección de email para la respuesta
   * 
   * @validation Formato de email válido
   * @required Sí
   */
  @Column({ length: 255 })
  @IsEmail({}, { message: 'Debe proporcionar un email válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  @MaxLength(255, { message: 'El email no puede exceder 255 caracteres' })
  email: string;

  /**
   * Número de teléfono opcional para contacto
   * 
   * @validation Opcional, hasta 20 caracteres
   * @required No
   */
  @Column({ length: 20, nullable: true })
  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @MaxLength(20, { message: 'El teléfono no puede exceder 20 caracteres' })
  phone?: string;

  /**
   * Tipo de contacto para categorización
   * 
   * @validation Debe ser uno de los valores de ContactType
   * @required Sí
   * @default ContactType.GENERAL
   */
  @Column({
    type: 'enum',
    enum: ContactType,
    default: ContactType.GENERAL,
  })
  @IsEnum(ContactType, { message: 'Tipo de contacto inválido' })
  type: ContactType;

  /**
   * Asunto o título del mensaje
   * 
   * @validation Entre 5 y 200 caracteres
   * @required Sí
   */
  @Column({ length: 200 })
  @IsString({ message: 'El asunto debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El asunto es obligatorio' })
  @MinLength(5, { message: 'El asunto debe tener al menos 5 caracteres' })
  @MaxLength(200, { message: 'El asunto no puede exceder 200 caracteres' })
  subject: string;

  /**
   * Contenido completo del mensaje
   * 
   * @validation Entre 10 y 2000 caracteres
   * @required Sí
   */
  @Column({ type: 'text' })
  @IsString({ message: 'El mensaje debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El mensaje es obligatorio' })
  @MinLength(10, { message: 'El mensaje debe tener al menos 10 caracteres' })
  @MaxLength(2000, { message: 'El mensaje no puede exceder 2000 caracteres' })
  message: string;

  /**
   * Estado actual del procesamiento del mensaje
   * 
   * @validation Debe ser uno de los valores de ContactStatus
   * @required Sí
   * @default ContactStatus.PENDING
   */
  @Column({
    type: 'enum',
    enum: ContactStatus,
    default: ContactStatus.PENDING,
  })
  @IsEnum(ContactStatus, { message: 'Estado de contacto inválido' })
  status: ContactStatus;

  /**
   * Dirección IP desde donde se envió el mensaje (para auditoria)
   * 
   * @security Útil para detectar spam o abuso
   * @required No
   */
  @Column({ length: 45, nullable: true }) // IPv6 puede tener hasta 45 caracteres
  ipAddress?: string;

  /**
   * User-Agent del navegador (para análisis técnico)
   * 
   * @security Útil para detectar bots o automatización
   * @required No
   */
  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  /**
   * Respuesta del administrador (si corresponde)
   * 
   * @admin Solo los administradores pueden completar este campo
   * @required No
   */
  @Column({ type: 'text', nullable: true })
  adminResponse?: string;

  /**
   * ID del administrador que procesó el mensaje
   * 
   * @admin Referencia al usuario administrador
   * @required No
   */
  @Column({ type: 'uuid', nullable: true })
  processedByAdminId?: string;

  /**
   * Fecha de procesamiento del mensaje
   * 
   * @admin Se establece automáticamente cuando se procesa
   * @required No
   */
  @Column({ type: 'timestamp', nullable: true })
  processedAt?: Date;

  /**
   * Fecha de creación del registro
   * 
   * @automatic Se establece automáticamente al crear
   * @readonly No se puede modificar después de la creación
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Fecha de última actualización del registro
   * 
   * @automatic Se actualiza automáticamente en cada modificación
   * @readonly Gestionado por TypeORM
   */
  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Constructor para crear una nueva instancia de Contact
   * 
   * @param partial Datos parciales para inicializar la entidad
   * 
   * @example
   * ```typescript
   * const contact = new Contact({
   *   name: 'María García',
   *   email: 'maria@email.com',
   *   type: ContactType.SUPPORT,
   *   subject: 'Error en la plataforma',
   *   message: 'Descripción del problema...'
   * });
   * ```
   */
  constructor(partial?: Partial<Contact>) {
    if (partial) {
      Object.assign(this, partial);
    }
  }

  /**
   * Verifica si el mensaje está pendiente de procesamiento
   * 
   * @returns true si el mensaje está en estado PENDING
   */
  isPending(): boolean {
    return this.status === ContactStatus.PENDING;
  }

  /**
   * Verifica si el mensaje está siendo procesado
   * 
   * @returns true si el mensaje está en estado IN_PROGRESS
   */
  isInProgress(): boolean {
    return this.status === ContactStatus.IN_PROGRESS;
  }

  /**
   * Verifica si el mensaje ha sido resuelto
   * 
   * @returns true si el mensaje está en estado RESOLVED
   */
  isResolved(): boolean {
    return this.status === ContactStatus.RESOLVED;
  }

  /**
   * Verifica si el mensaje está cerrado
   * 
   * @returns true si el mensaje está en estado CLOSED
   */
  isClosed(): boolean {
    return this.status === ContactStatus.CLOSED;
  }

  /**
   * Marca el mensaje como en proceso
   * 
   * @param adminId ID del administrador que procesa el mensaje
   */
  markAsInProgress(adminId: string): void {
    this.status = ContactStatus.IN_PROGRESS;
    this.processedByAdminId = adminId;
    this.processedAt = new Date();
  }

  /**
   * Marca el mensaje como resuelto
   * 
   * @param adminId ID del administrador que resuelve el mensaje
   * @param response Respuesta del administrador
   */
  markAsResolved(adminId: string, response: string): void {
    this.status = ContactStatus.RESOLVED;
    this.processedByAdminId = adminId;
    this.adminResponse = response;
    this.processedAt = new Date();
  }

  /**
   * Marca el mensaje como cerrado sin resolución
   * 
   * @param adminId ID del administrador que cierra el mensaje
   * @param reason Razón del cierre (opcional)
   */
  markAsClosed(adminId: string, reason?: string): void {
    this.status = ContactStatus.CLOSED;
    this.processedByAdminId = adminId;
    if (reason) {
      this.adminResponse = reason;
    }
    this.processedAt = new Date();
  }
}