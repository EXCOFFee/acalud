/**
 * 📦 CALENDAR MODULE - MÓDULO DEL SISTEMA DE CALENDARIO
 * 
 * Módulo principal que integra todas las funcionalidades del calendario académico.
 * Configura y expone servicios, controladores y entidades del sistema.
 * 
 * COMPONENTES INCLUIDOS:
 * - 📅 Entidades: Event, EventCategory, EventAttendee, EventReminder
 * - 🏗️ Servicios: CalendarService con lógica de negocio
 * - 🎮 Controladores: API REST completa
 * - 📡 Gateways: WebSockets para tiempo real (futuro)
 * 
 * DEPENDENCIAS:
 * - TypeORM para persistencia de datos
 * - Class-validator para validaciones
 * - NestJS Schedule para tareas programadas (futuro)
 * - WebSocket Gateway para notificaciones (futuro)
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

// Entidades del calendario
import { Event } from './entities/event.entity';
import { EventCategory } from './entities/event-category.entity';
import { EventAttendee } from './entities/event-attendee.entity';
import { EventReminder } from './entities/event-reminder.entity';

// Servicios
import { CalendarService } from './calendar-simple.service';

// Controladores
import { CalendarController } from './calendar-simple.controller';

// WebSocket Gateway
import { CalendarGateway } from './calendar.gateway';

@Module({
  imports: [
    /**
     * 🗄️ CONFIGURACIÓN DE TYPEORM
     * 
     * Registra todas las entidades del calendario para que TypeORM
     * pueda manejar la persistencia y relaciones automáticamente.
     */
    TypeOrmModule.forFeature([
      Event,           // Entidad principal de eventos
      EventCategory,   // Categorías jerárquicas para organización
      EventAttendee,   // Asistentes e invitaciones
      EventReminder,   // Sistema de recordatorios automatizados
    ]),

    /**
     * � JWT MODULE PARA WEBSOCKETS
     * 
     * Necesario para autenticación de conexiones WebSocket
     */
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '24h' },
    }),
  ],

  controllers: [
    /**
     * 🎮 CONTROLADORES REST
     * 
     * Expone la API REST completa del calendario con documentación Swagger.
     * Incluye endpoints para todas las operaciones CRUD y consultas avanzadas.
     */
    CalendarController,
  ],

  providers: [
    /**
     * 🏗️ SERVICIOS DE NEGOCIO
     * 
     * Contiene toda la lógica de negocio del calendario:
     * - Gestión de eventos con validaciones
     * - Sistema de categorías jerárquicas
     * - Administración de asistentes e invitaciones
     * - Automatización de recordatorios
     * - Estadísticas y análisis
     */
    CalendarService,

    /**
     * 📡 WEBSOCKET GATEWAY
     * 
     * Gateway para notificaciones en tiempo real:
     * - Notificaciones de eventos próximos
     * - Actualizaciones de eventos en vivo
     * - Recordatorios instantáneos
     * - Cambios en asistencia a eventos
     */
    CalendarGateway,
  ],

  exports: [
    /**
     * 📤 SERVICIOS EXPORTADOS
     * 
     * Servicios disponibles para otros módulos del sistema.
     * Permite la integración del calendario con otros componentes.
     */
    CalendarService,
    
    /**
     * 🗄️ REPOSITORIOS EXPORTADOS
     * 
     * Repositorios TypeORM exportados para uso directo en otros módulos
     * cuando sea necesario acceso directo a las entidades.
     */
    TypeOrmModule,

    /**
     * 📡 EXPORTS ADICIONALES (futuro)
     * 
     * Otros servicios que pueden ser útiles para módulos externos:
     * - CalendarGateway para subscripciones WebSocket
     * - CalendarEventEmitter para eventos del sistema
     */
    // CalendarGateway,
  ],
})
export class CalendarModule {
  /**
   * 🚀 CONFIGURACIÓN DEL MÓDULO
   * 
   * El módulo está diseñado para ser completamente autónomo y reutilizable.
   * Puede ser importado en el AppModule principal o en módulos específicos.
   * 
   * CARACTERÍSTICAS:
   * - ✅ Configuración TypeORM automática
   * - ✅ API REST completa con documentación
   * - ✅ Validaciones robustas con class-validator
   * - ✅ Manejo de errores centralizado
   * - ✅ Logging estructurado
   * - 🔄 WebSockets para tiempo real (futuro)
   * - 🔄 Tareas programadas para automatización (futuro)
   * - 🔄 Integración con notificaciones (futuro)
   * - 🔄 Analytics y reportes avanzados (futuro)
   * 
   * INTEGRACIÓN:
   * 
   * Para usar este módulo en tu aplicación:
   * 
   * ```typescript
   * @Module({
   *   imports: [
   *     CalendarModule,
   *     // otros módulos...
   *   ],
   * })
   * export class AppModule {}
   * ```
   * 
   * Para inyectar el servicio en otros componentes:
   * 
   * ```typescript
   * constructor(
   *   private readonly calendarService: CalendarService,
   * ) {}
   * ```
   * 
   * ENDPOINTS DISPONIBLES:
   * 
   * Eventos:
   * - POST   /calendar/events              - Crear evento
   * - GET    /calendar/events              - Listar eventos con filtros
   * - GET    /calendar/events/:id          - Obtener evento específico
   * - PUT    /calendar/events/:id          - Actualizar evento
   * - DELETE /calendar/events/:id          - Eliminar evento
   * 
   * Categorías:
   * - POST   /calendar/categories          - Crear categoría
   * - GET    /calendar/categories          - Listar categorías
   * - PUT    /calendar/categories/:id      - Actualizar categoría
   * 
   * Asistentes:
   * - POST   /calendar/events/:id/attendees    - Agregar asistente
   * - GET    /calendar/events/:id/attendees    - Listar asistentes
   * 
   * Recordatorios:
   * - POST   /calendar/events/:id/reminders    - Crear recordatorio
   * - GET    /calendar/events/:id/reminders    - Listar recordatorios
   * 
   * Utilidades:
   * - GET    /calendar/stats/basic         - Estadísticas básicas
   * - GET    /calendar/health              - Estado del servicio
   * 
   * CONFIGURACIÓN DE BASE DE DATOS:
   * 
   * Las entidades se crean automáticamente si tienes synchronize: true
   * en tu configuración de TypeORM. Para producción, usa migraciones.
   * 
   * SEGURIDAD:
   * 
   * Para habilitar autenticación, descomenta las líneas de guards
   * en el controlador y asegúrate de tener el AuthModule configurado.
   * 
   * MONITOREO:
   * 
   * El módulo incluye logging estructurado. Puedes configurar el
   * nivel de logs según tus necesidades en la configuración de NestJS.
   */
}

/**
 * 📋 LISTA DE TAREAS COMPLETADAS
 * 
 * ✅ Entidades del calendario con relaciones completas
 * ✅ DTOs con validaciones exhaustivas
 * ✅ Servicio con lógica de negocio básica
 * ✅ Controlador REST con documentación Swagger
 * ✅ Módulo integrado y configurable
 * 
 * 🔄 PRÓXIMAS IMPLEMENTACIONES
 * 
 * - Gateway WebSocket para notificaciones en tiempo real
 * - Sistema de tareas programadas para recordatorios
 * - Integración con módulo de usuarios y autenticación
 * - Analytics avanzado y reportes
 * - Sistema de templates para recordatorios
 * - Exportación de calendarios (iCal, Google Calendar)
 * - Sincronización con calendarios externos
 * - Sistema de aprobaciones para eventos
 * - Gestión avanzada de recurrencias
 * - Dashboard administrativo
 */