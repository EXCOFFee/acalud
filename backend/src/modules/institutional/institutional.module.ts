/**
 * 🏛️ MÓDULO INSTITUCIONAL - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Módulo completo para la gestión institucional de AcaLud:
 * - Información pública de la institución
 * - Sistema de contacto y reclamos
 * - Administración de mensajes (solo admins)
 * - Estadísticas y reportes
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Responsabilidad única de funcionalidades institucionales
 * - OCP: Extensible para nuevas funcionalidades institucionales
 * - LSP: Implementa correctamente los contratos de NestJS
 * - ISP: Interfaces segregadas por funcionalidad
 * - DIP: Depende de abstracciones (repositorios, servicios)
 * 
 * ARQUITECTURA IMPLEMENTADA:
 * - Separación clara entre lógica pública y administrativa
 * - Validaciones robustas en todos los niveles
 * - Rate limiting para prevención de spam
 * - Logging detallado para auditoria
 * - Manejo de errores comprehensivo
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { InstitutionalController } from './institutional.controller';
import { InstitutionalService } from './institutional.service';
import { Contact } from './entities/contact.entity';

/**
 * Módulo institucional que encapsula toda la funcionalidad relacionada
 * con la página institucional, contacto y administración de mensajes
 * 
 * @description Este módulo implementa:
 * 
 * **FUNCIONALIDADES PÚBLICAS:**
 * - Información institucional (misión, visión, contacto, etc.)
 * - Formulario de contacto con validaciones anti-spam
 * - Rate limiting para prevenir abuso
 * 
 * **FUNCIONALIDADES ADMINISTRATIVAS:**
 * - Gestión completa de mensajes de contacto
 * - Sistema de estados y respuestas
 * - Estadísticas y reportes detallados
 * - Auditoria completa de operaciones
 * 
 * **CASOS DE USO IMPLEMENTADOS:**
 * - CU-01: Ingresar a Home Institucional
 * - CU-02: Ver datos de contacto y realizar reclamos
 * 
 * **CARACTERÍSTICAS TÉCNICAS:**
 * - Validaciones de entrada robustas
 * - Prevención de spam y ataques
 * - Logging comprehensivo
 * - Manejo de errores detallado
 * - Documentación Swagger completa
 * 
 * @example
 * ```typescript
 * // Uso del servicio en otros módulos
 * @Module({
 *   imports: [InstitutionalModule],
 *   // ...
 * })
 * export class OtherModule {
 *   constructor(
 *     private readonly institutionalService: InstitutionalService
 *   ) {}
 * }
 * ```
 */
@Module({
  imports: [
    // TypeORM para la entidad Contact
    TypeOrmModule.forFeature([Contact]),
    
    // Throttler específico para endpoints de contacto
    // Configuración más restrictiva para endpoints públicos
    ThrottlerModule.forRoot([
      {
        name: 'contact',
        ttl: 300000, // 5 minutos
        limit: 3,    // Máximo 3 contactos por IP cada 5 minutos
      },
      {
        name: 'general',
        ttl: 60000,  // 1 minuto
        limit: 30,   // Máximo 30 requests generales por minuto
      }
    ]),
  ],
  
  controllers: [
    InstitutionalController,
  ],
  
  providers: [
    InstitutionalService,
  ],
  
  exports: [
    // Exportamos el servicio para que otros módulos puedan usarlo
    InstitutionalService,
    
    // Exportamos TypeORM por si otros módulos necesitan acceso directo
    TypeOrmModule,
  ],
})
export class InstitutionalModule {
  /**
   * Constructor del módulo - se ejecuta al inicializar
   * Útil para logging y configuraciones iniciales
   */
  constructor() {
    console.log('🏛️ InstitutionalModule inicializado correctamente');
    console.log('   ✅ Entidades: Contact');
    console.log('   ✅ Controladores: InstitutionalController');
    console.log('   ✅ Servicios: InstitutionalService');
    console.log('   ✅ Rate Limiting: Configurado para prevenir spam');
    console.log('   ✅ Casos de uso: CU-01, CU-02 implementados');
  }
}

/**
 * 📋 DOCUMENTACIÓN DEL MÓDULO
 * 
 * Este módulo implementa toda la funcionalidad institucional de AcaLud,
 * proporcionando una interfaz robusta para:
 * 
 * 🌍 **FUNCIONALIDAD PÚBLICA:**
 * - Página institucional con información completa
 * - Formulario de contacto accesible sin autenticación
 * - Prevención de spam mediante rate limiting
 * - Validaciones exhaustivas de entrada
 * 
 * 🔐 **FUNCIONALIDAD ADMINISTRATIVA:**
 * - Panel de administración de contactos
 * - Sistema de estados (pendiente, en progreso, resuelto, cerrado)
 * - Respuestas administrativas
 * - Estadísticas y métricas detalladas
 * 
 * 🛡️ **SEGURIDAD IMPLEMENTADA:**
 * - Rate limiting por IP
 * - Validación anti-spam
 * - Sanitización de contenido
 * - Logging de auditoria
 * - Control de acceso basado en roles
 * 
 * 📊 **MÉTRICAS Y MONITORING:**
 * - Estadísticas por tipo de contacto
 * - Tiempos de respuesta promedio
 * - Tendencias temporales
 * - Reportes exportables
 * 
 * 🔄 **CASOS DE USO CUBIERTOS:**
 * 
 * **CU-01: Ingresar a Home Institucional**
 * - Endpoint: GET /api/v1/institutional/info
 * - Acceso: Público
 * - Respuesta: Información completa de la institución
 * 
 * **CU-02: Contacto y Reclamos**
 * - Endpoint: POST /api/v1/institutional/contact
 * - Acceso: Público (con rate limiting)
 * - Funcionalidad: Envío de consultas, reclamos, soporte
 * 
 * 🎯 **PRÓXIMAS EXTENSIONES PLANEADAS:**
 * - Sistema de notificaciones por email
 * - Escalación automática de reclamos críticos
 * - Dashboard público de estado del servicio
 * - Integración con chatbot para respuestas automáticas
 * - API webhooks para sistemas externos
 * 
 * 💡 **NOTAS DE IMPLEMENTACIÓN:**
 * - Todas las operaciones incluyen logging detallado
 * - Manejo de errores exhaustivo en cada endpoint
 * - Validaciones en múltiples niveles (DTO, servicio, entidad)
 * - Documentación Swagger completa con ejemplos
 * - Tests unitarios e integración implementados
 * 
 * 🧪 **TESTING:**
 * - Tests unitarios para servicio y controlador
 * - Tests de integración para flujos completos
 * - Tests de carga para rate limiting
 * - Tests de seguridad para prevención de ataques
 */