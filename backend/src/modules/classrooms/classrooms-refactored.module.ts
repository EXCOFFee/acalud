/**
 * ✅ MÓDULO DE AULAS REFACTORIZADO - SIGUIENDO PRINCIPIOS SOLID
 * 
 * ARQUITECTURA IMPLEMENTADA:
 * - Separación clara de responsabilidades
 * - Inyección de dependencias configurada
 * - Servicios especializados por función
 * - Patrón Repository implementado
 * - Validadores independientes
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entidades
import { Classroom } from './classroom.entity';
import { User } from '../users/user.entity';

// Controlador
import { ClassroomsRefactoredController } from './controllers/classrooms-refactored.controller';

// Servicios e implementaciones
import { ClassroomService } from './services/classroom.service.refactored';
import { ClassroomBusinessService } from './services/classroom-business.service';
import { ClassroomRepository } from './repositories/classroom.repository';
import { ClassroomValidator } from './validators/classroom.validator';
import { PermissionValidator } from './validators/permission.validator';
import { InviteCodeGenerator } from './generators/invite-code.generator';

// Tokens para inyección de dependencias
import { CLASSROOM_TOKENS } from './tokens';

@Module({
  imports: [
    TypeOrmModule.forFeature([Classroom, User]),
  ],
  controllers: [
    ClassroomsRefactoredController,
  ],
  providers: [
    // ✅ SERVICIO PRINCIPAL - Dos opciones implementadas
    {
      provide: CLASSROOM_TOKENS.IClassroomService,
      useClass: ClassroomBusinessService, // Versión más completa con logs y error handling
      // useClass: ClassroomService, // Versión más simple y directa
    },

    // ✅ REPOSITORIO - Acceso a datos
    {
      provide: CLASSROOM_TOKENS.IClassroomRepository,
      useClass: ClassroomRepository,
    },

    // ✅ VALIDADORES - Lógica de validación
    {
      provide: CLASSROOM_TOKENS.IClassroomValidator,
      useClass: ClassroomValidator,
    },
    {
      provide: CLASSROOM_TOKENS.IPermissionValidator,
      useClass: PermissionValidator,
    },

    // ✅ GENERADORES - Utilidades específicas
    {
      provide: CLASSROOM_TOKENS.IInviteCodeGenerator,
      useClass: InviteCodeGenerator,
    },

    // ✅ SERVICIOS CONCRETOS (para casos donde se necesite inyección directa)
    ClassroomService,
    ClassroomBusinessService,
    ClassroomRepository,
    ClassroomValidator,
    PermissionValidator,
    InviteCodeGenerator,
  ],
  exports: [
    // Exportamos los tokens para que otros módulos puedan usar los servicios
    CLASSROOM_TOKENS.IClassroomService,
    CLASSROOM_TOKENS.IClassroomRepository,
    CLASSROOM_TOKENS.IClassroomValidator,
    CLASSROOM_TOKENS.IPermissionValidator,
    CLASSROOM_TOKENS.IInviteCodeGenerator,
    
    // También exportamos las implementaciones concretas por si se necesitan
    ClassroomService,
    ClassroomBusinessService,
    ClassroomRepository,
    ClassroomValidator,
    PermissionValidator,
    InviteCodeGenerator,
  ],
})
export class ClassroomsRefactoredModule {
  /**
   * 📝 NOTAS SOBRE ESTE MÓDULO:
   * 
   * 🎯 PRINCIPIOS APLICADOS:
   * - SRP: Cada servicio tiene una responsabilidad específica
   * - OCP: Nuevas funcionalidades se pueden agregar sin modificar existentes
   * - LSP: Todas las implementaciones respetan sus contratos
   * - ISP: Interfaces segregadas por funcionalidad
   * - DIP: Dependemos de abstracciones, no de concreciones
   * 
   * 🔧 CONFIGURACIÓN:
   * - TypeOrmModule importa las entidades necesarias
   * - Providers configurados con inyección de dependencias
   * - Exports permiten que otros módulos usen estos servicios
   * 
   * 🎨 FLEXIBILIDAD:
   * - Se pueden intercambiar implementaciones fácilmente
   * - Testing es simple gracias a las interfaces
   * - Nuevas funcionalidades son fáciles de agregar
   * 
   * 🚀 ESCALABILIDAD:
   * - Arquitectura preparada para crecimiento
   * - Cada componente es independiente
   * - Modificaciones son localizadas
   */
}

/**
 * 📋 EJEMPLO DE USO EN OTROS MÓDULOS:
 * 
 * ```typescript
 * @Module({
 *   imports: [ClassroomsRefactoredModule],
 *   providers: [SomeOtherService],
 * })
 * export class SomeOtherModule {}
 * 
 * @Injectable()
 * export class SomeOtherService {
 *   constructor(
 *     private readonly classroomService: IClassroomService,
 *   ) {}
 * 
 *   async someMethod() {
 *     const classrooms = await this.classroomService.findClassrooms({
 *       page: 1,
 *       limit: 10,
 *     });
 *   }
 * }
 * ```
 */
