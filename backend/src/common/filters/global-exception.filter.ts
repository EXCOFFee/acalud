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
  details?: Record<string, any>;
  stack?: string;
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
    const correlationId = (request as any).correlationId;

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
      let details: Record<string, any> | undefined;

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const response = exceptionResponse as any;
        message = response.message || exception.message;
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
      return this.handleClassValidatorError(exception as any, timestamp, path, correlationId);
    }

    // Errores de base de datos
    if (this.isDatabaseError(exception)) {
      return this.handleDatabaseError(exception as any, timestamp, path, correlationId);
    }

    // Errores de TypeORM
    if (this.isTypeORMError(exception)) {
      return this.handleTypeORMError(exception as any, timestamp, path, correlationId);
    }

    // Error genérico/desconocido
    return this.handleGenericError(exception as Error, timestamp, path, correlationId);
  }

  /**
   * Maneja errores de validación de class-validator
   */
  private handleClassValidatorError(
    exception: any, 
    timestamp: string, 
    path: string, 
    correlationId?: string
  ): FinalErrorResponse {
    const validationErrors: Record<string, string[]> = {};

    if (exception.response && Array.isArray(exception.response.message)) {
      exception.response.message.forEach((error: any) => {
        if (typeof error === 'object' && error.property && error.constraints) {
          validationErrors[error.property] = Object.values(error.constraints) as string[];
        } else if (typeof error === 'string') {
          // Formato simple: "campo mensaje"
          const parts = error.split(' ');
          const field = parts[0];
          const message = parts.slice(1).join(' ');
          
          if (!validationErrors[field]) {
            validationErrors[field] = [];
          }
          validationErrors[field].push(message);
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
    exception: any, 
    timestamp: string, 
    path: string, 
    correlationId?: string
  ): FinalErrorResponse {
    const code = exception.code || exception.errno;
    
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
            field: this.extractFieldFromConstraint(exception.constraint),
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
    exception: any, 
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
    exception: Error, 
    timestamp: string, 
    path: string, 
    correlationId?: string
  ): FinalErrorResponse {
    const isProduction = process.env.NODE_ENV === 'production';
    
    return {
      success: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: isProduction ? 'Error interno del servidor' : exception.message,
      errorCode: 'INTERNAL_SERVER_ERROR',
      timestamp,
      path,
      correlationId,
      stack: isProduction ? undefined : exception.stack,
    };
  }

  /**
   * Registra la excepción para monitoreo
   */
  private logException(exception: unknown, request: Request, errorResponse: FinalErrorResponse): void {
    const { method, url, headers } = request;
    const userAgent = headers['user-agent'];
    const userInfo = (request as any).user;

    const logContext = {
      correlationId: errorResponse.correlationId,
      method,
      url,
      statusCode: errorResponse.statusCode,
      errorCode: errorResponse.errorCode,
      userAgent,
      user: userInfo ? { id: userInfo.id, email: userInfo.email, role: userInfo.role } : null,
      exception: {
        name: (exception as any)?.name,
        message: (exception as any)?.message,
      },
    };

    if (errorResponse.statusCode >= 500) {
      this.logger.error(
        `Server Error: ${method} ${url} - ${errorResponse.statusCode}`,
        (exception as Error)?.stack,
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
  private isClassValidatorError(exception: unknown): boolean {
    return (exception as any)?.response?.statusCode === 400 &&
           Array.isArray((exception as any)?.response?.message);
  }

  /**
   * Determina si es un error de base de datos
   */
  private isDatabaseError(exception: unknown): boolean {
    const ex = exception as any;
    return (ex?.code && typeof ex.code === 'string') ||
           ex?.errno ||
           ex?.sqlState;
  }

  /**
   * Determina si es un error de TypeORM
   */
  private isTypeORMError(exception: unknown): boolean {
    const ex = exception as any;
    return ex?.name === 'QueryFailedError' ||
           ex?.name === 'EntityNotFound' ||
           ex?.name === 'CannotCreateEntityIdMapError';
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
}
