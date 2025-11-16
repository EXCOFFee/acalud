/**
 * Filtro global de excepciones para manejo final de errores
 * Implementa el principio Single Responsibility para formateo de respuestas de error
 */

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';

/**
 * Estructura de respuesta de error final
 */
interface FinalErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  errorCode: string;
  timestamp: string;
  path: string;
  correlationId?: string;
  details?: Record<string, unknown>;
  stack?: string;
}

type RequestUserContext = {
  id?: string;
  email?: string;
  role?: string;
};

type RequestWithContext = Request & {
  correlationId?: string;
  user?: RequestUserContext | null;
};

interface ClassValidatorErrorDetail {
  property?: string;
  constraints?: Record<string, string>;
}

interface ClassValidatorExceptionShape {
  response?: {
    statusCode?: number;
    message?: Array<string | ClassValidatorErrorDetail>;
  };
}

interface DatabaseErrorShape {
  code?: string;
  errno?: number;
  sqlState?: string;
  constraint?: string;
  table?: string;
  column?: string;
  detail?: string;
}

interface TypeOrmErrorShape extends DatabaseErrorShape {
  name?: string;
  message?: string;
  criteria?: Record<string, unknown>;
}

/**
 * Filtro global para capturar y formatear todas las excepciones
 * Asegura que todas las respuestas de error tengan un formato consistente
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);
    
    // Log del error para monitoreo
    this.logException(exception, request, errorResponse);

    // Enviar respuesta de error
    response.status(errorResponse.statusCode).json(errorResponse);
  }

  /**
   * Construye la respuesta de error basada en el tipo de excepción
   */
  private buildErrorResponse(exception: unknown, request: Request): FinalErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;
    const requestWithContext = request as RequestWithContext;
    const correlationId = requestWithContext.correlationId;

    // Excepciones de negocio personalizadas
    if (exception instanceof BusinessException) {
      return {
        success: false,
        statusCode: exception.getStatus(),
        message: exception.message,
        errorCode: exception.errorCode,
        timestamp,
        path,
        correlationId,
        details: exception.details,
      };
    }

    // Excepciones HTTP de NestJS
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      let message: string;
      let details: Record<string, unknown> | undefined;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const response = exceptionResponse as Record<string, unknown>;
        const responseMessage = response.message;
        if (typeof responseMessage === 'string') {
          message = responseMessage;
        } else if (Array.isArray(responseMessage)) {
          message = responseMessage.join(', ');
        } else {
          message = exception.message;
        }
        details = response;
      } else {
        message = exception.message;
      }

      return {
        success: false,
        statusCode: status,
        message,
        errorCode: this.getErrorCodeFromStatus(status),
        timestamp,
        path,
        correlationId,
        details,
      };
    }

    // Error de validación de class-validator
    if (this.isClassValidatorError(exception)) {
      return this.handleClassValidatorError(exception, timestamp, path, correlationId);
    }

    // Errores de base de datos
    if (this.isDatabaseError(exception)) {
      return this.handleDatabaseError(exception, timestamp, path, correlationId);
    }

    // Errores de TypeORM
    if (this.isTypeORMError(exception)) {
      return this.handleTypeORMError(exception, timestamp, path, correlationId);
    }

    // Error genérico/desconocido
    return this.handleGenericError(exception, timestamp, path, correlationId);
  }

  /**
   * Maneja errores de validación de class-validator
   */
  private handleClassValidatorError(
    exception: ClassValidatorExceptionShape, 
    timestamp: string, 
    path: string, 
    correlationId?: string
  ): FinalErrorResponse {
    const validationErrors: Record<string, string[]> = {};

    const responseMessages = exception.response?.message;
    if (Array.isArray(responseMessages)) {
      responseMessages.forEach((errorDetail) => {
        if (this.isValidationErrorDetail(errorDetail)) {
          const { property, constraints } = errorDetail;
          if (property && constraints) {
            validationErrors[property] = Object.values(constraints);
          }
        } else if (typeof errorDetail === 'string') {
          // Formato simple: "campo mensaje"
          const parts = errorDetail.split(' ');
          const field = parts.shift() ?? 'unknown';
          const fieldMessage = parts.join(' ');

          if (!validationErrors[field]) {
            validationErrors[field] = [];
          }
          validationErrors[field].push(fieldMessage);
        }
      });
    }

    return {
      success: false,
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Error de validación en los datos enviados',
      errorCode: 'VALIDATION_ERROR',
      timestamp,
      path,
      correlationId,
      details: { validationErrors },
    };
  }

  /**
   * Maneja errores de base de datos PostgreSQL
   */
  private handleDatabaseError(
    exception: DatabaseErrorShape, 
    timestamp: string, 
    path: string, 
    correlationId?: string
  ): FinalErrorResponse {
    const code = exception.code ??
      (typeof exception.sqlState === 'string' ? exception.sqlState : undefined) ??
      (typeof exception.errno === 'number' ? exception.errno.toString() : undefined);
    
    switch (code) {
      case '23505': // Unique constraint violation
        return {
          success: false,
          statusCode: HttpStatus.CONFLICT,
          message: 'El recurso ya existe en el sistema',
          errorCode: 'DUPLICATE_RESOURCE',
          timestamp,
          path,
          correlationId,
          details: {
            constraint: exception.constraint,
            table: exception.table,
            field: this.extractFieldFromConstraint(exception.constraint ?? ''),
          },
        };

      case '23503': // Foreign key constraint violation
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Referencia a un recurso que no existe',
          errorCode: 'INVALID_REFERENCE',
          timestamp,
          path,
          correlationId,
          details: {
            constraint: exception.constraint,
            table: exception.table,
          },
        };

      case '23502': // Not null constraint violation
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Campo requerido no puede estar vacío',
          errorCode: 'REQUIRED_FIELD_MISSING',
          timestamp,
          path,
          correlationId,
          details: {
            column: exception.column,
            table: exception.table,
          },
        };

      case '23514': // Check constraint violation
        return {
          success: false,
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Valor no válido para el campo especificado',
          errorCode: 'INVALID_VALUE',
          timestamp,
          path,
          correlationId,
          details: {
            constraint: exception.constraint,
            table: exception.table,
          },
        };

      case 'ECONNREFUSED':
        return {
          success: false,
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Servicio de base de datos no disponible',
          errorCode: 'DATABASE_UNAVAILABLE',
          timestamp,
          path,
          correlationId,
        };

      default:
        return {
          success: false,
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Error en la base de datos',
          errorCode: 'DATABASE_ERROR',
          timestamp,
          path,
          correlationId,
          details: process.env.NODE_ENV === 'production' ? undefined : {
            code: exception.code,
            detail: exception.detail,
          },
        };
    }
  }

  /**
   * Maneja errores específicos de TypeORM
   */
  private handleTypeORMError(
    exception: TypeOrmErrorShape, 
    timestamp: string, 
    path: string, 
    correlationId?: string
  ): FinalErrorResponse {
    if (exception.name === 'EntityNotFound') {
      return {
        success: false,
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Recurso no encontrado',
        errorCode: 'RESOURCE_NOT_FOUND',
        timestamp,
        path,
        correlationId,
        details: {
          entity: exception.criteria,
        },
      };
    }

    if (exception.name === 'QueryFailedError') {
      return this.handleDatabaseError(exception, timestamp, path, correlationId);
    }

    return {
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error en el acceso a datos',
      errorCode: 'DATA_ACCESS_ERROR',
      timestamp,
      path,
      correlationId,
      details: process.env.NODE_ENV === 'production' ? undefined : {
        name: exception.name,
        message: exception.message,
      },
    };
  }

  /**
   * Maneja errores genéricos
   */
  private handleGenericError(
    exception: unknown, 
    timestamp: string, 
    path: string, 
    correlationId?: string
  ): FinalErrorResponse {
    const isProduction = process.env.NODE_ENV === 'production';
    const errorInstance = exception instanceof Error ? exception : new Error(String(exception ?? 'Unknown error'));
    
    return {
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: isProduction ? 'Error interno del servidor' : errorInstance.message,
      errorCode: 'INTERNAL_SERVER_ERROR',
      timestamp,
      path,
      correlationId,
      stack: isProduction ? undefined : errorInstance.stack,
    };
  }

  /**
   * Registra la excepción para monitoreo
   */
  private logException(exception: unknown, request: Request, errorResponse: FinalErrorResponse): void {
    const { method, url, headers } = request;
    const userAgent = headers['user-agent'];
    const requestWithContext = request as RequestWithContext;
    const userInfo = requestWithContext.user;
    const stackTrace = exception instanceof Error ? exception.stack : undefined;

    const logContext = {
      correlationId: errorResponse.correlationId,
      method,
      url,
      statusCode: errorResponse.statusCode,
      errorCode: errorResponse.errorCode,
      userAgent,
      user: userInfo ? { id: userInfo.id, email: userInfo.email, role: userInfo.role } : null,
      exception: this.getExceptionInfo(exception),
    };

    if (errorResponse.statusCode >= 500) {
      this.logger.error(
        `Server Error: ${method} ${url} - ${errorResponse.statusCode}`,
        stackTrace,
        JSON.stringify(logContext, null, 2)
      );
    } else if (errorResponse.statusCode >= 400) {
      this.logger.warn(
        `Client Error: ${method} ${url} - ${errorResponse.statusCode}`,
        JSON.stringify(logContext)
      );
    }
  }

  /**
   * Obtiene el código de error basado en el status HTTP
   */
  private getErrorCodeFromStatus(status: number): string {
    const statusMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      405: 'METHOD_NOT_ALLOWED',
      406: 'NOT_ACCEPTABLE',
      409: 'CONFLICT',
      410: 'GONE',
      411: 'LENGTH_REQUIRED',
      412: 'PRECONDITION_FAILED',
      413: 'PAYLOAD_TOO_LARGE',
      414: 'URI_TOO_LONG',
      415: 'UNSUPPORTED_MEDIA_TYPE',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      501: 'NOT_IMPLEMENTED',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT',
      505: 'HTTP_VERSION_NOT_SUPPORTED',
    };

    return statusMap[status] || 'UNKNOWN_ERROR';
  }

  /**
   * Determina si es un error de validación de class-validator
   */
  private isClassValidatorError(exception: unknown): exception is ClassValidatorExceptionShape {
    if (typeof exception !== 'object' || exception === null) {
      return false;
    }

    const candidate = exception as ClassValidatorExceptionShape;
    return candidate.response?.statusCode === HttpStatus.BAD_REQUEST &&
           Array.isArray(candidate.response?.message);
  }

  /**
   * Determina si es un error de base de datos
   */
  private isDatabaseError(exception: unknown): exception is DatabaseErrorShape {
    if (typeof exception !== 'object' || exception === null) {
      return false;
    }

    const candidate = exception as DatabaseErrorShape;
    return typeof candidate.code === 'string' ||
           typeof candidate.errno !== 'undefined' ||
           typeof candidate.sqlState === 'string';
  }

  /**
   * Determina si es un error de TypeORM
   */
  private isTypeORMError(exception: unknown): exception is TypeOrmErrorShape {
    if (typeof exception !== 'object' || exception === null) {
      return false;
    }

    const candidate = exception as TypeOrmErrorShape;
    if (typeof candidate.name !== 'string') {
      return false;
    }

    return candidate.name === 'QueryFailedError' ||
           candidate.name === 'EntityNotFound' ||
           candidate.name === 'CannotCreateEntityIdMapError';
  }

  /**
   * Extrae el nombre del campo desde el constraint name
   */
  private extractFieldFromConstraint(constraint: string): string {
    if (!constraint) return 'unknown';
    
    // Formato típico: UQ_table_field o table_field_key
    const parts = constraint.split('_');
    if (parts.length >= 3) {
      return parts[2]; // Usualmente el campo está en la tercera posición
    }
    
    return constraint;
  }

  private isValidationErrorDetail(value: unknown): value is ClassValidatorErrorDetail {
    if (typeof value !== 'object' || value === null) {
      return false;
    }

    const detail = value as ClassValidatorErrorDetail;
    return typeof detail.property === 'string' &&
           typeof detail.constraints === 'object' &&
           detail.constraints !== null;
  }

  private getExceptionInfo(exception: unknown): { name?: string; message?: string } {
    if (exception instanceof Error) {
      return { name: exception.name, message: exception.message };
    }

    if (typeof exception === 'object' && exception !== null) {
      const candidate = exception as { name?: unknown; message?: unknown };
      return {
        name: typeof candidate.name === 'string' ? candidate.name : undefined,
        message: typeof candidate.message === 'string' ? candidate.message : undefined,
      };
    }

    return {};
  }
}
