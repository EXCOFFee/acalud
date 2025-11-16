/**
 * 📅 CALENDAR SERVICE - SERVICIO PRINCIPAL DEL CALENDARIO
 * 
 * Servicio básico para la gestión del sistema de calendario académico.
 * Implementa las operaciones CRUD fundamentales.
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron } from '@nestjs/schedule';
import {
  Repository,
  SelectQueryBuilder,
  Between,
} from 'typeorm';

// Entidades
import { Event } from './entities/event.entity';
import { EventCategory } from './entities/event-category.entity';
import { EventAttendee } from './entities/event-attendee.entity';
import { EventReminder } from './entities/event-reminder.entity';

// DTOs
import {
  CreateEventDto,
  UpdateEventDto,
  CreateEventCategoryDto,
  UpdateEventCategoryDto,
  AddAttendeeDto,
  AddMultipleAttendeesDto,
  UpdateAttendeeDto,
  MarkAttendanceDto,
  CreateReminderDto,
  CreateBulkRemindersDto,
  EventQueryDto,
  CategoryQueryDto,
  CalendarStatsQueryDto,
  PaginatedResponse,
  StatsResponse,
  MonthlyCalendarResponse,
} from './dto';

// Enums
import {
  EventStatus,
} from './entities/event.entity';
import {
  InvitationStatus,
  AttendanceStatus,
  AttendeeRole,
} from './entities/event-attendee.entity';
import {
  ReminderStatus,
  ReminderTrigger,
} from './entities/event-reminder.entity';

interface AttendanceStatsSummary {
  totalInvitations: number;
  acceptedInvitations: number;
  declinedInvitations: number;
  attendanceRate: number;
}

@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    
    @InjectRepository(EventCategory)
    private readonly categoryRepository: Repository<EventCategory>,
    
    @InjectRepository(EventAttendee)
    private readonly attendeeRepository: Repository<EventAttendee>,
    
    @InjectRepository(EventReminder)
    private readonly reminderRepository: Repository<EventReminder>,
  ) {}

  // =============================================================================
  // 📅 GESTIÓN DE EVENTOS
  // =============================================================================

  /**
   * 🆕 Crear un nuevo evento
   */
  async createEvent(
    createEventDto: CreateEventDto,
    _createdBy: string,
  ): Promise<Event> {
    this.logger.log(`Creating event: ${createEventDto.title}`);

    try {
      // 1. Validar datos de entrada
      await this.validateEventData(createEventDto);

      // 2. Crear el evento base
      const event = this.eventRepository.create({
        title: createEventDto.title,
        description: createEventDto.description,
        startDate: new Date(createEventDto.startDate),
        endDate: new Date(createEventDto.endDate),
        type: createEventDto.type,
        status: createEventDto.status || EventStatus.DRAFT,
        isAllDay: createEventDto.isAllDay || false,
        isPrivate: createEventDto.isPrivate || false,
        locationType: createEventDto.locationType,
        locationName: createEventDto.locationName,
        locationAddress: createEventDto.locationAddress,
        locationUrl: createEventDto.locationUrl,
        maxAttendees: createEventDto.maxAttendees,
        requiresApproval: createEventDto.requiresApproval || false,
        categoryId: createEventDto.categoryId,
        metadata: createEventDto.metadata || {},
      });

      // 3. Procesar recurrencia si es necesaria
      if (createEventDto.recurrenceRule) {
        event.recurrenceRule = createEventDto.recurrenceRule;
      }

      // 4. Configurar notificaciones
      if (createEventDto.notificationSettings) {
        event.notificationSettings = createEventDto.notificationSettings;
      }

      // 5. Guardar evento
      const savedEvent = await this.eventRepository.save(event);

      this.logger.log(`Event created successfully: ${savedEvent.id}`);
      return savedEvent;

    } catch (error) {
      this.logger.error(`Failed to create event: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 📝 Actualizar un evento existente
   */
  async updateEvent(
    eventId: string,
    updateEventDto: UpdateEventDto,
    updatedBy: string,
  ): Promise<Event> {
    this.logger.log(`Updating event: ${eventId}`);

    try {
      // 1. Obtener evento existente
      const existingEvent = await this.getEventById(eventId);

      // 2. Verificar permisos de edición
      await this.checkEditPermissions(existingEvent, updatedBy);

      // 3. Validar cambios
      await this.validateEventUpdate(existingEvent, updateEventDto);

      // 4. Verificar conflictos si cambió el horario
      if (this.hasTimeChanged(existingEvent, updateEventDto)) {
        await this.checkTimeConflicts(updateEventDto, updatedBy, eventId);
      }

      // 5. Aplicar cambios
      Object.assign(existingEvent, updateEventDto);
      existingEvent.updatedBy = updatedBy;
      existingEvent.updatedAt = new Date();

      // 6. Manejar cambios en recurrencia
      if (updateEventDto.recurrenceRule !== undefined) {
        await this.handleRecurrenceUpdate(existingEvent, updateEventDto);
      }

      // 7. Guardar cambios
      const updatedEvent = await this.eventRepository.save(existingEvent);

      // 8. Notificar asistentes si es necesario
      if (updateEventDto.notifyAttendees !== false) {
        await this.notifyEventUpdate(updatedEvent, updateEventDto.updateReason);
      }

      this.logger.log(`Event updated successfully: ${eventId}`);
      return this.getEventById(eventId);

    } catch (error) {
      this.logger.error(`Failed to update event: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 🗑️ Eliminar un evento
   */
  async deleteEvent(
    eventId: string,
    deletedBy: string,
    reason?: string,
  ): Promise<void> {
    this.logger.log(`Deleting event: ${eventId}`);

    try {
      const event = await this.getEventById(eventId);
      
      // Verificar permisos
      await this.checkEditPermissions(event, deletedBy);

      // Soft delete para mantener historial
      event.status = EventStatus.CANCELLED;
      event.updatedBy = deletedBy;
      event.updatedAt = new Date();
      
      if (reason) {
        event.metadata = { ...event.metadata, cancellationReason: reason };
      }

      await this.eventRepository.save(event);

      // Cancelar recordatorios pendientes
      await this.cancelEventReminders(eventId);

      // Notificar a asistentes
      await this.notifyEventCancellation(event, reason);

      this.logger.log(`Event deleted successfully: ${eventId}`);

    } catch (error) {
      this.logger.error(`Failed to delete event: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 🔍 Obtener evento por ID
   */
  async getEventById(
    eventId: string,
    includeRelations: boolean = true,
  ): Promise<Event> {
    const relations = includeRelations 
      ? ['category', 'attendees', 'attendees.user', 'reminders']
      : [];

    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations,
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    return event;
  }

  /**
   * 📋 Consultar eventos con filtros avanzados
   */
  async queryEvents(
    queryDto: EventQueryDto,
    userId?: string,
  ): Promise<PaginatedResponse<Event>> {
    this.logger.log(`Querying events with filters`);

    try {
      const queryBuilder = this.createEventQueryBuilder(queryDto, userId);

      // Aplicar paginación
      const page = queryDto.page || 1;
      const limit = queryDto.limit || 20;
      const offset = (page - 1) * limit;

      queryBuilder.skip(offset).take(limit);

      // Ejecutar consulta
      const [events, total] = await queryBuilder.getManyAndCount();

      // Calcular metadatos de paginación
      const totalPages = Math.ceil(total / limit);
      const hasNext = page < totalPages;
      const hasPrevious = page > 1;

      return {
        data: events,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext,
          hasPrevious,
        },
      };

    } catch (error) {
      this.logger.error(`Failed to query events: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================================================
  // 🏷️ GESTIÓN DE CATEGORÍAS
  // =============================================================================

  /**
   * 🆕 Crear nueva categoría
   */
  async createCategory(
    createCategoryDto: CreateEventCategoryDto,
    createdBy: string,
  ): Promise<EventCategory> {
    this.logger.log(`Creating category: ${createCategoryDto.name}`);

    try {
      // Validar jerarquía si tiene padre
      if (createCategoryDto.parentId) {
        await this.validateCategoryHierarchy(createCategoryDto.parentId);
      }

      const category = this.categoryRepository.create({
        ...createCategoryDto,
        createdBy,
      });

      const savedCategory = await this.categoryRepository.save(category);
      
      this.logger.log(`Category created successfully: ${savedCategory.id}`);
      return savedCategory;

    } catch (error) {
      this.logger.error(`Failed to create category: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 📝 Actualizar categoría
   */
  async updateCategory(
    categoryId: string,
    updateCategoryDto: UpdateEventCategoryDto,
    updatedBy: string,
  ): Promise<EventCategory> {
    this.logger.log(`Updating category: ${categoryId}`);

    try {
      const category = await this.categoryRepository.findOne({
        where: { id: categoryId },
      });

      if (!category) {
        throw new NotFoundException(`Category with ID ${categoryId} not found`);
      }

      // Validar cambios de jerarquía
      if (updateCategoryDto.parentId !== undefined) {
        await this.validateCategoryHierarchy(updateCategoryDto.parentId);
      }

      Object.assign(category, updateCategoryDto);
      category.updatedBy = updatedBy;
      category.updatedAt = new Date();

      const updatedCategory = await this.categoryRepository.save(category);
      
      this.logger.log(`Category updated successfully: ${categoryId}`);
      return updatedCategory;

    } catch (error) {
      this.logger.error(`Failed to update category: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 📋 Consultar categorías
   */
  async queryCategories(
    queryDto: CategoryQueryDto,
  ): Promise<PaginatedResponse<EventCategory>> {
    this.logger.log(`Querying categories`);

    try {
      const queryBuilder = this.categoryRepository.createQueryBuilder('category');

      // Aplicar filtros
      if (queryDto.status) {
        queryBuilder.andWhere('category.status = :status', { status: queryDto.status });
      }

      if (queryDto.visibility) {
        queryBuilder.andWhere('category.visibility = :visibility', { 
          visibility: queryDto.visibility 
        });
      }

      if (queryDto.parentId) {
        queryBuilder.andWhere('category.parentId = :parentId', { 
          parentId: queryDto.parentId 
        });
      }

      if (queryDto.rootOnly) {
        queryBuilder.andWhere('category.parentId IS NULL');
      }

      if (queryDto.search) {
        queryBuilder.andWhere('category.name ILIKE :search', { 
          search: `%${queryDto.search}%` 
        });
      }

      // Incluir estadísticas si se solicita
      if (queryDto.includeStats) {
        queryBuilder.loadRelationCountAndMap(
          'category.eventCount',
          'category.events'
        );
      }

      // Paginación
      const page = queryDto.page || 1;
      const limit = queryDto.limit || 20;
      const offset = (page - 1) * limit;

      queryBuilder.skip(offset).take(limit);
      queryBuilder.orderBy('category.name', 'ASC');

      const [categories, total] = await queryBuilder.getManyAndCount();

      return {
        data: categories,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrevious: page > 1,
        },
      };

    } catch (error) {
      this.logger.error(`Failed to query categories: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================================================
  // 👥 GESTIÓN DE ASISTENTES
  // =============================================================================

  /**
   * ➕ Agregar asistente a evento
   */
  async addAttendee(
    eventId: string,
    addAttendeeDto: AddAttendeeDto,
    addedBy: string,
  ): Promise<EventAttendee> {
    this.logger.log(`Adding attendee to event: ${eventId}`);

    try {
      // Verificar que el evento existe
      await this.getEventById(eventId, false);

      // Verificar que el usuario no sea ya asistente
      const existingAttendee = await this.attendeeRepository.findOne({
        where: { eventId, userId: addAttendeeDto.userId },
      });

      if (existingAttendee) {
        throw new ConflictException('User is already an attendee of this event');
      }

      // Crear asistente
      const attendee = this.attendeeRepository.create({
        eventId,
        userId: addAttendeeDto.userId,
        role: addAttendeeDto.role || AttendeeRole.PARTICIPANT,
        invitationStatus: addAttendeeDto.invitationStatus || InvitationStatus.PENDING,
        responseMessage: addAttendeeDto.invitationMessage,
        receiveReminders: addAttendeeDto.receiveReminders !== false,
        addedBy,
      });

      const savedAttendee = await this.attendeeRepository.save(attendee);

      // Enviar invitación si se solicita
      if (addAttendeeDto.sendInvitationNow !== false) {
        await this.sendInvitation(savedAttendee, addAttendeeDto.invitationMessage);
      }

      // Crear recordatorios personalizados si se configuraron
      if (addAttendeeDto.receiveReminders !== false) {
        await this.createAttendeeReminders(savedAttendee);
      }

      this.logger.log(`Attendee added successfully: ${savedAttendee.id}`);
      return savedAttendee;

    } catch (error) {
      this.logger.error(`Failed to add attendee: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * ➕➕ Agregar múltiples asistentes
   */
  async addMultipleAttendees(
    eventId: string,
    addMultipleDto: AddMultipleAttendeesDto,
    addedBy: string,
  ): Promise<EventAttendee[]> {
    this.logger.log(`Adding ${addMultipleDto.attendees.length} attendees to event: ${eventId}`);

    try {
      const results: EventAttendee[] = [];
      const errors: Array<{ userId: string; error: string }> = [];

      // Procesar cada asistente individualmente
      for (const attendeeData of addMultipleDto.attendees) {
        try {
          // Aplicar configuración común si existe
          const finalAttendeeData = {
            ...attendeeData,
            invitationMessage: attendeeData.invitationMessage || addMultipleDto.commonMessage,
            sendInvitationNow: attendeeData.sendInvitationNow ?? addMultipleDto.sendAllNow,
            notificationPreferences: attendeeData.notificationPreferences || 
                                   addMultipleDto.commonNotificationPreferences,
          };

          const attendee = await this.addAttendee(eventId, finalAttendeeData, addedBy);
          results.push(attendee);

        } catch (error) {
          errors.push({
            userId: attendeeData.userId,
            error: error.message,
          });
        }
      }

      // Log resultados
      this.logger.log(
        `Added ${results.length} attendees successfully, ${errors.length} failed`
      );

      if (errors.length > 0) {
        this.logger.warn(`Some attendees failed to be added:`, errors);
      }

      return results;

    } catch (error) {
      this.logger.error(`Failed to add multiple attendees: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * ✏️ Actualizar asistente
   */
  async updateAttendee(
    attendeeId: string,
    updateAttendeeDto: UpdateAttendeeDto,
    updatedBy: string,
  ): Promise<EventAttendee> {
    this.logger.log(`Updating attendee: ${attendeeId}`);

    try {
      const attendee = await this.attendeeRepository.findOne({
        where: { id: attendeeId },
        relations: ['event'],
      });

      if (!attendee) {
        throw new NotFoundException(`Attendee with ID ${attendeeId} not found`);
      }

      // Verificar permisos
      await this.checkAttendeeUpdatePermissions(attendee, updatedBy);

      // Aplicar cambios
      Object.assign(attendee, updateAttendeeDto);
      attendee.updatedBy = updatedBy;
      attendee.updatedAt = new Date();

      // Manejar cambios automáticos de timestamps
      if (updateAttendeeDto.attendanceStatus) {
        if (updateAttendeeDto.attendanceStatus === AttendanceStatus.PRESENT) {
          attendee.checkedInAt = updateAttendeeDto.checkedInAt 
            ? new Date(updateAttendeeDto.checkedInAt) 
            : new Date();
        } else if (updateAttendeeDto.attendanceStatus === AttendanceStatus.ABSENT) {
          attendee.checkedOutAt = updateAttendeeDto.checkedOutAt 
            ? new Date(updateAttendeeDto.checkedOutAt) 
            : new Date();
        }
      }

      const updatedAttendee = await this.attendeeRepository.save(attendee);

      this.logger.log(`Attendee updated successfully: ${attendeeId}`);
      return updatedAttendee;

    } catch (error) {
      this.logger.error(`Failed to update attendee: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * ✅ Marcar asistencia rápidamente
   */
  async markAttendance(
    attendeeId: string,
    markAttendanceDto: MarkAttendanceDto,
    markedBy: string,
  ): Promise<EventAttendee> {
    this.logger.log(`Marking attendance for attendee: ${attendeeId}`);

    const updateDto: UpdateAttendeeDto = {
      attendanceStatus: markAttendanceDto.attendanceStatus || AttendanceStatus.PRESENT,
      notes: markAttendanceDto.notes,
    };

    if (markAttendanceDto.autoMarkTime !== false) {
      if (updateDto.attendanceStatus === AttendanceStatus.PRESENT) {
        updateDto.checkedInAt = new Date().toISOString();
      } else if (updateDto.attendanceStatus === AttendanceStatus.ABSENT) {
        updateDto.checkedOutAt = new Date().toISOString();
      }
    }

    return this.updateAttendee(attendeeId, updateDto, markedBy);
  }

  // =============================================================================
  // 🔔 GESTIÓN DE RECORDATORIOS
  // =============================================================================

  /**
   * 🆕 Crear recordatorio
   */
  async createReminder(
    eventId: string,
    createReminderDto: CreateReminderDto,
    createdBy: string,
  ): Promise<EventReminder> {
    this.logger.log(`Creating reminder for event: ${eventId}`);

    try {
      // Verificar que el evento existe
      await this.getEventById(eventId, false);

      // Validar configuración del recordatorio
      if (!createReminderDto.validateTimeConfiguration()) {
        throw new BadRequestException('Invalid time configuration for reminder');
      }

      if (!createReminderDto.validateTypeSpecificConfig()) {
        throw new BadRequestException('Invalid type-specific configuration for reminder');
      }

      // Calcular fecha de envío
      const scheduledFor = await this.calculateReminderSchedule(
        eventId,
        createReminderDto.trigger,
        createReminderDto.minutesBefore,
      );

      const reminder = this.reminderRepository.create({
        eventId,
        title: createReminderDto.title,
        message: createReminderDto.message,
        type: createReminderDto.type,
        trigger: createReminderDto.trigger,
        minutesBefore: createReminderDto.minutesBefore,
        scheduledFor,
        userId: createReminderDto.userId,
        deliveryOptions: createReminderDto.deliveryOptions,
        priority: createReminderDto.priority || 1,
        maxAttempts: createReminderDto.maxAttempts || 3,
        isActive: createReminderDto.isActive !== false,
        templateData: createReminderDto.templateData,
        metadata: createReminderDto.metadata,
        createdBy,
        status: ReminderStatus.PENDING,
      });

      const savedReminder = await this.reminderRepository.save(reminder);

      this.logger.log(`Reminder created successfully: ${savedReminder.id}`);
      return savedReminder;

    } catch (error) {
      this.logger.error(`Failed to create reminder: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 📦 Crear recordatorios en lote
   */
  async createBulkReminders(
    eventId: string,
    createBulkDto: CreateBulkRemindersDto,
    createdBy: string,
  ): Promise<EventReminder[]> {
    this.logger.log(`Creating ${createBulkDto.reminders.length} reminders for event: ${eventId}`);

    try {
      const results: EventReminder[] = [];

      for (const reminderData of createBulkDto.reminders) {
        // Aplicar configuración común si existe
        const finalReminderData = {
          ...reminderData,
          ...createBulkDto.commonSettings,
        };

        // Create a proper DTO instance
        const reminderDto: CreateReminderDto = Object.assign(new CreateReminderDto(), finalReminderData);
        const reminder = await this.createReminder(eventId, reminderDto, createdBy);
        results.push(reminder);
      }

      this.logger.log(`Created ${results.length} bulk reminders successfully`);
      return results;

    } catch (error) {
      this.logger.error(`Failed to create bulk reminders: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================================================
  // 📊 ESTADÍSTICAS Y ANÁLISIS
  // =============================================================================

  /**
   * 📈 Obtener estadísticas del calendario
   */
  async getCalendarStats(
    queryDto: CalendarStatsQueryDto,
    userId?: string,
  ): Promise<StatsResponse> {
    this.logger.log(`Generating calendar statistics`);

    try {
      const { startDate, endDate } = this.getDateRange(queryDto);

      // Construcción de consulta base
      const baseQuery = this.eventRepository.createQueryBuilder('event');
      
      if (startDate && endDate) {
        baseQuery.andWhere('event.startDate BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        });
      }

      if (userId) {
        baseQuery.leftJoin('event.attendees', 'attendee', 'attendee.userId = :userId', { userId });
      }

      // Estadísticas básicas
      const totalEvents = await baseQuery.getCount();
      
      const upcomingEvents = await baseQuery
        .clone()
        .andWhere('event.startDate > :now', { now: new Date() })
        .andWhere('event.status = :status', { status: EventStatus.PUBLISHED })
        .getCount();

      const completedEvents = await baseQuery
        .clone()
        .andWhere('event.endDate < :now', { now: new Date() })
        .andWhere('event.status = :status', { status: EventStatus.COMPLETED })
        .getCount();

      const cancelledEvents = await baseQuery
        .clone()
        .andWhere('event.status = :status', { status: EventStatus.CANCELLED })
        .getCount();

      // Estadísticas por tipo
      const eventsByType = await this.getEventsByType(baseQuery.clone());

      // Estadísticas por categoría
      const eventsByCategory = queryDto.includeCategories !== false
        ? await this.getEventsByCategory(baseQuery.clone())
        : {};

      // Estadísticas de asistencia
      const attendanceStats = queryDto.includeAttendance !== false
        ? await this.getAttendanceStats(baseQuery.clone())
        : {
            totalInvitations: 0,
            acceptedInvitations: 0,
            declinedInvitations: 0,
            attendanceRate: 0,
          };

      return {
        totalEvents,
        upcomingEvents,
        completedEvents,
        cancelledEvents,
        eventsByType,
        eventsByCategory,
        attendanceStats,
        timeRange: {
          startDate: startDate?.toISOString() || '',
          endDate: endDate?.toISOString() || '',
        },
      };

    } catch (error) {
      this.logger.error(`Failed to generate statistics: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 📅 Obtener vista de calendario mensual
   */
  async getMonthlyCalendar(
    year: number,
    month: number,
    userId?: string,
  ): Promise<MonthlyCalendarResponse> {
    this.logger.log(`Generating monthly calendar for ${year}-${month}`);

    try {
      // Calcular rango de fechas del mes
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      // Obtener eventos del mes
      const queryBuilder = this.eventRepository.createQueryBuilder('event')
        .leftJoinAndSelect('event.category', 'category')
        .where('event.startDate BETWEEN :startDate AND :endDate', {
          startDate,
          endDate,
        })
        .andWhere('event.status IN (:...statuses)', {
          statuses: [EventStatus.PUBLISHED, EventStatus.IN_PROGRESS],
        });

      if (userId) {
        queryBuilder
          .leftJoin('event.attendees', 'attendee')
          .andWhere('(event.createdBy = :userId OR attendee.userId = :userId)', { userId });
      }

      const events = await queryBuilder
        .orderBy('event.startDate', 'ASC')
        .getMany();

      // Construir estructura de calendario
      const calendar = this.buildMonthlyCalendarStructure(year, month, events);

      return calendar;

    } catch (error) {
      this.logger.error(`Failed to generate monthly calendar: ${error.message}`, error.stack);
      throw error;
    }
  }

  // =============================================================================
  // 🔄 PROCESAMIENTO AUTOMÁTICO Y TAREAS PROGRAMADAS
  // =============================================================================

  /**
   * ⏰ Procesar recordatorios pendientes (ejecutado cada minuto)
   */
  @Cron('0 * * * * *') // Cada minuto
  async processReminders(): Promise<void> {
    this.logger.debug('Processing pending reminders');

    try {
      const now = new Date();
      
      const pendingReminders = await this.reminderRepository.find({
        where: {
          status: ReminderStatus.PENDING,
          isActive: true,
          scheduledFor: Between(
            new Date(now.getTime() - 60000), // 1 minuto atrás
            now
          ),
        },
        relations: ['event', 'event.attendees'],
      });

      for (const reminder of pendingReminders) {
        try {
          await this.sendReminder(reminder);
          
          reminder.status = ReminderStatus.SENT;
          reminder.sentAt = new Date();
          await this.reminderRepository.save(reminder);

        } catch (error) {
          this.logger.error(`Failed to send reminder ${reminder.id}: ${error.message}`);
          
          reminder.attemptCount = (reminder.attemptCount || 0) + 1;
          
          if (reminder.attemptCount >= (reminder.maxAttempts || 3)) {
            reminder.status = ReminderStatus.FAILED;
          }
          
          await this.reminderRepository.save(reminder);
        }
      }

      if (pendingReminders.length > 0) {
        this.logger.log(`Processed ${pendingReminders.length} reminders`);
      }

    } catch (error) {
      this.logger.error(`Failed to process reminders: ${error.message}`, error.stack);
    }
  }

  /**
   * 📊 Actualizar estadísticas automáticamente (ejecutado cada hora)
   */
  @Cron('0 0 * * * *') // Cada hora
  async updateEventStatuses(): Promise<void> {
    this.logger.debug('Updating event statuses');

    try {
      const now = new Date();

      // Marcar eventos como "en progreso"
      const eventsToStart = await this.eventRepository.find({
        where: {
          status: EventStatus.PUBLISHED,
          startDate: Between(
            new Date(now.getTime() - 3600000), // 1 hora atrás
            now
          ),
        },
      });

      for (const event of eventsToStart) {
        event.status = EventStatus.IN_PROGRESS;
        await this.eventRepository.save(event);
      }

      // Marcar eventos como "completados"
      const eventsToComplete = await this.eventRepository.find({
        where: {
          status: EventStatus.IN_PROGRESS,
          endDate: Between(
            new Date(now.getTime() - 3600000), // 1 hora atrás
            now
          ),
        },
      });

      for (const event of eventsToComplete) {
        event.status = EventStatus.COMPLETED;
        await this.eventRepository.save(event);
      }

      if (eventsToStart.length > 0 || eventsToComplete.length > 0) {
        this.logger.log(
          `Updated status for ${eventsToStart.length} starting and ${eventsToComplete.length} completing events`
        );
      }

    } catch (error) {
      this.logger.error(`Failed to update event statuses: ${error.message}`, error.stack);
    }
  }

  // =============================================================================
  // 🛠️ MÉTODOS AUXILIARES PRIVADOS
  // =============================================================================

  /**
   * Validar datos de evento
   */
  private async validateEventData(eventData: CreateEventDto): Promise<void> {
    if (eventData.endDate <= eventData.startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    if (eventData.maxAttendees && eventData.maxAttendees < 1) {
      throw new BadRequestException('Max attendees must be at least 1');
    }

    // Validar que la categoría existe si se especifica
    if (eventData.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: eventData.categoryId },
      });
      
      if (!category) {
        throw new BadRequestException('Category not found');
      }
    }
  }

  /**
   * Verificar conflictos de horario
   */
  private async checkTimeConflicts(
    eventData: CreateEventDto | UpdateEventDto,
    userId: string,
    excludeEventId?: string,
  ): Promise<void> {
    const queryBuilder = this.eventRepository.createQueryBuilder('event')
      .where('event.createdBy = :userId', { userId })
      .andWhere('event.status != :cancelledStatus', { 
        cancelledStatus: EventStatus.CANCELLED 
      })
      .andWhere('(event.startDate < :endDate AND event.endDate > :startDate)', {
        startDate: eventData.startDate,
        endDate: eventData.endDate,
      });

    if (excludeEventId) {
      queryBuilder.andWhere('event.id != :excludeEventId', { excludeEventId });
    }

    const conflictingEvents = await queryBuilder.getMany();

    if (conflictingEvents.length > 0) {
      throw new ConflictException(
        `Time conflict with existing events: ${conflictingEvents.map(e => e.title).join(', ')}`
      );
    }
  }

  /**
   * Generar código único para evento
   */
  private generateEventCode(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `EVT-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Crear query builder para eventos
   */
  private createEventQueryBuilder(
    queryDto: EventQueryDto,
    _userId?: string,
  ): SelectQueryBuilder<Event> {
    const queryBuilder = this.eventRepository.createQueryBuilder('event')
      .leftJoinAndSelect('event.category', 'category')
      .leftJoinAndSelect('event.attendees', 'attendees');

    // Filtros por fecha
    if (queryDto.startDate && queryDto.endDate) {
      queryBuilder.andWhere('event.startDate BETWEEN :startDate AND :endDate', {
        startDate: queryDto.startDate,
        endDate: queryDto.endDate,
      });
    }

    if (queryDto.today) {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000 - 1);
      
      queryBuilder.andWhere('event.startDate BETWEEN :startOfDay AND :endOfDay', {
        startOfDay,
        endOfDay,
      });
    }

    // Filtros por tipo y estado
    if (queryDto.type) {
      queryBuilder.andWhere('event.type = :type', { type: queryDto.type });
    }

    if (queryDto.types?.length) {
      queryBuilder.andWhere('event.type IN (:...types)', { types: queryDto.types });
    }

    if (queryDto.status) {
      queryBuilder.andWhere('event.status = :status', { status: queryDto.status });
    }

    if (queryDto.statuses?.length) {
      queryBuilder.andWhere('event.status IN (:...statuses)', { statuses: queryDto.statuses });
    }

    // Filtros por ubicación
    if (queryDto.locationType) {
      queryBuilder.andWhere('event.locationType = :locationType', { 
        locationType: queryDto.locationType 
      });
    }

    if (queryDto.locationName) {
      queryBuilder.andWhere('event.locationName ILIKE :locationName', { 
        locationName: `%${queryDto.locationName}%` 
      });
    }

    // Filtros por participantes
    if (queryDto.participantId) {
      queryBuilder.andWhere('attendees.userId = :participantId', { 
        participantId: queryDto.participantId 
      });
    }

    if (queryDto.createdBy) {
      queryBuilder.andWhere('event.createdBy = :createdBy', { 
        createdBy: queryDto.createdBy 
      });
    }

    // Filtros por categoría
    if (queryDto.categoryId) {
      queryBuilder.andWhere('event.categoryId = :categoryId', { 
        categoryId: queryDto.categoryId 
      });
    }

    if (queryDto.categoryIds?.length) {
      queryBuilder.andWhere('event.categoryId IN (:...categoryIds)', { 
        categoryIds: queryDto.categoryIds 
      });
    }

    // Búsqueda de texto
    if (queryDto.search) {
      if (queryDto.searchTitleOnly) {
        queryBuilder.andWhere('event.title ILIKE :search', { 
          search: `%${queryDto.search}%` 
        });
      } else {
        queryBuilder.andWhere(
          '(event.title ILIKE :search OR event.description ILIKE :search)',
          { search: `%${queryDto.search}%` }
        );
      }
    }

    // Filtros por recurrencia
    if (queryDto.recurrenceType) {
      queryBuilder.andWhere('event.recurrenceRule ->> \'type\' = :recurrenceType', { 
        recurrenceType: queryDto.recurrenceType 
      });
    }

    if (queryDto.recurringOnly) {
      queryBuilder.andWhere('event.isRecurring = true');
    }

    // Filtros de privacidad
    if (!queryDto.includePrivate) {
      queryBuilder.andWhere('event.isPrivate = false');
    }

    // Ordenamiento
    const sortBy = queryDto.sortBy || 'startDate';
    const sortOrder = queryDto.sortOrder || 'asc';
    queryBuilder.orderBy(`event.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    return queryBuilder;
  }

  /**
   * Construir estructura de calendario mensual
   */
  private buildMonthlyCalendarStructure(
    year: number,
    month: number,
    events: Event[],
  ): MonthlyCalendarResponse {
    // Implementación compleja del calendario mensual
    // ... código simplificado para mantener legibilidad
    
    return {
      year,
      month,
      weeks: [], // Estructura completa de semanas y días
      summary: {
        totalEvents: events.length,
        eventsByType: {}, // Agregación por tipo
      },
    };
  }

  // =============================================================================
  // 🔧 MÉTODOS AUXILIARES PRIVADOS IMPLEMENTADOS
  // =============================================================================

  /**
   * Verifica permisos de edición para eventos
   */
  private async checkEditPermissions(event: Event, userId: string): Promise<void> {
    if (event.createdBy !== userId) {
      // TODO: Implementar verificación de roles más avanzada
      throw new ForbiddenException('No tienes permisos para editar este evento');
    }
  }

  /**
   * Valida actualizaciones de eventos
   */
  private async validateEventUpdate(event: Event, updateDto: UpdateEventDto): Promise<void> {
    // Validar fechas si se están actualizando
    if (updateDto.startDate && updateDto.endDate) {
      if (new Date(updateDto.startDate) >= new Date(updateDto.endDate)) {
        throw new BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin');
      }
    }

    // Validar conflictos de horario si hay cambios de tiempo
    if (updateDto.startDate || updateDto.endDate) {
      // TODO: Implementar verificación de conflictos
    }
  }

  /**
   * Verifica si las fechas del evento han cambiado
   */
  private hasTimeChanged(event: Event, updateDto: UpdateEventDto): boolean {
    return (updateDto.startDate && new Date(updateDto.startDate).getTime() !== event.startDate.getTime()) ||
           (updateDto.endDate && new Date(updateDto.endDate).getTime() !== event.endDate.getTime());
  }

  /**
   * Maneja actualizaciones de recurrencia
   */
  private async handleRecurrenceUpdate(event: Event, _updateDto: UpdateEventDto): Promise<void> {
    // TODO: Implementar lógica de actualización de eventos recurrentes
    this.logger.log(`Handling recurrence update for event ${event.id}`);
  }

  /**
   * Notifica actualizaciones de eventos
   */
  private async notifyEventUpdate(event: Event, reason?: string): Promise<void> {
    // TODO: Implementar sistema de notificaciones
    this.logger.log(`Notifying event update: ${event.id}, reason: ${reason}`);
  }

  /**
   * Notifica cancelación de eventos
   */
  private async notifyEventCancellation(event: Event, reason?: string): Promise<void> {
    // TODO: Implementar notificación de cancelación
    this.logger.log(`Notifying event cancellation: ${event.id}, reason: ${reason}`);
  }

  /**
   * Cancela recordatorios de un evento
   */
  private async cancelEventReminders(eventId: string): Promise<void> {
    await this.reminderRepository.update(
      { eventId },
      { status: ReminderStatus.CANCELLED }
    );
  }

  /**
   * Valida jerarquía de categorías
   */
  private async validateCategoryHierarchy(parentId: string): Promise<void> {
    const parent = await this.categoryRepository.findOne({
      where: { id: parentId }
    });

    if (!parent) {
      throw new NotFoundException('Categoría padre no encontrada');
    }

    // TODO: Verificar profundidad máxima de jerarquía
  }

  /**
   * Envía invitación a asistente
   */
  private async sendInvitation(attendee: EventAttendee, message?: string): Promise<void> {
    // TODO: Implementar envío de invitaciones
    this.logger.log(`Sending invitation to attendee ${attendee.id}, message: ${message}`);
  }

  /**
   * Crea recordatorios para asistente
   */
  private async createAttendeeReminders(attendee: EventAttendee): Promise<void> {
    // TODO: Crear recordatorios automáticos para el asistente
    this.logger.log(`Creating reminders for attendee ${attendee.id}`);
  }

  /**
   * Verifica permisos para actualizar asistente
   */
  private async checkAttendeeUpdatePermissions(attendee: EventAttendee, userId: string): Promise<void> {
    const event = await this.eventRepository.findOne({
      where: { id: attendee.eventId }
    });

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    if (event.createdBy !== userId && attendee.userId !== userId) {
      throw new ForbiddenException('No tienes permisos para actualizar este asistente');
    }
  }

  /**
   * Calcula horario de recordatorio
   */
  private async calculateReminderSchedule(
    eventId: string,
    trigger: ReminderTrigger,
    minutesBefore?: number
  ): Promise<Date> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId }
    });

    if (!event) {
      throw new NotFoundException('Evento no encontrado');
    }

    const eventStart = new Date(event.startDate);
    
    switch (trigger) {
      case ReminderTrigger.TIME_BEFORE:
        return new Date(eventStart.getTime() - (minutesBefore || 15) * 60 * 1000);
      case ReminderTrigger.EXACT_TIME:
        return eventStart;
      case ReminderTrigger.CUSTOM_SCHEDULE:
        return eventStart; // TODO: Implementar tiempo personalizado
      case ReminderTrigger.AFTER_EVENT:
        return new Date(eventStart.getTime() + (minutesBefore || 15) * 60 * 1000);
      default:
        return new Date(eventStart.getTime() - 15 * 60 * 1000);
    }
  }

  /**
   * Obtiene rango de fechas para consultas
   */
  private getDateRange(queryDto: EventQueryDto): { startDate: Date; endDate: Date } {
    let startDate: Date;
    let endDate: Date;

    if (queryDto.startDate && queryDto.endDate) {
      startDate = new Date(queryDto.startDate);
      endDate = new Date(queryDto.endDate);
    } else {
      // Rango por defecto: próximos 30 días
      startDate = new Date();
      endDate = new Date();
      endDate.setDate(endDate.getDate() + 30);
    }

    return { startDate, endDate };
  }

  /**
   * Obtiene estadísticas de eventos por tipo
   */
  private async getEventsByType(query: SelectQueryBuilder<Event>): Promise<Record<string, number>> {
    const results = await query
      .select('event.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('event.type')
      .getRawMany();

    return results.reduce((acc, result) => {
      acc[result.type] = parseInt(result.count);
      return acc;
    }, {});
  }

  /**
   * Obtiene estadísticas de eventos por categoría
   */
  private async getEventsByCategory(query: SelectQueryBuilder<Event>): Promise<Record<string, number>> {
    const results = await query
      .leftJoin('event.category', 'category')
      .select('category.name', 'categoryName')
      .addSelect('COUNT(*)', 'count')
      .groupBy('category.name')
      .getRawMany();

    return results.reduce((acc, result) => {
      acc[result.categoryName || 'Sin categoría'] = parseInt(result.count);
      return acc;
    }, {});
  }

  private async getAttendanceStats(_query: SelectQueryBuilder<Event>): Promise<AttendanceStatsSummary> {
    // TODO: Implementar estadísticas de asistencia detalladas
    return {
      totalInvitations: 0,
      acceptedInvitations: 0,
      declinedInvitations: 0,
      attendanceRate: 0,
    };
  }

  /**
   * Envía recordatorio
   */
  private async sendReminder(reminder: EventReminder): Promise<void> {
    try {
      // TODO: Implementar envío real de recordatorios
      this.logger.log(`Sending reminder ${reminder.id} of type ${reminder.type}`);
      
      // Marcar como enviado
      reminder.sentAt = new Date();
      reminder.status = ReminderStatus.SENT;
      await this.reminderRepository.save(reminder);

    } catch (error) {
      // Marcar como fallido
      reminder.status = ReminderStatus.FAILED;
      reminder.errorMessage = error.message;
      reminder.attemptCount++;
      await this.reminderRepository.save(reminder);
    }
  }
}