/**
 * 🔔 ÍNDICE DEL MÓDULO DE NOTIFICACIONES
 * 
 * Exportaciones centralizadas del módulo de notificaciones
 * para facilitar la importación en otros módulos.
 */

// Entidades
export { 
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationChannel,
} from './notification.entity';

// DTOs
export * from './dto/notification.dto';

// Servicios
export { NotificationService } from './notification.service';

// Controladores
export { NotificationController } from './notification.controller';

// Gateways
export { NotificationGateway } from './notification.gateway';

// Módulo principal
export { NotificationsModule } from './notifications.module';

// Tipos de eventos
export type { NotificationEvent } from './notification.service';