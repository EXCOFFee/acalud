/**
 * ✅ TOKENS DE INYECCIÓN PARA SERVICIOS - SIGUIENDO PRINCIPIOS SOLID
 * 
 * ¿Por qué necesitamos tokens?
 * TypeScript borra las interfaces en tiempo de ejecución, por lo que no podemos
 * usarlas directamente como tokens de inyección en NestJS. Los tokens con Symbol
 * nos permiten mantener la tipificación fuerte mientras tenemos identificadores
 * únicos para la inyección de dependencias.
 */

import { Inject } from '@nestjs/common';

// ============================================================================
// 🎯 TOKENS DE SERVICIOS
// ============================================================================

export const CLASSROOM_TOKENS = {
  // Servicio principal de aulas
  IClassroomService: Symbol('IClassroomService'),
  
  // Repositorio de acceso a datos
  IClassroomRepository: Symbol('IClassroomRepository'),
  
  // Validadores especializados
  IClassroomValidator: Symbol('IClassroomValidator'),
  IPermissionValidator: Symbol('IPermissionValidator'),
  
  // Generadores de utilidades
  IInviteCodeGenerator: Symbol('IInviteCodeGenerator'),
  IClassroomInvitationRepository: Symbol('IClassroomInvitationRepository'),
  IClassroomInvitationService: Symbol('IClassroomInvitationService'),
} as const;

/**
 * 📝 EJEMPLO DE USO:
 * 
 * En el módulo:
 * ```typescript
 * {
 *   provide: CLASSROOM_TOKENS.IClassroomService,
 *   useClass: ClassroomBusinessService,
 * }
 * ```
 * 
 * En el servicio:
 * ```typescript
 * constructor(
 *   @Inject(CLASSROOM_TOKENS.IClassroomService)
 *   private readonly classroomService: IClassroomService,
 * ) {}
 * ```
 */

// ============================================================================
// 🎯 TOKENS PARA OTROS MÓDULOS (cuando se implementen)
// ============================================================================

export const USER_TOKENS = {
  IUserService: Symbol('IUserService'),
  IUserRepository: Symbol('IUserRepository'),
  IUserValidator: Symbol('IUserValidator'),
} as const;

export const ACTIVITY_TOKENS = {
  IActivityService: Symbol('IActivityService'),
  IActivityRepository: Symbol('IActivityRepository'),
  IActivityValidator: Symbol('IActivityValidator'),
} as const;

export const AUTH_TOKENS = {
  IAuthService: Symbol('IAuthService'),
  IJwtService: Symbol('IJwtService'),
  IPasswordService: Symbol('IPasswordService'),
} as const;

/**
 * 🔧 UTILIDADES PARA DECORADORES
 * 
 * Funciones helper para hacer más fácil la inyección de dependencias
 */

export const InjectClassroomService = () => Inject(CLASSROOM_TOKENS.IClassroomService);

export const InjectClassroomRepository = () => Inject(CLASSROOM_TOKENS.IClassroomRepository);

export const InjectClassroomValidator = () => Inject(CLASSROOM_TOKENS.IClassroomValidator);

export const InjectPermissionValidator = () => Inject(CLASSROOM_TOKENS.IPermissionValidator);

export const InjectInviteCodeGenerator = () => Inject(CLASSROOM_TOKENS.IInviteCodeGenerator);

export const InjectClassroomInvitationRepository = () => Inject(CLASSROOM_TOKENS.IClassroomInvitationRepository);

export const InjectClassroomInvitationService = () => Inject(CLASSROOM_TOKENS.IClassroomInvitationService);

/**
 * 📋 EJEMPLO DE USO CON DECORADORES HELPER:
 * 
 * ```typescript
 * @Injectable()
 * export class SomeService {
 *   constructor(
 *     @InjectClassroomService()
 *     private readonly classroomService: IClassroomService,
 *     
 *     @InjectClassroomRepository()
 *     private readonly classroomRepository: IClassroomRepository,
 *   ) {}
 * }
 * ```
 */
