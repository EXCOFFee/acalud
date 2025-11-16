/**
 * 🛡️ MÓDULO DE MODERACIÓN - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Módulo completo del sistema de reportes y moderación de contenido.
 * Permite a usuarios reportar contenido inapropiado y a administradores gestionar estos reportes.
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Módulo dedicado exclusivamente a moderación
 * - OCP: Extensible para nuevos tipos de reportes
 * - LSP: Implementa correctamente los contratos de NestJS
 * - ISP: Interfaces específicas y desacopladas
 * - DIP: Dependencias inyectadas, no hardcodeadas
 * 
 * CASOS DE USO CUBIERTOS:
 * - CU-40: Reportar actividad por contenido inapropiado
 * - CU-41: Ver lista de reportes como moderador/admin
 * - CU-42: Gestionar reportes (aprobar/rechazar/resolver)
 * 
 * CARACTERÍSTICAS:
 * - Sistema completo de reportes de contenido
 * - Validaciones anti-spam y anti-abuso
 * - Filtrado y búsqueda avanzada
 * - Estadísticas y análisis de reportes
 * - Flujo de trabajo de moderación
 * - Logging completo de operaciones
 * 
 * @example
 * ```typescript
 * // Importar en app.module.ts
 * import { ModerationModule } from './modules/moderation/moderation.module';
 * 
 * @Module({
 *   imports: [
 *     // ...otros módulos
 *     ModerationModule,
 *   ],
 * })
 * export class AppModule {}
 * ```
 */

import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { Report } from './entities/report.entity';
import { User } from '../users/user.entity';
import { Activity } from '../activities/activity.entity';

/**
 * Módulo de Moderación
 * 
 * @description Configura todos los componentes necesarios para el sistema de moderación:
 * - Entidades: Report
 * - Controladores: ModerationController
 * - Servicios: ModerationService
 * - Repositorios: Report, User, Activity
 * 
 * DEPENDENCIAS:
 * - UsersModule: Para validar usuarios reporteros y moderadores
 * - ActivitiesModule: Para validar actividades reportadas
 * - TypeORM: Para acceso a base de datos
 * 
 * RUTAS EXPUESTAS:
 * - POST /moderation/reports - Crear reporte
 * - GET /moderation/reports/my-reports - Ver mis reportes
 * - GET /moderation/reports - Listar todos (admin)
 * - GET /moderation/reports/:id - Ver reporte (admin)
 * - PUT /moderation/reports/:id - Actualizar reporte (admin)
 * - DELETE /moderation/reports/:id - Eliminar reporte (admin)
 * - GET /moderation/statistics - Estadísticas (admin)
 */
@Module({
  imports: [
    /**
     * Registrar entidades en TypeORM
     * 
     * @description Permite usar repositorios de Report, User y Activity
     * en el ModerationService para realizar operaciones de BD
     */
    TypeOrmModule.forFeature([
      Report,   // Entidad principal del módulo
      User,     // Necesaria para validar reporteros y moderadores
      Activity, // Necesaria para validar actividades reportadas
    ]),
  ],
  
  /**
   * Controladores del módulo
   * 
   * @description Define los endpoints HTTP disponibles:
   * - ModerationController: Maneja todas las rutas de /moderation/*
   */
  controllers: [
    ModerationController,
  ],
  
  /**
   * Servicios del módulo
   * 
   * @description Servicios que contienen la lógica de negocio:
   * - ModerationService: Lógica de reportes y moderación
   */
  providers: [
    ModerationService,
  ],
  
  /**
   * Servicios exportados
   * 
   * @description Permite que otros módulos usen ModerationService
   * si necesitan funcionalidad de reportes (ej: NotificationsModule)
   */
  exports: [
    ModerationService,
  ],
})
export class ModerationModule {
  /**
   * Logger del módulo
   */
  private readonly logger = new Logger(ModerationModule.name);

  /**
   * Constructor del módulo
   * 
   * @description Se ejecuta cuando el módulo es instanciado.
   * Registra la inicialización del módulo en los logs.
   */
  constructor() {
    this.logger.log('🛡️ ModerationModule inicializado correctamente');
    this.logger.log('📋 Endpoints disponibles:');
    this.logger.log('   - POST   /moderation/reports              (Usuarios: Crear reporte)');
    this.logger.log('   - GET    /moderation/reports/my-reports   (Usuarios: Ver mis reportes)');
    this.logger.log('   - GET    /moderation/reports              (Admin: Listar reportes)');
    this.logger.log('   - GET    /moderation/reports/:id          (Admin: Ver reporte)');
    this.logger.log('   - PUT    /moderation/reports/:id          (Admin: Actualizar reporte)');
    this.logger.log('   - DELETE /moderation/reports/:id          (Admin: Eliminar reporte)');
    this.logger.log('   - GET    /moderation/statistics           (Admin: Estadísticas)');
    this.logger.log('');
    this.logger.log('✅ Sistema de moderación listo para recibir reportes');
  }
}
