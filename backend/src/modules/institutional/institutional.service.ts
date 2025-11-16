/**
 * 🏛️ SERVICIO INSTITUCIONAL - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Maneja toda la lógica de negocio relacionada con la página institucional:
 * - Procesamiento de mensajes de contacto
 * - Gestión de información institucional
 * - Manejo de reclamos y consultas
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Responsabilidad única de lógica institucional
 * - OCP: Extensible para nuevos tipos de servicios institucionales
 * - LSP: Implementa contratos bien definidos
 * - ISP: Interfaces segregadas por funcionalidad
 * - DIP: Depende de abstracciones (repositorios, interfaces)
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Between, Like, FindOptionsWhere } from 'typeorm';
import { Contact, ContactType, ContactStatus } from './entities/contact.entity';
import { 
  CreateContactDto, 
  UpdateContactDto, 
  ContactFilterDto, 
  InstitutionalInfoDto 
} from './dto';
import { PaginationDto, PaginatedResponse } from '../../common/dto';

/**
 * Interface para estadísticas de contactos
 */
interface ContactStatistics {
  total: number;
  byType: Record<ContactType, number>;
  byStatus: Record<ContactStatus, number>;
  avgResponseTime: number; // En horas
  recentTrend: number; // Porcentaje de cambio vs período anterior
}

/**
 * Interface para configuración de respuesta automática
 */
interface AutoResponseConfig {
  enabled: boolean;
  templates: Record<ContactType, string>;
  escalationRules: EscalationRule[];
}

/**
 * Interface para reglas de escalación
 */
interface EscalationRule {
  type: ContactType;
  hoursWithoutResponse: number;
  escalateToRole: string;
  notificationMessage: string;
}

/**
 * Servicio institucional que maneja toda la lógica de negocio
 * relacionada con la página institucional y sistema de contacto
 * 
 * @description Este servicio implementa todas las operaciones CRUD para contactos,
 * así como funcionalidades avanzadas como estadísticas, auto-respuestas y escalación.
 * 
 * @example
 * ```typescript
 * const contact = await institutionalService.createContact({
 *   name: 'Juan Pérez',
 *   email: 'juan@email.com',
 *   type: ContactType.COMPLAINT,
 *   subject: 'Problema con acceso',
 *   message: 'No puedo acceder a mi cuenta...'
 * });
 * ```
 */
@Injectable()
export class InstitutionalService {
  /**
   * Logger para registrar operaciones y errores
   */
  private readonly logger = new Logger(InstitutionalService.name);

  /**
   * Configuración de respuestas automáticas
   */
  private autoResponseConfig: AutoResponseConfig = {
    enabled: true,
    templates: {
      [ContactType.GENERAL]: 'Gracias por contactarnos. Hemos recibido tu consulta y te responderemos dentro de 24 horas.',
      [ContactType.SUPPORT]: 'Hemos recibido tu solicitud de soporte técnico. Nuestro equipo la revisará y te contactará pronto.',
      [ContactType.COMPLAINT]: 'Lamentamos los inconvenientes. Hemos registrado tu reclamo y lo resolveremos con la mayor prioridad.',
      [ContactType.SUGGESTION]: 'Agradecemos tu sugerencia. La evaluaremos y consideraremos para futuras mejoras.',
      [ContactType.BUG_REPORT]: 'Gracias por reportar este error. Nuestro equipo técnico lo investigará inmediatamente.',
      [ContactType.FEATURE_REQUEST]: 'Hemos recibido tu solicitud de funcionalidad. La evaluaremos para futuras versiones.',
    },
    escalationRules: [
      {
        type: ContactType.COMPLAINT,
        hoursWithoutResponse: 2,
        escalateToRole: 'ADMIN',
        notificationMessage: 'Reclamo sin respuesta por más de 2 horas'
      },
      {
        type: ContactType.BUG_REPORT,
        hoursWithoutResponse: 4,
        escalateToRole: 'TECH_LEAD',
        notificationMessage: 'Reporte de error crítico sin atender'
      }
    ]
  };

  constructor(
    @InjectRepository(Contact)
    private readonly contactRepository: Repository<Contact>,
  ) {
    this.logger.log('🏛️ InstitutionalService inicializado correctamente');
  }

  /**
   * Crea un nuevo mensaje de contacto
   * 
   * @param createContactDto Datos del contacto a crear
   * @param ipAddress Dirección IP del remitente (opcional)
   * @param userAgent User-Agent del navegador (opcional) 
   * @returns Contacto creado
   * 
   * @throws BadRequestException Si los datos son inválidos
   * @throws InternalServerErrorException Si hay error en la base de datos
   * 
   * @example
   * ```typescript
   * const contact = await institutionalService.createContact({
   *   name: 'María García',
   *   email: 'maria@email.com',
   *   type: ContactType.SUPPORT,
   *   subject: 'Error en login',
   *   message: 'No puedo acceder con mis credenciales'
   * }, '192.168.1.1', 'Mozilla/5.0...');
   * ```
   */
  async createContact(
    createContactDto: CreateContactDto,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Contact> {
    this.logger.log(`📝 Creando nuevo contacto de tipo: ${createContactDto.type}`);

    try {
      // Validar que no sea spam (mismo email en los últimos 5 minutos)
      await this.validateNotSpam(createContactDto.email);

      // Crear la entidad de contacto
      const contact = new Contact({
        ...createContactDto,
        ipAddress,
        userAgent,
        status: ContactStatus.PENDING,
      });

      // Validar la entidad
      await this.validateContactData(contact);

      // Guardar en la base de datos
      const savedContact = await this.contactRepository.save(contact);

      // Enviar respuesta automática si está habilitada
      if (this.autoResponseConfig.enabled) {
        await this.sendAutoResponse(savedContact);
      }

      // Programar escalación si es necesaria
      await this.scheduleEscalationIfNeeded(savedContact);

      this.logger.log(`✅ Contacto creado exitosamente con ID: ${savedContact.id}`);
      return savedContact;

    } catch (error) {
      this.logger.error(`❌ Error creando contacto: ${error.message}`, error.stack);
      
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }
      
      throw new InternalServerErrorException(
        'Error interno del servidor al crear el contacto'
      );
    }
  }

  /**
   * Obtiene una lista paginada de contactos con filtros opcionales
   * 
   * @param filters Filtros de búsqueda
   * @param pagination Parámetros de paginación
   * @returns Lista paginada de contactos
   * 
   * @throws BadRequestException Si los parámetros son inválidos
   * @throws InternalServerErrorException Si hay error en la consulta
   * 
   * @example
   * ```typescript
   * const contacts = await institutionalService.findContacts(
   *   { type: ContactType.COMPLAINT, status: ContactStatus.PENDING },
   *   { page: 1, limit: 10 }
   * );
   * ```
   */
  async findContacts(
    filters: ContactFilterDto = {},
    pagination: PaginationDto = { page: 1, limit: 10 }
  ): Promise<PaginatedResponse<Contact>> {
    this.logger.log(`🔍 Buscando contactos con filtros: ${JSON.stringify(filters)}`);

    try {
      // Validar parámetros de paginación
      this.validatePaginationParams(pagination);

      // Construir opciones de consulta
      const queryOptions = this.buildContactQuery(filters, pagination);

      // Ejecutar consulta con conteo
      const [contacts, total] = await this.contactRepository.findAndCount(queryOptions);

      const totalPages = Math.ceil(total / pagination.limit);

      this.logger.log(`📊 Encontrados ${total} contactos, página ${pagination.page}/${totalPages}`);

      return {
        data: contacts,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
          hasNext: pagination.page < totalPages,
          hasPrev: pagination.page > 1,
        },
      };

    } catch (error) {
      this.logger.error(`❌ Error buscando contactos: ${error.message}`, error.stack);
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new InternalServerErrorException(
        'Error interno del servidor al buscar contactos'
      );
    }
  }

  /**
   * Obtiene un contacto específico por ID
   * 
   * @param id ID del contacto
   * @returns Contacto encontrado
   * 
   * @throws NotFoundException Si el contacto no existe
   * @throws BadRequestException Si el ID es inválido
   * 
   * @example
   * ```typescript
   * const contact = await institutionalService.findContactById('uuid-here');
   * ```
   */
  async findContactById(id: string): Promise<Contact> {
    this.logger.log(`🔍 Buscando contacto con ID: ${id}`);

    // Validar formato de UUID
    if (!this.isValidUUID(id)) {
      throw new BadRequestException('ID de contacto inválido');
    }

    try {
      const contact = await this.contactRepository.findOne({
        where: { id },
      });

      if (!contact) {
        this.logger.warn(`⚠️ Contacto no encontrado con ID: ${id}`);
        throw new NotFoundException(`Contacto con ID ${id} no encontrado`);
      }

      this.logger.log(`✅ Contacto encontrado: ${contact.subject}`);
      return contact;

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`❌ Error buscando contacto: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        'Error interno del servidor al buscar el contacto'
      );
    }
  }

  /**
   * Actualiza un contacto existente (solo para administradores)
   * 
   * @param id ID del contacto
   * @param updateContactDto Datos a actualizar
   * @param adminId ID del administrador que hace la actualización
   * @returns Contacto actualizado
   * 
   * @throws NotFoundException Si el contacto no existe
   * @throws BadRequestException Si los datos son inválidos
   * 
   * @example
   * ```typescript
   * const updatedContact = await institutionalService.updateContact(
   *   'contact-id',
   *   { status: ContactStatus.RESOLVED, adminResponse: 'Problema resuelto' },
   *   'admin-id'
   * );
   * ```
   */
  async updateContact(
    id: string,
    updateContactDto: UpdateContactDto,
    adminId: string
  ): Promise<Contact> {
    this.logger.log(`📝 Actualizando contacto ${id} por admin ${adminId}`);

    try {
      // Buscar el contacto existente
      const contact = await this.findContactById(id);

      // Aplicar las actualizaciones
      Object.assign(contact, updateContactDto);

      // Si se está cambiando el estado, registrar el admin y fecha
      if (updateContactDto.status && updateContactDto.status !== contact.status) {
        contact.processedByAdminId = adminId;
        contact.processedAt = new Date();
      }

      // Validar los datos actualizados
      await this.validateContactData(contact);

      // Guardar cambios
      const updatedContact = await this.contactRepository.save(contact);

      this.logger.log(`✅ Contacto actualizado exitosamente: ${updatedContact.id}`);
      return updatedContact;

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`❌ Error actualizando contacto: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        'Error interno del servidor al actualizar el contacto'
      );
    }
  }

  /**
   * Elimina un contacto (solo para administradores)
   * 
   * @param id ID del contacto
   * @param adminId ID del administrador que elimina
   * 
   * @throws NotFoundException Si el contacto no existe
   * 
   * @example
   * ```typescript
   * await institutionalService.deleteContact('contact-id', 'admin-id');
   * ```
   */
  async deleteContact(id: string, adminId: string): Promise<void> {
    this.logger.log(`🗑️ Eliminando contacto ${id} por admin ${adminId}`);

    try {
      // Verificar que el contacto existe
      const contact = await this.findContactById(id);

      // Eliminar el contacto
      await this.contactRepository.remove(contact);

      this.logger.log(`✅ Contacto eliminado exitosamente: ${id}`);

    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`❌ Error eliminando contacto: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        'Error interno del servidor al eliminar el contacto'
      );
    }
  }

  /**
   * Obtiene estadísticas de contactos
   * 
   * @param startDate Fecha de inicio (opcional)
   * @param endDate Fecha de fin (opcional)
   * @returns Estadísticas de contactos
   * 
   * @example
   * ```typescript
   * const stats = await institutionalService.getContactStatistics(
   *   new Date('2023-01-01'),
   *   new Date('2023-12-31')
   * );
   * ```
   */
  async getContactStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<ContactStatistics> {
    this.logger.log('📊 Generando estadísticas de contactos');

    try {
  const whereCondition: FindOptionsWhere<Contact> = {};
      
      if (startDate && endDate) {
        whereCondition.createdAt = Between(startDate, endDate);
      }

      // Obtener todos los contactos en el rango
  const contacts = await this.contactRepository.find({ where: whereCondition });

      // Calcular estadísticas por tipo
      const byType: Record<ContactType, number> = {} as Record<ContactType, number>;
      (Object.values(ContactType) as ContactType[]).forEach(type => {
        byType[type] = contacts.filter(c => c.type === type).length;
      });

      // Calcular estadísticas por estado
      const byStatus: Record<ContactStatus, number> = {} as Record<ContactStatus, number>;
      (Object.values(ContactStatus) as ContactStatus[]).forEach(status => {
        byStatus[status] = contacts.filter(c => c.status === status).length;
      });

      // Calcular tiempo promedio de respuesta
      const resolvedContacts = contacts.filter(c => c.processedAt);
      const avgResponseTime = resolvedContacts.length > 0
        ? resolvedContacts.reduce((acc, contact) => {
            const responseTime = contact.processedAt.getTime() - contact.createdAt.getTime();
            return acc + (responseTime / (1000 * 60 * 60)); // Convertir a horas
          }, 0) / resolvedContacts.length
        : 0;

      // Calcular tendencia (comparar con período anterior)
      const recentTrend = await this.calculateRecentTrend(contacts.length, startDate, endDate);

      const statistics: ContactStatistics = {
        total: contacts.length,
        byType,
        byStatus,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        recentTrend,
      };

      this.logger.log(`📈 Estadísticas generadas: ${statistics.total} contactos totales`);
      return statistics;

    } catch (error) {
      this.logger.error(`❌ Error generando estadísticas: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        'Error interno del servidor al generar estadísticas'
      );
    }
  }

  /**
   * Obtiene información institucional básica
   * 
   * @returns Información institucional
   * 
   * @example
   * ```typescript
   * const info = await institutionalService.getInstitutionalInfo();
   * ```
   */
  async getInstitutionalInfo(): Promise<InstitutionalInfoDto> {
    this.logger.log('🏛️ Obteniendo información institucional');

    // Esta información podría venir de una base de datos o configuración
    const info: InstitutionalInfoDto = {
      name: 'AcaLud - Plataforma Educativa',
      description: 'Plataforma innovadora que conecta docentes, estudiantes y familias para mejorar el aprendizaje mediante actividades gamificadas.',
      address: 'Av. Educación 123, Ciudad Educativa',
      phone: '+54 11 1234-5678',
      email: 'contacto@acalud.edu',
      website: 'https://acalud.edu',
      supportHours: 'Lunes a Viernes: 8:00 - 18:00, Sábados: 9:00 - 13:00',
      socialMedia: {
        facebook: 'https://facebook.com/acalud',
        twitter: 'https://twitter.com/acalud',
        instagram: 'https://instagram.com/acalud',
        linkedin: 'https://linkedin.com/company/acalud',
      },
      mission: 'Transformar la educación mediante tecnología innovadora y metodologías lúdicas que potencien el aprendizaje.',
      vision: 'Ser la plataforma educativa líder en Latinoamérica, conectando comunidades educativas globalmente.',
      values: [
        'Innovación educativa',
        'Accesibilidad universal',
        'Colaboración comunitaria',
        'Excelencia académica',
        'Desarrollo integral'
      ],
    };

    return info;
  }

  // =============================================================================
  // MÉTODOS PRIVADOS - LÓGICA INTERNA DEL SERVICIO
  // =============================================================================

  /**
   * Valida que no sea spam basado en email y tiempo
   */
  private async validateNotSpam(email: string): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const recentContact = await this.contactRepository.findOne({
      where: {
        email,
        createdAt: Between(fiveMinutesAgo, new Date()),
      },
    });

    if (recentContact) {
      throw new ConflictException(
        'Ya has enviado un mensaje recientemente. Por favor espera 5 minutos antes de enviar otro.'
      );
    }
  }

  /**
   * Valida los datos del contacto
   */
  private async validateContactData(contact: Contact): Promise<void> {
    // Validaciones adicionales más allá de las del DTO
  if (contact.phone && !/^\+?[0-9\s()-]+$/.test(contact.phone)) {
      throw new BadRequestException('Formato de teléfono inválido');
    }

    if (contact.message.includes('<script>') || contact.message.includes('javascript:')) {
      throw new BadRequestException('Contenido de mensaje no permitido');
    }
  }

  /**
   * Construye la consulta para buscar contactos
   */
  private buildContactQuery(
    filters: ContactFilterDto,
    pagination: PaginationDto
  ): FindManyOptions<Contact> {
  const where: FindOptionsWhere<Contact> = {};

    // Aplicar filtros
    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate && filters.endDate) {
      where.createdAt = Between(filters.startDate, filters.endDate);
    }

    if (filters.search) {
      where.subject = Like(`%${filters.search}%`);
    }

    if (filters.email) {
      where.email = filters.email;
    }

    return {
      where,
      order: { createdAt: 'DESC' },
      take: pagination.limit,
      skip: (pagination.page - 1) * pagination.limit,
    };
  }

  /**
   * Valida parámetros de paginación
   */
  private validatePaginationParams(pagination: PaginationDto): void {
    if (pagination.page < 1) {
      throw new BadRequestException('La página debe ser mayor a 0');
    }

    if (pagination.limit < 1 || pagination.limit > 100) {
      throw new BadRequestException('El límite debe estar entre 1 y 100');
    }
  }

  /**
   * Valida formato de UUID
   */
  private isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Envía respuesta automática
   */
  private async sendAutoResponse(contact: Contact): Promise<void> {
    const template = this.autoResponseConfig.templates[contact.type];
    
    // Aquí se integraría con un servicio de email
    this.logger.log(`📧 Enviando respuesta automática a ${contact.email}: ${template.substring(0, 50)}...`);
    
    // TODO: Integrar con servicio de email real
  }

  /**
   * Programa escalación si es necesaria
   */
  private async scheduleEscalationIfNeeded(contact: Contact): Promise<void> {
    const rule = this.autoResponseConfig.escalationRules.find(r => r.type === contact.type);
    
    if (rule) {
      this.logger.log(`⏰ Programando escalación para ${contact.type} en ${rule.hoursWithoutResponse} horas`);
      
      // TODO: Integrar con sistema de colas/scheduler
    }
  }

  /**
   * Calcula tendencia reciente comparando con período anterior
   */
  private async calculateRecentTrend(
    currentCount: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<number> {
    if (!startDate || !endDate) {
      return 0;
    }

    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodDuration);
    const previousEndDate = startDate;

    const previousContacts = await this.contactRepository.count({
      where: {
        createdAt: Between(previousStartDate, previousEndDate),
      },
    });

    if (previousContacts === 0) {
      return currentCount > 0 ? 100 : 0;
    }

    return Math.round(((currentCount - previousContacts) / previousContacts) * 100);
  }
}