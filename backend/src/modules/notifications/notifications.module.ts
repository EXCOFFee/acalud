/**
 * 🔔 MÓDULO DE NOTIFICACIONES - ARQUITECTURA COMPLETA
 * 
 * Módulo que integra todas las funcionalidades de notificaciones:
 * - Gestión completa de notificaciones (CRUD)
 * - WebSockets para tiempo real
 * - Sistema de eventos
 * - Múltiples canales de envío
 * - Estadísticas y reportes
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Cada componente tiene una responsabilidad específica
 * - OCP: Extensible para nuevos tipos y canales
 * - LSP: Implementaciones respetan contratos
 * - ISP: Interfaces segregadas por funcionalidad
 * - DIP: Dependencias invertidas correctamente
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Entidades
import { Notification } from './notification.entity';
import { User } from '../users/user.entity';

// Servicios
import { NotificationService } from './notification.service';

// Controladores
import { NotificationController } from './notification.controller';

// Gateway WebSocket
import { NotificationGateway } from './notification.gateway';

/**
 * Módulo principal de notificaciones
 * 
 * @description Este módulo integra todas las funcionalidades relacionadas
 * con notificaciones del sistema, incluyendo API REST, WebSockets y eventos.
 * 
 * CARACTERÍSTICAS:
 * - ✅ API REST completa para gestión de notificaciones
 * - ✅ WebSockets para notificaciones en tiempo real
 * - ✅ Sistema de eventos para integración con otros módulos
 * - ✅ Múltiples canales de envío (in-app, email, push, SMS)
 * - ✅ Filtrado avanzado y paginación
 * - ✅ Estadísticas y reportes
 * - ✅ Notificaciones masivas
 * - ✅ Gestión de preferencias de usuario
 * - ✅ Limpieza automática de notificaciones expiradas
 * 
 * @example
 * ```typescript
 * // En otro módulo
 * @Module({
 *   imports: [NotificationsModule],
 * })
 * export class SomeOtherModule {}
 * 
 * // En un servicio
 * @Injectable()
 * export class SomeService {
 *   constructor(
 *     private readonly notificationService: NotificationService
 *   ) {}
 * 
 *   async createAchievementNotification(userId: string, achievementId: string) {
 *     await this.notificationService.createNotification({
 *       type: NotificationType.ACHIEVEMENT_UNLOCKED,
 *       title: '🏆 ¡Nuevo logro desbloqueado!',
 *       message: 'Has completado tu primera actividad',
 *       recipientId: userId,
 *       priority: NotificationPriority.HIGH,
 *       metadata: { achievementId, points: 100 }
 *     });
 *   }
 * }
 * ```
 */
@Module({
  imports: [
    // TypeORM para acceso a base de datos
    TypeOrmModule.forFeature([Notification, User]),

    // Sistema de eventos para integración
    EventEmitterModule.forRoot({
      // Configuración del sistema de eventos
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),

    // JWT para autenticación en WebSockets
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'acalud-secret-key'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
        },
      }),
      inject: [ConfigService],
    }),
  ],

  controllers: [
    // Controlador REST para API de notificaciones
    NotificationController,
  ],

  providers: [
    // Servicio principal de notificaciones
    NotificationService,

    // Gateway WebSocket para tiempo real
    NotificationGateway,
  ],

  exports: [
    // Exportar servicio para uso en otros módulos
    NotificationService,

    // Exportar TypeORM module para acceso a entidades
    TypeOrmModule,

    // Exportar gateway para uso en otros módulos (opcional)
    NotificationGateway,
  ],
})
export class NotificationsModule {
  /**
   * 📋 DOCUMENTACIÓN DEL MÓDULO
   * 
   * 🎯 CASOS DE USO PRINCIPALES:
   * 
   * 1. **Notificaciones de Logros:**
   *    - Cuando un usuario completa una actividad
   *    - Cuando desbloquea un achievement
   *    - Cuando sube de nivel
   * 
   * 2. **Notificaciones de Aulas:**
   *    - Nuevas actividades asignadas
   *    - Anuncios de profesores
   *    - Estudiantes que se unen
   * 
   * 3. **Notificaciones del Sistema:**
   *    - Mantenimientos programados
   *    - Nuevas funcionalidades
   *    - Cambios importantes
   * 
   * 4. **Recordatorios:**
   *    - Actividades próximas a vencer
   *    - Tareas pendientes
   *    - Reportes semanales/mensuales
   * 
   * 🔧 CONFIGURACIÓN:
   * 
   * Variables de entorno requeridas:
   * - JWT_SECRET: Clave secreta para WebSockets
   * - JWT_EXPIRES_IN: Tiempo de expiración de tokens
   * - NOTIFICATION_CLEANUP_DAYS: Días para limpieza automática
   * 
   * 📡 EVENTOS DISPONIBLES:
   * 
   * - notification.created: Nueva notificación creada
   * - notification.read: Notificación marcada como leída
   * - notification.sent: Notificación enviada exitosamente
   * - notification.failed: Error enviando notificación
   * - notification.in-app: Notificación in-app específica
   * 
   * 🌐 ENDPOINTS DISPONIBLES:
   * 
   * GET    /notifications           - Listar notificaciones
   * GET    /notifications/:id       - Obtener notificación específica
   * GET    /notifications/stats/summary - Estadísticas
   * POST   /notifications           - Crear notificación
   * POST   /notifications/bulk      - Crear notificaciones masivas
   * PUT    /notifications/mark-as-read - Marcar como leídas
   * PUT    /notifications/mark-all-as-read - Marcar todas como leídas
   * DELETE /notifications/:id       - Eliminar notificación
   * GET    /notifications/config/types - Tipos disponibles
   * POST   /notifications/cleanup/expired - Limpiar expiradas
   * 
   * 🔌 WEBSOCKET EVENTOS:
   * 
   * Cliente → Servidor:
   * - join-classroom: Unirse a sala de aula
   * - leave-classroom: Salir de sala de aula
   * - refresh-stats: Actualizar estadísticas
   * - mark-as-read: Marcar notificaciones como leídas
   * 
   * Servidor → Cliente:
   * - notification: Nueva notificación
   * - notification:stats: Estadísticas actualizadas
   * - notification:connected: Cliente conectado
   * - classroom-notification: Notificación de aula
   * - notification-read: Notificación marcada como leída
   * 
   * 📊 MÉTRICAS Y MONITOREO:
   * 
   * - Total de notificaciones por usuario
   * - Notificaciones no leídas
   * - Distribución por tipo y prioridad
   * - Estadísticas temporales (hoy, semana, mes)
   * - Conexiones WebSocket activas
   * - Tasa de entrega por canal
   * 
   * 🧹 LIMPIEZA AUTOMÁTICA:
   * 
   * - Notificaciones expiradas se eliminan automáticamente
   * - Notificaciones leídas antiguas (configurables)
   * - Logs de errores de envío se limpian periódicamente
   * 
   * 🔐 SEGURIDAD:
   * 
   * - Autenticación JWT requerida para todas las operaciones
   * - Usuarios solo pueden ver sus propias notificaciones
   * - WebSockets autenticados con JWT
   * - Validación exhaustiva de datos de entrada
   * - Rate limiting en endpoints críticos
   * 
   * 🚀 RENDIMIENTO:
   * 
   * - Índices optimizados en base de datos
   * - Paginación en todas las consultas
   * - Caché de estadísticas frecuentes
   * - Conexiones WebSocket eficientes
   * - Bulk operations para notificaciones masivas
   * 
   * 🧪 TESTING:
   * 
   * - Unit tests para servicios
   * - Integration tests para controladores
   * - WebSocket tests para tiempo real
   * - Performance tests para cargas altas
   * - Mocks para servicios externos (email, push)
   */
}