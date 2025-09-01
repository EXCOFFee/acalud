/**
 * 🎯 SISTEMA DE EXCEPCIONES MEJORADAS PARA PRODUCCIÓN
 * 
 * ¿Qué hace este archivo?
 * Este archivo define clases especiales para manejar errores en nuestra aplicación.
 * En lugar de mostrar errores genéricos como "algo salió mal", creamos errores específicos
 * que nos dicen exactamente qué pasó y por qué.
 * 
 * ¿Por qué es importante?
 * - Ayuda a los desarrolladores a encontrar problemas rápidamente
 * - Da información clara a los usuarios sobre qué salió mal
 * - Permite al sistema reaccionar de manera inteligente a diferentes tipos de errores
 */

// 📦 IMPORTACIONES
// Traemos herramientas de NestJS para manejar errores HTTP (errores de web)
import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * 🏗️ CLASE BASE PARA TODOS LOS ERRORES DE NEGOCIO
 * 
 * ¿Qué es una "clase base"?
 * Es como un molde o plantilla que otros tipos de errores van a usar.
 * Define las características básicas que todo error debe tener.
 * 
 * ¿Qué hace "abstract"?
 * Significa que esta clase no se puede usar directamente - solo sirve como base
 * para crear otros tipos de errores más específicos.
 * 
 * ¿Qué significa "extends HttpException"?
 * Significa que nuestra clase hereda (recibe) todas las funcionalidades de HttpException,
 * pero además agrega sus propias funcionalidades específicas.
 */
export abstract class BusinessException extends HttpException {
  // 📅 Momento exacto cuando ocurrió el error (no se puede cambiar después)
  public readonly timestamp: string;
  
  // 🛣️ En qué parte de la aplicación ocurrió el error (opcional)
  public readonly path?: string;
  
  // 🏷️ Identificador único para rastrear este error específico (opcional)
  public readonly correlationId?: string;

  /**
   * 🏗️ CONSTRUCTOR - La "fábrica" que crea errores
   * 
   * ¿Qué es un constructor?
   * Es una función especial que se ejecuta cuando creamos un nuevo error.
   * Es como llenar un formulario con todos los datos del error.
   * 
   * Parámetros (información que necesitamos para crear el error):
   * @param message - El mensaje que explica qué pasó (ej: "Usuario no encontrado")
   * @param statusCode - Código HTTP que indica el tipo de error (ej: 404 = no encontrado)
   * @param errorCode - Código interno único para identificar el tipo de error
   * @param details - Información extra sobre el error (opcional)
   * @param path - Dónde ocurrió el error en la aplicación (opcional)
   * @param correlationId - ID único para rastrear este error (opcional)
   */
  constructor(
    message: string,                                    // 📝 Mensaje del error
    statusCode: HttpStatus,                            // 🔢 Código HTTP del error
    public readonly errorCode: string,                 // 🏷️ Código interno del error
    public readonly details?: Record<string, any>,     // 📋 Detalles adicionales (opcional)
    path?: string,                                     // 🛣️ Ruta donde ocurrió (opcional)
    correlationId?: string,                           // 🆔 ID de seguimiento (opcional)
  ) {
    // 📞 Llamamos al constructor de la clase padre (HttpException)
    // Le pasamos un objeto con toda la información del error
    super(
      {
        statusCode,                              // Código del error
        message,                                // Mensaje del error
        errorCode,                             // Código interno
        details,                               // Detalles extra
        timestamp: new Date().toISOString(),   // Momento actual en formato estándar
        path,                                  // Dónde ocurrió
        correlationId,                         // ID de seguimiento
      },
      statusCode,                              // También pasamos el código por separado
    );
    
    // 📅 Guardamos el momento exacto cuando se creó este error
    this.timestamp = new Date().toISOString();
    
    // 🛣️ Guardamos dónde ocurrió el error
    this.path = path;
    
    // 🆔 Guardamos el ID de seguimiento
    this.correlationId = correlationId;
    
    // 🏷️ Guardamos el nombre de la clase que creó este error
    // Esto es útil para saber qué tipo específico de error es
    this.name = this.constructor.name;
  }
}

/**
 * ❌ ERROR DE VALIDACIÓN DE DATOS
 * 
 * ¿Cuándo se usa?
 * Cuando alguien envía datos incorrectos a nuestra aplicación.
 * Por ejemplo: email sin @, contraseña muy corta, campos obligatorios vacíos.
 * 
 * ¿Qué hace diferente?
 * En lugar de decir solo "datos incorrectos", especifica exactamente
 * qué campo tiene error y por qué.
 * 
 * Ejemplo de uso:
 * Si alguien envía un email "correo-malo" (sin @), este error dirá:
 * "Email debe tener formato válido"
 */
export class ValidationException extends BusinessException {
  /**
   * 🏗️ Constructor para crear errores de validación
   * 
   * @param message - Mensaje general del error (ej: "Datos de entrada inválidos")
   * @param validationErrors - Objeto que lista cada campo con su error específico
   *                          Ejemplo: { "email": ["Debe tener formato válido"], "password": ["Muy corta"] }
   * @param path - Dónde en la aplicación ocurrió este error (opcional)
   * @param correlationId - ID único para rastrear este error (opcional)
   */
  constructor(
    message: string,                                    // 📝 Mensaje principal
    validationErrors: Record<string, string[]>,         // 📋 Lista detallada de errores por campo
    path?: string,                                     // 🛣️ Ubicación del error (opcional)
    correlationId?: string,                           // 🆔 ID de seguimiento (opcional)
  ) {
    // 📞 Llamamos al constructor de la clase padre con información específica
    super(
      message,                          // El mensaje que recibimos
      HttpStatus.BAD_REQUEST,          // Código 400 = "Petición incorrecta"
      'VALIDATION_ERROR',              // Código interno para identificar este tipo
      { validationErrors },            // Los errores específicos de cada campo
      path,                           // Dónde ocurrió
      correlationId,                  // ID de seguimiento
    );
  }
}

/**
 * 🔍 ERROR DE RECURSO NO ENCONTRADO
 * 
 * ¿Cuándo se usa?
 * Cuando alguien busca algo que no existe en nuestra base de datos.
 * Por ejemplo: usuario con ID 999 que no existe, aula con código "ABC123" que no está registrada.
 * 
 * ¿Por qué es útil?
 * En lugar de decir "no encontrado", especifica exactamente QUÉ no se encontró
 * y con qué identificador se buscó.
 */
export class ResourceNotFoundException extends BusinessException {
  /**
   * 🏗️ Constructor para crear errores de "no encontrado"
   * 
   * @param resourceType - Tipo de cosa que se buscaba (ej: "Usuario", "Aula", "Actividad")
   * @param resourceId - El identificador con el que se buscó (ej: "123", "ABC", "usuario@email.com")
   * @param path - Dónde en la aplicación ocurrió este error (opcional)
   * @param correlationId - ID único para rastrear este error (opcional)
   */
  constructor(
    resourceType: string,                              // 📦 Tipo de recurso buscado
    resourceId: string,                               // 🆔 ID con el que se buscó
    path?: string,                                   // 🛣️ Ubicación del error (opcional)
    correlationId?: string,                         // 🆔 ID de seguimiento (opcional)
  ) {
    // 📞 Llamamos al constructor padre con un mensaje automático y claro
    super(
      `${resourceType} con ID '${resourceId}' no fue encontrado`,  // Mensaje claro y específico
      HttpStatus.NOT_FOUND,                                      // Código 404 = "No encontrado"
      'RESOURCE_NOT_FOUND',                                      // Código interno
      { resourceType, resourceId },                             // Guardamos qué se buscaba
      path,                                                    // Dónde ocurrió
      correlationId,                                          // ID de seguimiento
    );
  }
}

/**
 * 🚫 ERROR DE AUTORIZACIÓN (PERMISOS)
 * 
 * ¿Cuándo se usa?
 * Cuando alguien trata de hacer algo para lo que no tiene permiso.
 * Por ejemplo: un estudiante tratando de borrar una clase, o acceder a datos de otro usuario.
 * 
 * ¿Diferencia con autenticación?
 * - Autenticación = verificar quién eres (login)
 * - Autorización = verificar qué puedes hacer (permisos)
 */
export class AuthorizationException extends BusinessException {
  /**
   * 🏗️ Constructor para crear errores de permisos
   * 
   * @param action - Qué acción se intentó hacer (ej: "eliminar", "modificar", "ver")
   * @param resource - Sobre qué recurso (ej: "aula", "usuario", "calificación")
   * @param userId - Quién intentó hacer la acción
   * @param path - Dónde en la aplicación ocurrió este error (opcional)
   * @param correlationId - ID único para rastrear este error (opcional)
   */
  constructor(
    action: string,                                    // ⚡ Acción que se intentó
    resource: string,                                 // 📦 Recurso sobre el que se quería actuar
    userId: string,                                  // 👤 Usuario que intentó la acción
    path?: string,                                  // 🛣️ Ubicación del error (opcional)
    correlationId?: string,                        // 🆔 ID de seguimiento (opcional)
  ) {
    // 📞 Creamos un mensaje claro sobre el problema de permisos
    super(
      `Usuario no autorizado para realizar la acción '${action}' en el recurso '${resource}'`,
      HttpStatus.FORBIDDEN,                         // Código 403 = "Prohibido"
      'AUTHORIZATION_ERROR',                        // Código interno
      { action, resource, userId },                // Guardamos los detalles
      path,                                       // Dónde ocurrió
      correlationId,                             // ID de seguimiento
    );
  }
}

/**
 * ⚔️ ERROR DE CONFLICTO DE DATOS
 * 
 * ¿Cuándo se usa?
 * Cuando alguien trata de crear algo que ya existe.
 * Por ejemplo: registrar un email que ya está en uso, crear un aula con un código que ya existe.
 * 
 * ¿Por qué es importante?
 * Previene duplicados en la base de datos y da información clara sobre qué está duplicado.
 */
export class DataConflictException extends BusinessException {
  /**
   * 🏗️ Constructor para crear errores de conflicto
   * 
   * @param conflictType - Qué tipo de dato está duplicado (ej: "email", "código de aula")
   * @param conflictValue - El valor específico que está duplicado (ej: "juan@email.com", "AULA123")
   * @param path - Dónde en la aplicación ocurrió este error (opcional)
   * @param correlationId - ID único para rastrear este error (opcional)
   */
  constructor(
    conflictType: string,                              // 📊 Tipo de conflicto
    conflictValue: string,                            // 💥 Valor que causa el conflicto
    path?: string,                                   // 🛣️ Ubicación del error (opcional)
    correlationId?: string,                         // 🆔 ID de seguimiento (opcional)
  ) {
    // 📞 Creamos un mensaje específico sobre el conflicto
    super(
      `Conflicto de datos: ${conflictType} '${conflictValue}' ya existe`,
      HttpStatus.CONFLICT,                          // Código 409 = "Conflicto"
      'DATA_CONFLICT',                             // Código interno
      { conflictType, conflictValue },            // Guardamos qué está duplicado
      path,                                      // Dónde ocurrió
      correlationId,                            // ID de seguimiento
    );
  }
}

/**
 * 🚧 ERROR DE LÍMITE DE NEGOCIO EXCEDIDO
 * 
 * ¿Cuándo se usa?
 * Cuando alguien trata de hacer algo que excede las reglas del negocio.
 * Por ejemplo: subir más de 10 archivos, tener más de 50 estudiantes en una clase.
 * 
 * ¿Por qué es útil?
 * Protege el sistema de sobrecargas y informa claramente cuál es el límite.
 */
export class BusinessLimitException extends BusinessException {
  /**
   * 🏗️ Constructor para crear errores de límites
   * 
   * @param limitType - Tipo de límite excedido (ej: "archivos subidos", "estudiantes en aula")
   * @param currentValue - Valor actual que excede el límite (ej: 11)
   * @param maxValue - Valor máximo permitido (ej: 10)
   * @param path - Dónde en la aplicación ocurrió este error (opcional)
   * @param correlationId - ID único para rastrear este error (opcional)
   */
  constructor(
    limitType: string,                                 // 📏 Tipo de límite
    currentValue: number,                             // 📊 Valor actual
    maxValue: number,                                // 🔟 Valor máximo permitido
    path?: string,                                  // 🛣️ Ubicación del error (opcional)
    correlationId?: string,                        // 🆔 ID de seguimiento (opcional)
  ) {
    // 📞 Creamos un mensaje con los números específicos
    super(
      `Límite de ${limitType} excedido: ${currentValue}/${maxValue}`,
      HttpStatus.BAD_REQUEST,                       // Código 400 = "Petición incorrecta"
      'BUSINESS_LIMIT_EXCEEDED',                   // Código interno
      { limitType, currentValue, maxValue },      // Guardamos los números
      path,                                      // Dónde ocurrió
      correlationId,                            // ID de seguimiento
    );
  }
}

/**
 * 🚷 ERROR DE OPERACIÓN NO PERMITIDA
 * 
 * ¿Cuándo se usa?
 * Cuando alguien trata de hacer algo que no está permitido en ese momento o contexto.
 * Por ejemplo: eliminar una clase que ya tiene estudiantes, modificar una calificación ya publicada.
 * 
 * ¿Diferencia con autorización?
 * - Autorización = no tienes permiso para hacer esto NUNCA
 * - Operación no permitida = no puedes hacer esto AHORA o en estas CONDICIONES
 */
export class OperationNotAllowedException extends BusinessException {
  /**
   * 🏗️ Constructor para crear errores de operación no permitida
   * 
   * @param operation - Qué operación se intentó hacer (ej: "eliminar clase", "modificar calificación")
   * @param reason - Por qué no se puede hacer (ej: "la clase tiene estudiantes activos")
   * @param path - Dónde en la aplicación ocurrió este error (opcional)
   * @param correlationId - ID único para rastrear este error (opcional)
   */
  constructor(
    operation: string,                                 // ⚡ Operación que se intentó
    reason: string,                                   // 🤔 Razón por la que no se puede
    path?: string,                                   // 🛣️ Ubicación del error (opcional)
    correlationId?: string,                         // 🆔 ID de seguimiento (opcional)
  ) {
    // 📞 Creamos un mensaje explicativo
    super(
      `Operación '${operation}' no permitida: ${reason}`,
      HttpStatus.BAD_REQUEST,                        // Código 400 = "Petición incorrecta"
      'OPERATION_NOT_ALLOWED',                      // Código interno
      { operation, reason },                       // Guardamos los detalles
      path,                                       // Dónde ocurrió
      correlationId,                             // ID de seguimiento
    );
  }
}

/**
 * 🔐 ERROR DE AUTENTICACIÓN (LOGIN)
 * 
 * ¿Cuándo se usa?
 * Cuando alguien trata de entrar al sistema pero algo está mal con sus credenciales.
 * Por ejemplo: contraseña incorrecta, usuario no existe, token expirado.
 * 
 * ¿Diferencia con autorización?
 * - Autenticación = ¿eres quien dices ser? (login)
 * - Autorización = ¿puedes hacer esta acción? (permisos)
 */
export class AuthenticationException extends BusinessException {
  /**
   * 🏗️ Constructor para crear errores de autenticación
   * 
   * @param reason - Razón específica del error (ej: "contraseña incorrecta", "token expirado")
   * @param path - Dónde en la aplicación ocurrió este error (opcional)
   * @param correlationId - ID único para rastrear este error (opcional)
   */
  constructor(
    reason: string,                                    // 🤔 Razón del fallo de autenticación
    path?: string,                                    // 🛣️ Ubicación del error (opcional)
    correlationId?: string,                          // 🆔 ID de seguimiento (opcional)
  ) {
    // 📞 Creamos un mensaje de error de autenticación
    super(
      `Error de autenticación: ${reason}`,           // Mensaje claro sobre el problema
      HttpStatus.UNAUTHORIZED,                      // Código 401 = "No autorizado" (mal login)
      'AUTHENTICATION_ERROR',                       // Código interno
      { reason },                                  // Guardamos la razón específica
      path,                                       // Dónde ocurrió
      correlationId,                             // ID de seguimiento
    );
  }
}

/**
 * 🌐 ERROR DE SERVICIO EXTERNO
 * 
 * ¿Cuándo se usa?
 * Cuando nuestra aplicación trata de comunicarse con otro sistema (API externa, servicio web)
 * y ese sistema no responde o da error.
 * Por ejemplo: servicio de envío de emails caído, API de pagos no disponible.
 * 
 * ¿Por qué es importante?
 * Nos permite distinguir entre errores de nuestro sistema y errores de sistemas externos,
 * para poder informar adecuadamente y tomar acciones correctivas.
 */
export class ExternalServiceException extends BusinessException {
  /**
   * 🏗️ Constructor para crear errores de servicios externos
   * 
   * @param serviceName - Nombre del servicio externo que falló (ej: "EmailService", "PaymentAPI")
   * @param operation - Qué operación se estaba intentando (ej: "enviar email", "procesar pago")
   * @param originalError - El error original que dio el servicio externo
   * @param path - Dónde en la aplicación ocurrió este error (opcional)
   * @param correlationId - ID único para rastrear este error (opcional)
   */
  constructor(
    serviceName: string,                               // 🏷️ Nombre del servicio externo
    operation: string,                                // ⚡ Operación que se intentaba
    originalError: string,                           // 💥 Error original del servicio
    path?: string,                                  // 🛣️ Ubicación del error (opcional)
    correlationId?: string,                        // 🆔 ID de seguimiento (opcional)
  ) {
    // 📞 Creamos un mensaje que identifica claramente el servicio externo
    super(
      `Error en servicio externo ${serviceName} durante operación '${operation}'`,
      HttpStatus.SERVICE_UNAVAILABLE,               // Código 503 = "Servicio no disponible"
      'EXTERNAL_SERVICE_ERROR',                     // Código interno
      { serviceName, operation, originalError },   // Guardamos todos los detalles
      path,                                       // Dónde ocurrió
      correlationId,                             // ID de seguimiento
    );
  }
}

/**
 * ⚙️ ERROR DE CONFIGURACIÓN
 * 
 * ¿Cuándo se usa?
 * Cuando algo está mal configurado en el sistema y esto impide que funcione correctamente.
 * Por ejemplo: variable de entorno faltante, valor de configuración del tipo incorrecto.
 * 
 * ¿Por qué es importante?
 * Estos errores usualmente ocurren al iniciar la aplicación o al cambiar configuraciones.
 * Ayuda a los administradores del sistema a identificar qué está mal configurado.
 */
export class ConfigurationException extends BusinessException {
  /**
   * 🏗️ Constructor para crear errores de configuración
   * 
   * @param configKey - Nombre de la configuración que está mal (ej: "DATABASE_URL", "JWT_SECRET")
   * @param expectedType - Qué tipo de valor se esperaba (ej: "string", "number", "boolean")
   * @param path - Dónde en la aplicación ocurrió este error (opcional)
   * @param correlationId - ID único para rastrear este error (opcional)
   */
  constructor(
    configKey: string,                                 // 🔑 Clave de configuración problemática
    expectedType: string,                             // 📋 Tipo de dato esperado
    path?: string,                                   // 🛣️ Ubicación del error (opcional)
    correlationId?: string,                         // 🆔 ID de seguimiento (opcional)
  ) {
    // 📞 Creamos un mensaje técnico para administradores
    super(
      `Error de configuración: '${configKey}' debe ser de tipo '${expectedType}'`,
      HttpStatus.INTERNAL_SERVER_ERROR,             // Código 500 = "Error interno del servidor"
      'CONFIGURATION_ERROR',                        // Código interno
      { configKey, expectedType },                 // Guardamos qué configuración falla
      path,                                       // Dónde ocurrió
      correlationId,                             // ID de seguimiento
    );
  }
}

/**
 * 📝 RESUMEN DE ESTE ARCHIVO:
 * 
 * 🎯 Propósito General:
 * Este archivo crea un sistema completo para manejar errores de manera inteligente.
 * En lugar de errores genéricos, cada tipo de problema tiene su propia clase con
 * información específica y códigos HTTP apropiados.
 * 
 * 🏗️ Arquitectura:
 * - Una clase base (BusinessException) que define la estructura común
 * - Clases específicas para cada tipo de error que hereda de la base
 * - Cada clase agrega su propia lógica y mensajes específicos
 * 
 * 🎯 Beneficios:
 * - Mensajes de error claros y específicos para usuarios
 * - Información detallada para desarrolladores para debugging
 * - Códigos HTTP apropiados para cada situación
 * - Capacidad de rastrear errores con IDs únicos
 * - Separación clara entre diferentes tipos de problemas
 * 
 * 💡 Ejemplo de uso en la aplicación:
 * ```typescript
 * // En lugar de hacer esto:
 * throw new Error("Error");
 * 
 * // Hacemos esto:
 * throw new ResourceNotFoundException("Usuario", "123");
 * // Resultado: "Usuario con ID '123' no fue encontrado" + código 404
 * ```
 */
