/**
 * CALENDAR CONTROLLER - Controlador del Sistema de Calendario
 * 
 * Controlador REST basico para gestionar operaciones del calendario academico.
 * Proporciona endpoints para eventos, categorias, asistentes y recordatorios.
 * 
 * @author Sistema de Gestion Academica
 * @version 1.0.0
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

// Servicios
import { CalendarService, CalendarBasicStats } from './calendar-simple.service';

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
  ApiResponse as ApiResponseType,
} from './dto';

// Entidades
import { Event } from './entities/event.entity';
import { EventCategory } from './entities/event-category.entity';
import { EventAttendee } from './entities/event-attendee.entity';
import { EventReminder } from './entities/event-reminder.entity';

interface CalendarHealthStatus {
  service: string;
  status: string;
  timestamp: string;
  version: string;
}

@ApiTags('Calendar - Sistema de Calendario')
@Controller('calendar')
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class CalendarController {
  private readonly logger = new Logger(CalendarController.name);

  constructor(private readonly calendarService: CalendarService) {}

  // =============================================================================
  // EVENTOS
  // =============================================================================

  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear nuevo evento',
    description: 'Crea un nuevo evento en el calendario.',
  })
  @ApiBody({ type: CreateEventDto })
  @ApiResponse({
    status: 201,
    description: 'Evento creado exitosamente',
    type: Event,
  })
  async createEvent(
    @Body() createEventDto: CreateEventDto,
  ): Promise<ApiResponseType<Event>> {
    this.logger.log(`Creating event: ${createEventDto.title}`);
    
    try {
      const createdBy = 'temp-user-id';
      const event = await this.calendarService.createEvent(createEventDto, createdBy);
      
      return {
        success: true,
        message: 'Event created successfully',
        data: event,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to create event: ${error.message}`);
      throw error;
    }
  }

  @Get('events')
  @ApiOperation({
    summary: 'Consultar eventos',
    description: 'Obtiene lista de eventos con filtros y paginacion.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de eventos obtenida exitosamente',
  })
  async queryEvents(
    @Query() queryDto: EventQueryDto,
  ): Promise<ApiResponseType<PaginatedResponse<Event>>> {
    this.logger.log(`Querying events with filters`);
    
    try {
      const result = await this.calendarService.queryEvents(queryDto);
      
      return {
        success: true,
        message: `Found ${result.pagination.total} events`,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to query events: ${error.message}`);
      throw error;
    }
  }

  @Get('events/:id')
  @ApiOperation({
    summary: 'Obtener evento por ID',
    description: 'Obtiene los detalles completos de un evento especifico.',
  })
  @ApiParam({ name: 'id', description: 'ID unico del evento', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Evento encontrado exitosamente',
    type: Event,
  })
  async getEventById(
    @Param('id', ParseUUIDPipe) eventId: string,
    @Query('includeRelations') includeRelations?: boolean,
  ): Promise<ApiResponseType<Event>> {
    this.logger.log(`Getting event: ${eventId}`);
    
    try {
      const event = await this.calendarService.getEventById(
        eventId,
        includeRelations !== false,
      );
      
      return {
        success: true,
        message: 'Event retrieved successfully',
        data: event,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get event: ${error.message}`);
      throw error;
    }
  }

  @Put('events/:id')
  @ApiOperation({
    summary: 'Actualizar evento',
    description: 'Actualiza un evento existente.',
  })
  @ApiParam({ name: 'id', description: 'ID unico del evento', type: 'string' })
  @ApiBody({ type: UpdateEventDto })
  @ApiResponse({
    status: 200,
    description: 'Evento actualizado exitosamente',
    type: Event,
  })
  async updateEvent(
    @Param('id', ParseUUIDPipe) eventId: string,
    @Body() updateEventDto: UpdateEventDto,
  ): Promise<ApiResponseType<Event>> {
    this.logger.log(`Updating event: ${eventId}`);
    
    try {
      const updatedBy = 'temp-user-id';
      const event = await this.calendarService.updateEvent(
        eventId,
        updateEventDto,
        updatedBy,
      );
      
      return {
        success: true,
        message: 'Event updated successfully',
        data: event,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to update event: ${error.message}`);
      throw error;
    }
  }

  @Delete('events/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar evento',
    description: 'Elimina (cancela) un evento.',
  })
  @ApiParam({ name: 'id', description: 'ID unico del evento', type: 'string' })
  async deleteEvent(
    @Param('id', ParseUUIDPipe) eventId: string,
  ): Promise<void> {
    this.logger.log(`Deleting event: ${eventId}`);
    
    try {
      const deletedBy = 'temp-user-id';
      await this.calendarService.deleteEvent(eventId, deletedBy);
      
      this.logger.log(`Event deleted successfully: ${eventId}`);
    } catch (error) {
      this.logger.error(`Failed to delete event: ${error.message}`);
      throw error;
    }
  }

  // =============================================================================
  // CATEGORIAS
  // =============================================================================

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear nueva categoria',
    description: 'Crea una nueva categoria para organizar eventos.',
  })
  @ApiBody({ type: CreateEventCategoryDto })
  @ApiResponse({
    status: 201,
    description: 'Categoria creada exitosamente',
    type: EventCategory,
  })
  async createCategory(
    @Body() createCategoryDto: CreateEventCategoryDto,
  ): Promise<ApiResponseType<EventCategory>> {
    this.logger.log(`Creating category: ${createCategoryDto.name}`);
    
    try {
      const createdBy = 'temp-user-id';
      const category = await this.calendarService.createCategory(
        createCategoryDto,
        createdBy,
      );
      
      return {
        success: true,
        message: 'Category created successfully',
        data: category,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to create category: ${error.message}`);
      throw error;
    }
  }

  @Get('categories')
  @ApiOperation({
    summary: 'Listar categorias',
    description: 'Obtiene todas las categorias disponibles.',
  })
  @ApiResponse({
    status: 200,
    description: 'Categorias obtenidas exitosamente',
    type: [EventCategory],
  })
  async getCategories(): Promise<ApiResponseType<EventCategory[]>> {
    this.logger.log(`Getting all categories`);
    
    try {
      const categories = await this.calendarService.getCategories();
      
      return {
        success: true,
        message: `Found ${categories.length} categories`,
        data: categories,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get categories: ${error.message}`);
      throw error;
    }
  }

  @Put('categories/:id')
  @ApiOperation({
    summary: 'Actualizar categoria',
    description: 'Actualiza una categoria existente.',
  })
  @ApiParam({ name: 'id', description: 'ID unico de la categoria', type: 'string' })
  @ApiBody({ type: UpdateEventCategoryDto })
  @ApiResponse({
    status: 200,
    description: 'Categoria actualizada exitosamente',
    type: EventCategory,
  })
  async updateCategory(
    @Param('id', ParseUUIDPipe) categoryId: string,
    @Body() updateCategoryDto: UpdateEventCategoryDto,
  ): Promise<ApiResponseType<EventCategory>> {
    this.logger.log(`Updating category: ${categoryId}`);
    
    try {
      const updatedBy = 'temp-user-id';
      const category = await this.calendarService.updateCategory(
        categoryId,
        updateCategoryDto,
        updatedBy,
      );
      
      return {
        success: true,
        message: 'Category updated successfully',
        data: category,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to update category: ${error.message}`);
      throw error;
    }
  }

  // =============================================================================
  // ASISTENTES
  // =============================================================================

  @Post('events/:eventId/attendees')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Agregar asistente a evento',
    description: 'Invita a un usuario a participar en un evento.',
  })
  @ApiParam({ name: 'eventId', description: 'ID del evento', type: 'string' })
  @ApiBody({ type: AddAttendeeDto })
  @ApiResponse({
    status: 201,
    description: 'Asistente agregado exitosamente',
    type: EventAttendee,
  })
  async addAttendee(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() addAttendeeDto: AddAttendeeDto,
  ): Promise<ApiResponseType<EventAttendee>> {
    this.logger.log(`Adding attendee to event: ${eventId}`);
    
    try {
      const addedBy = 'temp-user-id';
      const attendee = await this.calendarService.addAttendee(
        eventId,
        addAttendeeDto,
        addedBy,
      );
      
      return {
        success: true,
        message: 'Attendee added successfully',
        data: attendee,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to add attendee: ${error.message}`);
      throw error;
    }
  }

  @Get('events/:eventId/attendees')
  @ApiOperation({
    summary: 'Listar asistentes de evento',
    description: 'Obtiene todos los asistentes de un evento especifico.',
  })
  @ApiParam({ name: 'eventId', description: 'ID del evento', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Asistentes obtenidos exitosamente',
    type: [EventAttendee],
  })
  async getEventAttendees(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<ApiResponseType<EventAttendee[]>> {
    this.logger.log(`Getting attendees for event: ${eventId}`);
    
    try {
      const attendees = await this.calendarService.getEventAttendees(eventId);
      
      return {
        success: true,
        message: `Found ${attendees.length} attendees`,
        data: attendees,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get attendees: ${error.message}`);
      throw error;
    }
  }

  // =============================================================================
  // RECORDATORIOS
  // =============================================================================

  @Post('events/:eventId/reminders')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear recordatorio para evento',
    description: 'Configura un recordatorio automatico para un evento.',
  })
  @ApiParam({ name: 'eventId', description: 'ID del evento', type: 'string' })
  @ApiBody({ type: CreateReminderDto })
  @ApiResponse({
    status: 201,
    description: 'Recordatorio creado exitosamente',
    type: EventReminder,
  })
  async createReminder(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() createReminderDto: CreateReminderDto,
  ): Promise<ApiResponseType<EventReminder>> {
    this.logger.log(`Creating reminder for event: ${eventId}`);
    
    try {
      const createdBy = 'temp-user-id';
      const reminder = await this.calendarService.createReminder(
        eventId,
        createReminderDto,
        createdBy,
      );
      
      return {
        success: true,
        message: 'Reminder created successfully',
        data: reminder,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to create reminder: ${error.message}`);
      throw error;
    }
  }

  @Get('events/:eventId/reminders')
  @ApiOperation({
    summary: 'Listar recordatorios de evento',
    description: 'Obtiene todos los recordatorios configurados para un evento.',
  })
  @ApiParam({ name: 'eventId', description: 'ID del evento', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Recordatorios obtenidos exitosamente',
    type: [EventReminder],
  })
  async getEventReminders(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ): Promise<ApiResponseType<EventReminder[]>> {
    this.logger.log(`Getting reminders for event: ${eventId}`);
    
    try {
      const reminders = await this.calendarService.getEventReminders(eventId);
      
      return {
        success: true,
        message: `Found ${reminders.length} reminders`,
        data: reminders,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get reminders: ${error.message}`);
      throw error;
    }
  }

  // =============================================================================
  // ESTADISTICAS Y UTILIDADES
  // =============================================================================

  @Get('stats/basic')
  @ApiOperation({
    summary: 'Estadisticas basicas del calendario',
    description: 'Obtiene estadisticas generales del sistema de calendario.',
  })
  @ApiResponse({
    status: 200,
    description: 'Estadisticas obtenidas exitosamente',
  })
  async getBasicStats(): Promise<ApiResponseType<CalendarBasicStats>> {
    this.logger.log(`Getting basic calendar statistics`);
    
    try {
      const stats = await this.calendarService.getBasicStats();
      
      return {
        success: true,
        message: 'Statistics retrieved successfully',
        data: stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Failed to get statistics: ${error.message}`);
      throw error;
    }
  }

  @Get('health')
  @ApiOperation({
    summary: 'Verificar estado del servicio',
    description: 'Endpoint de salud para verificar que el servicio este funcionando.',
  })
  @ApiResponse({
    status: 200,
    description: 'Servicio funcionando correctamente',
  })
  async healthCheck(): Promise<ApiResponseType<CalendarHealthStatus>> {
    return {
      success: true,
      message: 'Calendar service is healthy',
      data: {
        service: 'calendar',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
      },
      timestamp: new Date().toISOString(),
    };
  }
}