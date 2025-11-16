import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityLibraryController } from './controllers/activity-library.controller';
import { ActivityLibraryService } from './services/activity-library.service';
import { ActivityLibrary } from './entities/activity-library.entity';
import { ActivityRating } from './entities/activity-rating.entity';
import { ActivityTag } from './entities/activity-tag.entity';
import { Activity } from '../activities/activity.entity';
import { User } from '../users/user.entity';

/**
 * Módulo de Biblioteca de Actividades
 * 
 * Implementa los casos de uso:
 * - CU-32: Compartir actividades en biblioteca pública
 * - CU-33: Valorar actividades de otros profesores
 * - CU-34: Copiar actividades de la biblioteca
 * - CU-35: Gestionar mis actividades públicas
 * 
 * Principios SOLID aplicados:
 * - Single Responsibility: Módulo específico para biblioteca de actividades
 * - Open/Closed: Extensible para nuevas funcionalidades
 * - Dependency Inversion: Usa abstracciones de TypeORM
 * 
 * @author Sistema de Gestión Educativa AcaLud
 * @version 1.0.0
 */
@Module({
  imports: [
    /**
     * Configuración de entidades TypeORM
     * Incluye todas las entidades necesarias para el funcionamiento
     */
    TypeOrmModule.forFeature([
      // Entidades principales del módulo
      ActivityLibrary,    // Actividades compartidas en biblioteca
      ActivityRating,     // Valoraciones de actividades
      ActivityTag,        // Etiquetas para categorización

      // Entidades relacionadas de otros módulos
      Activity,           // Actividades originales del sistema
      User,              // Usuarios del sistema (profesores y estudiantes)
    ]),
  ],
  
  /**
   * Controladores del módulo
   * Manejo de endpoints REST para la biblioteca
   */
  controllers: [
    ActivityLibraryController,  // Controlador principal de la biblioteca
  ],
  
  /**
   * Servicios (providers) del módulo
   * Lógica de negocio y operaciones con datos
   */
  providers: [
    ActivityLibraryService,     // Servicio principal con lógica de negocio
  ],
  
  /**
   * Servicios exportados
   * Permite usar el servicio en otros módulos si es necesario
   */
  exports: [
    ActivityLibraryService,     // Exporta el servicio para uso externo
  ],
})
export class ActivityLibraryModule {
  /**
   * Constructor del módulo
   * Se ejecuta al inicializar el módulo
   * 
   * Aquí se podrían agregar inicializaciones adicionales como:
   * - Configuración de validadores personalizados
   * - Registro de listeners de eventos
   * - Configuración de caché
   * - Configuración de workers para tareas en background
   */
  constructor() {
    // Log de inicialización para debugging
    console.log('📚 Activity Library Module initialized');
    console.log('✅ CU-32: Share activities in public library - Ready');
    console.log('✅ CU-33: Rate activities from other teachers - Ready');
    console.log('✅ CU-34: Copy activities from library - Ready');
    console.log('✅ CU-35: Manage my public activities - Ready');
  }

  /**
   * Método estático para configuración dinámica
   * Permite configurar el módulo con parámetros específicos
   * 
   * @param options - Opciones de configuración del módulo
   * @returns Configuración de módulo dinámico
   */
  static forRoot(options?: {
    enableModeration?: boolean;
    maxRatingsPerUser?: number;
    ratingEditTimeLimit?: number;
    featuredActivityLimit?: number;
  }) {
    return {
      module: ActivityLibraryModule,
      providers: [
        {
          provide: 'ACTIVITY_LIBRARY_OPTIONS',
          useValue: {
            enableModeration: options?.enableModeration ?? true,
            maxRatingsPerUser: options?.maxRatingsPerUser ?? 100,
            ratingEditTimeLimit: options?.ratingEditTimeLimit ?? 24, // horas
            featuredActivityLimit: options?.featuredActivityLimit ?? 10,
          },
        },
      ],
    };
  }
}