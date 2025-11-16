/**
 * 📦 CALENDAR MODULE EXPORTS - EXPORTACIONES DEL MÓDULO DE CALENDARIO
 * 
 * Archivo de índice que centraliza todas las exportaciones del módulo de calendario.
 * Facilita las importaciones desde otros módulos y mantiene una interfaz limpia.
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

// =============================================================================
// 📦 MÓDULO PRINCIPAL
// =============================================================================
export { CalendarModule } from './calendar.module';

// =============================================================================
// 🏗️ SERVICIOS
// =============================================================================
export { CalendarService } from './calendar-simple.service';

// =============================================================================
// 🎮 CONTROLADORES
// =============================================================================
export { CalendarController } from './calendar-simple.controller';

// =============================================================================
// 🗄️ ENTIDADES
// =============================================================================
export { Event } from './entities/event.entity';
export { EventCategory } from './entities/event-category.entity';
export { EventAttendee } from './entities/event-attendee.entity';
export { EventReminder } from './entities/event-reminder.entity';

// =============================================================================
// 📝 DTOs
// =============================================================================
export * from './dto';

// =============================================================================
// 🏷️ TIPOS Y ENUMS
// =============================================================================

// Enums de Event
export {
  EventType,
  EventStatus,
  LocationType,
  RecurrenceType,
} from './entities/event.entity';

// Enums de EventCategory
export {
  CategoryVisibility,
  CategoryStatus,
} from './entities/event-category.entity';

// Enums de EventAttendee
export {
  InvitationStatus,
  AttendanceStatus,
  AttendeeRole,
} from './entities/event-attendee.entity';

// Enums de EventReminder
export {
  ReminderType,
  ReminderTrigger,
  ReminderStatus,
} from './entities/event-reminder.entity';

// =============================================================================
// 📋 INFORMACIÓN DEL MÓDULO
// =============================================================================

/**
 * Información sobre el módulo de calendario
 */
export const CALENDAR_MODULE_INFO = {
  name: 'CalendarModule',
  version: '1.0.0',
  description: 'Sistema completo de calendario académico',
  features: [
    'Gestión completa de eventos',
    'Categorías jerárquicas',
    'Sistema de asistentes',
    'Recordatorios automatizados',
    'API REST documentada',
    'Validaciones robustas',
    'Estadísticas básicas',
  ],
  endpoints: {
    events: [
      'POST /calendar/events', 
      'GET /calendar/events',
      'GET /calendar/events/:id',
      'PUT /calendar/events/:id',
      'DELETE /calendar/events/:id',
    ],
    categories: [
      'POST /calendar/categories',
      'GET /calendar/categories',
      'PUT /calendar/categories/:id',
    ],
    attendees: [
      'POST /calendar/events/:id/attendees',
      'GET /calendar/events/:id/attendees',
    ],
    reminders: [
      'POST /calendar/events/:id/reminders',
      'GET /calendar/events/:id/reminders',
    ],
    utilities: [
      'GET /calendar/stats/basic',
      'GET /calendar/health',
    ],
  },
  entities: [
    'Event',
    'EventCategory', 
    'EventAttendee',
    'EventReminder',
  ],
  dtos: {
    create: [
      'CreateEventDto',
      'CreateEventCategoryDto',
      'AddAttendeeDto',
      'CreateReminderDto',
    ],
    update: [
      'UpdateEventDto',
      'UpdateEventCategoryDto',
      'UpdateAttendeeDto',
    ],
    query: [
      'EventQueryDto',
      'CategoryQueryDto',
      'AttendeeQueryDto',
      'CalendarStatsQueryDto',
    ],
  },
} as const;

/**
 * Configuración por defecto del módulo
 */
export const CALENDAR_DEFAULT_CONFIG = {
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
  reminders: {
    defaultMinutesBefore: 30,
    maxAttempts: 3,
    defaultPriority: 2,
  },
  events: {
    defaultStatus: 'draft',
    allowPrivate: true,
    requiresApproval: false,
  },
  categories: {
    defaultVisibility: 'public',
    maxDepth: 5,
  },
} as const;

// =============================================================================
// 📖 GUÍA DE USO RÁPIDO
// =============================================================================

/**
 * GUÍA DE INTEGRACIÓN RÁPIDA
 * 
 * 1. Importar el módulo en tu AppModule:
 * 
 * ```typescript
 * import { CalendarModule } from './modules/calendar';
 * 
 * @Module({
 *   imports: [CalendarModule],
 * })
 * export class AppModule {}
 * ```
 * 
 * 2. Usar el servicio en otros componentes:
 * 
 * ```typescript
 * import { CalendarService } from './modules/calendar';
 * 
 * @Injectable()
 * export class MyService {
 *   constructor(
 *     private readonly calendarService: CalendarService,
 *   ) {}
 * 
 *   async createEvent() {
 *     return await this.calendarService.createEvent({
 *       title: 'Mi Evento',
 *       startDate: new Date(),
 *       endDate: new Date(),
 *       // ... otros campos
 *     }, 'userId');
 *   }
 * }
 * ```
 * 
 * 3. Usar los DTOs para validación:
 * 
 * ```typescript
 * import { CreateEventDto } from './modules/calendar';
 * 
 * @Post('events')
 * async createEvent(@Body() dto: CreateEventDto) {
 *   // Validación automática con class-validator
 * }
 * ```
 * 
 * 4. Trabajar con entidades:
 * 
 * ```typescript
 * import { Event, EventStatus } from './modules/calendar';
 * 
 * const event = new Event();
 * event.status = EventStatus.PUBLISHED;
 * ```
 */

// =============================================================================
// 📡 WEBSOCKET GATEWAY
// =============================================================================
export { CalendarGateway } from './calendar.gateway';