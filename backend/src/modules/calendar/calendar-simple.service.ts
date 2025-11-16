/**
 * 📅 CALENDAR SERVICE SIMPLE - SERVICIO BÁSICO DEL CALENDARIO
 * 
 * Versión simplificada del servicio de calendario con operaciones básicas.
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
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

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
  CreateReminderDto,
  EventQueryDto,
  PaginatedResponse,
} from './dto';

// Enums
import { EventStatus } from './entities/event.entity';
import { InvitationStatus } from './entities/event-attendee.entity';
import { ReminderStatus } from './entities/event-reminder.entity';

export interface CalendarBasicStats {
  totalEvents: number;
  upcomingEvents: number;
  completedEvents: number;
  timestamp: string;
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
  // 📅 GESTIÓN BÁSICA DE EVENTOS
  // =============================================================================

  /**
   * 🆕 Crear evento
   */
  async createEvent(
    createEventDto: CreateEventDto,
    _createdBy: string,
  ): Promise<Event> {
    this.logger.log(`Creating event: ${createEventDto.title}`);

    // Validar fechas
    if (new Date(createEventDto.endDate) <= new Date(createEventDto.startDate)) {
      throw new BadRequestException('End date must be after start date');
    }

    // Crear evento básico
    const event = new Event();
    event.title = createEventDto.title;
    event.description = createEventDto.description;
    event.startDate = new Date(createEventDto.startDate);
    event.endDate = new Date(createEventDto.endDate);
    event.type = createEventDto.type;
    event.status = createEventDto.status || EventStatus.DRAFT;
    event.isAllDay = createEventDto.isAllDay || false;
    event.isPrivate = createEventDto.isPrivate || false;
    event.locationType = createEventDto.locationType;
    event.locationName = createEventDto.locationName;
    event.locationAddress = createEventDto.locationAddress;
    event.maxAttendees = createEventDto.maxAttendees;
    event.categoryId = createEventDto.categoryId;
    event.metadata = createEventDto.metadata || {};

    if (createEventDto.recurrenceRule) {
      event.recurrenceRule = createEventDto.recurrenceRule;
    }

    if (createEventDto.notificationSettings) {
      event.notificationSettings = createEventDto.notificationSettings;
    }

    const savedEvent = await this.eventRepository.save(event);
    this.logger.log(`Event created: ${savedEvent.id}`);
    return savedEvent;
  }

  /**
   * 📝 Actualizar evento
   */
  async updateEvent(
    eventId: string,
    updateEventDto: UpdateEventDto,
    _updatedBy: string,
  ): Promise<Event> {
    const event = await this.getEventById(eventId);

    // Aplicar cambios
    if (updateEventDto.title !== undefined) event.title = updateEventDto.title;
    if (updateEventDto.description !== undefined) event.description = updateEventDto.description;
    if (updateEventDto.startDate !== undefined) event.startDate = new Date(updateEventDto.startDate);
    if (updateEventDto.endDate !== undefined) event.endDate = new Date(updateEventDto.endDate);
    if (updateEventDto.type !== undefined) event.type = updateEventDto.type;
    if (updateEventDto.status !== undefined) event.status = updateEventDto.status;
    if (updateEventDto.isAllDay !== undefined) event.isAllDay = updateEventDto.isAllDay;
    if (updateEventDto.isPrivate !== undefined) event.isPrivate = updateEventDto.isPrivate;
    if (updateEventDto.locationType !== undefined) event.locationType = updateEventDto.locationType;
    if (updateEventDto.locationName !== undefined) event.locationName = updateEventDto.locationName;
    if (updateEventDto.locationAddress !== undefined) event.locationAddress = updateEventDto.locationAddress;
    if (updateEventDto.maxAttendees !== undefined) event.maxAttendees = updateEventDto.maxAttendees;
    if (updateEventDto.categoryId !== undefined) event.categoryId = updateEventDto.categoryId;
    if (updateEventDto.metadata !== undefined) event.metadata = updateEventDto.metadata;
    if (updateEventDto.recurrenceRule !== undefined) event.recurrenceRule = updateEventDto.recurrenceRule;
    if (updateEventDto.notificationSettings !== undefined) event.notificationSettings = updateEventDto.notificationSettings;

    event.updatedAt = new Date();

    return await this.eventRepository.save(event);
  }

  /**
   * 🗑️ Eliminar evento (soft delete)
   */
  async deleteEvent(eventId: string, _deletedBy: string): Promise<void> {
    const event = await this.getEventById(eventId);
    event.status = EventStatus.CANCELLED;
    event.updatedAt = new Date();
    await this.eventRepository.save(event);
  }

  /**
   * 🔍 Obtener evento por ID
   */
  async getEventById(eventId: string, includeRelations = true): Promise<Event> {
    const relations = includeRelations ? ['category', 'attendees', 'reminders'] : [];
    
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
   * 📋 Listar eventos con paginación
   */
  async queryEvents(queryDto: EventQueryDto): Promise<PaginatedResponse<Event>> {
    const page = queryDto.page || 1;
    const limit = queryDto.limit || 20;
    const offset = (page - 1) * limit;

    const queryBuilder = this.eventRepository.createQueryBuilder('event')
      .leftJoinAndSelect('event.category', 'category');

    // Filtros básicos
    if (queryDto.startDate && queryDto.endDate) {
      queryBuilder.andWhere('event.startDate BETWEEN :startDate AND :endDate', {
        startDate: queryDto.startDate,
        endDate: queryDto.endDate,
      });
    }

    if (queryDto.type) {
      queryBuilder.andWhere('event.type = :type', { type: queryDto.type });
    }

    if (queryDto.status) {
      queryBuilder.andWhere('event.status = :status', { status: queryDto.status });
    }

    if (queryDto.categoryId) {
      queryBuilder.andWhere('event.categoryId = :categoryId', { 
        categoryId: queryDto.categoryId 
      });
    }

    if (queryDto.search) {
      queryBuilder.andWhere(
        '(event.title ILIKE :search OR event.description ILIKE :search)',
        { search: `%${queryDto.search}%` }
      );
    }

    if (!queryDto.includePrivate) {
      queryBuilder.andWhere('event.isPrivate = false');
    }

    // Ordenamiento
    const sortBy = queryDto.sortBy || 'startDate';
    const sortOrder = queryDto.sortOrder || 'asc';
    queryBuilder.orderBy(`event.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // Paginación
    queryBuilder.skip(offset).take(limit);

    const [events, total] = await queryBuilder.getManyAndCount();

    return {
      data: events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrevious: page > 1,
      },
    };
  }

  // =============================================================================
  // 🏷️ GESTIÓN BÁSICA DE CATEGORÍAS
  // =============================================================================

  /**
   * 🆕 Crear categoría
   */
  async createCategory(
    createCategoryDto: CreateEventCategoryDto,
    _createdBy: string,
  ): Promise<EventCategory> {
    const category = new EventCategory();
    category.name = createCategoryDto.name;
    category.description = createCategoryDto.description;
    category.color = createCategoryDto.color;
    category.icon = createCategoryDto.icon;
    category.visibility = createCategoryDto.visibility;
    category.status = createCategoryDto.status;
    // category.parentId = createCategoryDto.parentId; // TODO: Implementar cuando esté disponible
    category.settings = createCategoryDto.settings;
    category.metadata = createCategoryDto.metadata;

    return await this.categoryRepository.save(category);
  }

  /**
   * 📝 Actualizar categoría
   */
  async updateCategory(
    categoryId: string,
    updateCategoryDto: UpdateEventCategoryDto,
    _updatedBy: string,
  ): Promise<EventCategory> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID ${categoryId} not found`);
    }

    Object.assign(category, updateCategoryDto);
    category.updatedAt = new Date();

    return await this.categoryRepository.save(category);
  }

  /**
   * 📋 Listar categorías
   */
  async getCategories(): Promise<EventCategory[]> {
    return await this.categoryRepository.find({
      order: { name: 'ASC' },
    });
  }

  // =============================================================================
  // 👥 GESTIÓN BÁSICA DE ASISTENTES
  // =============================================================================

  /**
   * ➕ Agregar asistente
   */
  async addAttendee(
    eventId: string,
    addAttendeeDto: AddAttendeeDto,
    _addedBy: string,
  ): Promise<EventAttendee> {
    // Verificar que el evento existe
    await this.getEventById(eventId, false);

    // Verificar que no sea ya asistente
    const existing = await this.attendeeRepository.findOne({
      where: { eventId, userId: addAttendeeDto.userId },
    });

    if (existing) {
      throw new ConflictException('User is already an attendee');
    }

    const attendee = new EventAttendee();
    attendee.eventId = eventId;
    attendee.userId = addAttendeeDto.userId;
    attendee.role = addAttendeeDto.role;
    attendee.invitationStatus = addAttendeeDto.invitationStatus || InvitationStatus.PENDING;
    attendee.receiveReminders = addAttendeeDto.receiveReminders !== false;
    attendee.notificationPreferences = addAttendeeDto.notificationPreferences;
    attendee.notes = addAttendeeDto.notes;
    attendee.customFields = addAttendeeDto.customFields;
    // Permisos a implementar cuando estén disponibles en la entidad
    // attendee.canInviteOthers = addAttendeeDto.canInviteOthers || false;
    // attendee.canModifyEvent = addAttendeeDto.canModifyEvent || false;
    // attendee.canSeeAttendees = addAttendeeDto.canSeeAttendees !== false;

    return await this.attendeeRepository.save(attendee);
  }

  /**
   * 📋 Obtener asistentes de un evento
   */
  async getEventAttendees(eventId: string): Promise<EventAttendee[]> {
    return await this.attendeeRepository.find({
      where: { eventId },
      // relations: ['user'], // Descomentar cuando User esté disponible
    });
  }

  // =============================================================================
  // 🔔 GESTIÓN BÁSICA DE RECORDATORIOS
  // =============================================================================

  /**
   * 🆕 Crear recordatorio
   */
  async createReminder(
    eventId: string,
    createReminderDto: CreateReminderDto,
    _createdBy: string,
  ): Promise<EventReminder> {
    // Verificar que el evento existe
    await this.getEventById(eventId, false);

    const reminder = new EventReminder();
    reminder.eventId = eventId;
    reminder.userId = createReminderDto.userId;
    reminder.title = createReminderDto.title;
    reminder.message = createReminderDto.message;
    reminder.type = createReminderDto.type;
    reminder.trigger = createReminderDto.trigger;
    reminder.minutesBefore = createReminderDto.minutesBefore;
    reminder.scheduledFor = createReminderDto.scheduledFor 
      ? new Date(createReminderDto.scheduledFor)
      : new Date();
    reminder.isActive = createReminderDto.isActive !== false;
    reminder.priority = createReminderDto.priority || 2;
    reminder.maxAttempts = createReminderDto.maxAttempts || 3;
    reminder.templateData = createReminderDto.templateData;
    reminder.deliveryOptions = createReminderDto.deliveryOptions;
    reminder.metadata = createReminderDto.metadata;
    reminder.status = ReminderStatus.PENDING;

    return await this.reminderRepository.save(reminder);
  }

  /**
   * 📋 Obtener recordatorios de un evento
   */
  async getEventReminders(eventId: string): Promise<EventReminder[]> {
    return await this.reminderRepository.find({
      where: { eventId },
      order: { scheduledFor: 'ASC' },
    });
  }

  // =============================================================================
  // 📊 ESTADÍSTICAS BÁSICAS
  // =============================================================================

  /**
   * 📈 Estadísticas básicas del calendario
   */
  async getBasicStats(): Promise<CalendarBasicStats> {
    const now = new Date();

    const totalEvents = await this.eventRepository.count();
    
    const upcomingEvents = await this.eventRepository.count({
      where: {
        startDate: new Date(now.getTime()),
        status: EventStatus.PUBLISHED,
      },
    });

    const completedEvents = await this.eventRepository.count({
      where: {
        status: EventStatus.COMPLETED,
      },
    });

    return {
      totalEvents,
      upcomingEvents,
      completedEvents,
      timestamp: new Date().toISOString(),
    };
  }

  // =============================================================================
  // MÉTODOS ADICIONALES PARA WEBSOCKET GATEWAY
  // =============================================================================

  /**
   * Encuentra evento por ID (alias para compatibilidad con Gateway)
   */
  async findEventById(eventId: number): Promise<Event> {
    return this.getEventById(eventId.toString(), true);
  }

  /**
   * Encuentra eventos próximos para un usuario
   */
  async findUpcomingEventsForUser(userId: number): Promise<Event[]> {
    try {
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);

      // Buscar eventos donde el usuario es organizador o asistente
      const events = await this.eventRepository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.attendees', 'attendee')
        .leftJoinAndSelect('event.category', 'category')
        .where('event.startDate >= :now', { now })
        .andWhere('event.startDate <= :nextWeek', { nextWeek })
        .andWhere(
          '(event.organizerId = :userId OR attendee.userId = :userId)',
          { userId: userId.toString() }
        )
        .orderBy('event.startDate', 'ASC')
        .limit(10)
        .getMany();

      return events;
    } catch (error) {
      this.logger.error(`Error encontrando eventos próximos: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Encuentra recordatorios pendientes
   */
  async findPendingReminders(currentTime: Date): Promise<EventReminder[]> {
    try {
      const reminders = await this.reminderRepository
        .createQueryBuilder('reminder')
        .leftJoinAndSelect('reminder.event', 'event')
        .where('reminder.status = :status', { status: ReminderStatus.PENDING })
        .andWhere('reminder.reminderTime <= :currentTime', { currentTime })
        .andWhere('event.startDate > :currentTime', { currentTime })
        .getMany();

      return reminders;
    } catch (error) {
      this.logger.error(`Error encontrando recordatorios pendientes: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Marca recordatorio como enviado
   */
  async markReminderAsSent(reminderId: string): Promise<void> {
    try {
      await this.reminderRepository.update(reminderId, {
        status: ReminderStatus.SENT,
        sentAt: new Date(),
      });
    } catch (error) {
      this.logger.error(`Error marcando recordatorio como enviado: ${error.message}`, error.stack);
    }
  }
}