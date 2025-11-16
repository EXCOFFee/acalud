/**
 * 📦 CALENDAR DTOs - ÍNDICE DE EXPORTACIÓN
 * 
 * Exportaciones centralizadas de todos los DTOs del sistema de calendario.
 * Facilita las importaciones en otros módulos y mantiene la organización.
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

// =============================================================================
// 🗓️ DTOs DE EVENTOS
// =============================================================================
export {
  CreateEventDto,
  RecurrenceRuleDto,
  NotificationSettingsDto,
  EventMetadataDto,
} from './create-event.dto';

export { UpdateEventDto } from './update-event.dto';

// =============================================================================
// 🏷️ DTOs DE CATEGORÍAS
// =============================================================================
export {
  CreateEventCategoryDto,
  CategorySettingsDto,
  CategoryMetadataDto,
} from './create-event-category.dto';

export { UpdateEventCategoryDto } from './update-event-category.dto';

// =============================================================================
// 👥 DTOs DE ASISTENTES
// =============================================================================
export {
  AddAttendeeDto,
  AddMultipleAttendeesDto,
  AttendeeNotificationPreferencesDto,
} from './add-attendee.dto';

export {
  UpdateAttendeeDto,
  MarkAttendanceDto,
} from './update-attendee.dto';

// =============================================================================
// 🔔 DTOs DE RECORDATORIOS
// =============================================================================
export {
  CreateReminderDto,
  CreateBulkRemindersDto,
  CustomScheduleDto,
  DeliveryOptionsDto,
  EmailDeliveryOptionsDto,
  SmsDeliveryOptionsDto,
} from './create-reminder.dto';

// =============================================================================
// 🔍 DTOs DE CONSULTAS Y FILTROS
// =============================================================================
export {
  EventQueryDto,
  CategoryQueryDto,
  AttendeeQueryDto,
  CalendarStatsQueryDto,
} from './calendar-query.dto';

// =============================================================================
// 📊 TIPOS AUXILIARES Y ENUMS
// =============================================================================

// Re-exportar enums de las entidades para facilitar su uso
export {
  EventType,
  EventStatus,
  RecurrenceType,
  LocationType,
} from '../entities/event.entity';

export {
  CategoryVisibility,
  CategoryStatus,
} from '../entities/event-category.entity';

export {
  InvitationStatus,
  AttendanceStatus,
  AttendeeRole,
} from '../entities/event-attendee.entity';

export {
  ReminderType,
  ReminderTrigger,
  ReminderStatus,
} from '../entities/event-reminder.entity';

// =============================================================================
// 📝 TIPOS DE RESPUESTA (RESPONSE DTOs)
// =============================================================================

// Importar EventType para uso interno en las interfaces
import { EventType } from '../entities/event.entity';

/**
 * 📊 Tipo para respuestas paginadas
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * 📊 Tipo para respuestas con estadísticas
 */
export interface StatsResponse {
  totalEvents: number;
  upcomingEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  eventsByType: Record<string, number>;
  eventsByCategory: Record<string, number>;
  attendanceStats: {
    totalInvitations: number;
    acceptedInvitations: number;
    declinedInvitations: number;
    attendanceRate: number;
  };
  timeRange: {
    startDate: string;
    endDate: string;
  };
}

/**
 * � Respuesta del calendario mensual
 */
export interface MonthlyCalendarResponse {
  month: number;
  year: number;
  weeks: Array<{
    weekNumber: number;
    days: Array<{
      date: Date;
      dayOfMonth: number;
      isCurrentMonth: boolean;
      events: Array<{
        id: string;
        title: string;
        startTime: string;
        endTime: string;
        type: EventType;
        color: string;
        isAllDay: boolean;
      }>;
    }>;
  }>;
  summary: {
    totalEvents: number;
    eventsByType: Record<string, number>;
  };
}

/**
 * ✅ Tipo para respuestas de operaciones exitosas
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
}

/**
 * ❌ Tipo para respuestas de error
 */
export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode: number;
  timestamp: string;
  details?: unknown;
}

/**
 * 📊 Tipo unificado para todas las respuestas
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;