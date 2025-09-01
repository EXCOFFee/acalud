/**
 * Interceptor global para manejo de errores y logging
 * Implementa principios SOLID para manejo consistente de errores
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { BusinessException } from '../exceptions/business.exception';

/**
 * Estructura de respuesta de error estandarizada
 */
interface ErrorResponse {
  statusCode: number;
  message: string;
  errorCode: string;
  timestamp: string;
  path: string;
  correlationId: string;
  details?: Record<string, any>;
  stack?: string;
}

/**
 * Interceptor para manejo global de errores
 * Proporciona logging consistente y respuestas de error estandarizadas
 */
@Injectable()
export class ErrorHandlingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ErrorHandlingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const correlationId = this.generateCorrelationId();
    
    // Agregar correlation ID al request para tracking
    request['correlationId'] = correlationId;

    const startTime = Date.now();

    return next.handle().pipe(
      // Log successful requests
      tap(() => {
        const duration = Date.now() - startTime;
        this.logSuccess(request, response, duration, correlationId);
      }),
      
      // Handle errors
      catchError((error: Error) => {
        const duration = Date.now() - startTime;
        const errorResponse = this.handleError(error, request, correlationId);
        
        this.logError(error, request, duration, correlationId);
        
        // Return standardized error response
        return throwError(() => new HttpException(errorResponse, errorResponse.statusCode));
      }),
    );
  }

  /**
   * Maneja diferentes tipos de errores y los convierte a formato estándar
   */
  private handleError(error: Error, request: Request, correlationId: string): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;

    // Business exceptions (nuestras excepciones personalizadas)
    if (error instanceof BusinessException) {
      return {
        statusCode: error.getStatus(),
        message: error.message,
        errorCode: error.errorCode,
        timestamp,
        path,
        correlationId,
        details: error.details,
      };
    }

    // HTTP exceptions de NestJS
    if (error instanceof HttpException) {
      const status = error.getStatus();
      const response = error.getResponse();
      
      return {
        statusCode: status,
        message: typeof response === 'string' ? response : (response as any).message || error.message,
        errorCode: this.getErrorCodeFromStatus(status),
        timestamp,
        path,
        correlationId,
        details: typeof response === 'object' ? response : undefined,
      };
    }

    // Database errors
    if (this.isDatabaseError(error)) {
      return this.handleDatabaseError(error, timestamp, path, correlationId);
    }

    // Validation errors
    if (this.isValidationError(error)) {
      return this.handleValidationError(error, timestamp, path, correlationId);
    }

    // Unknown errors
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: process.env.NODE_ENV === 'production' 
        ? 'Error interno del servidor' 
        : error.message,
      errorCode: 'INTERNAL_SERVER_ERROR',
      timestamp,
      path,
      correlationId,
      details: process.env.NODE_ENV === 'production' ? undefined : { stack: error.stack },
    };
  }

  /**
   * Maneja errores de base de datos
   */
  private handleDatabaseError(error: any, timestamp: string, path: string, correlationId: string): ErrorResponse {
    // PostgreSQL specific errors
    if (error.code) {
      switch (error.code) {
        case '23505': // Unique violation
          return {
            statusCode: HttpStatus.CONFLICT,
            message: 'El recurso ya existe',
            errorCode: 'DUPLICATE_RESOURCE',
            timestamp,
            path,
            correlationId,
            details: { 
              constraint: error.constraint,
              detail: error.detail 
            },
          };

        case '23503': // Foreign key violation
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Referencia inválida',
            errorCode: 'INVALID_REFERENCE',
            timestamp,
            path,
            correlationId,
            details: { 
              constraint: error.constraint,
              detail: error.detail 
            },
          };

        case '23502': // Not null violation
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Campo requerido faltante',
            errorCode: 'REQUIRED_FIELD_MISSING',
            timestamp,
            path,
            correlationId,
            details: { 
              column: error.column,
              table: error.table 
            },
          };

        case '23514': // Check violation
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'Valor inválido',
            errorCode: 'INVALID_VALUE',
            timestamp,
            path,
            correlationId,
            details: { 
              constraint: error.constraint 
            },
          };

        default:
          return {
            statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
            message: 'Error de base de datos',
            errorCode: 'DATABASE_ERROR',
            timestamp,
            path,
            correlationId,
            details: process.env.NODE_ENV === 'production' ? undefined : { 
              code: error.code,
              detail: error.detail 
            },
          };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Error de base de datos',
      errorCode: 'DATABASE_ERROR',
      timestamp,
      path,
      correlationId,
    };
  }

  /**
   * Maneja errores de validación
   */
  private handleValidationError(error: any, timestamp: string, path: string, correlationId: string): ErrorResponse {
    const validationErrors: Record<string, string[]> = {};

    if (error.response && error.response.message && Array.isArray(error.response.message)) {
      error.response.message.forEach((msg: string) => {
        const [field, ...messageParts] = msg.split(' ');
        const message = messageParts.join(' ');
        
        if (!validationErrors[field]) {
          validationErrors[field] = [];
        }
        validationErrors[field].push(message);
      });
    }

    return {
      statusCode: HttpStatus.BAD_REQUEST,
      message: 'Datos de entrada inválidos',
      errorCode: 'VALIDATION_ERROR',
      timestamp,
      path,
      correlationId,
      details: { validationErrors },
    };
  }

  /**
   * Registra errores con contexto completo
   */
  private logError(error: Error, request: Request, duration: number, correlationId: string): void {
    const { method, url, headers, body, query, params } = request;
    const userAgent = headers['user-agent'];
    const userInfo = (request as any).user;

    const logContext = {
      correlationId,
      method,
      url,
      userAgent,
      duration,
      query,
      params,
      body: this.sanitizeBody(body),
      user: userInfo ? { id: userInfo.id, email: userInfo.email, role: userInfo.role } : null,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    };

    this.logger.error(
      `Request failed: ${method} ${url}`,
      error.stack,
      JSON.stringify(logContext, null, 2)
    );
  }

  /**
   * Registra requests exitosos
   */
  private logSuccess(request: Request, response: Response, duration: number, correlationId: string): void {
    const { method, url } = request;
    const { statusCode } = response;
    const userInfo = (request as any).user;

    const logContext = {
      correlationId,
      method,
      url,
      statusCode,
      duration,
      user: userInfo ? { id: userInfo.id, role: userInfo.role } : null,
    };

    this.logger.log(
      `Request completed: ${method} ${url} - ${statusCode} - ${duration}ms`,
      JSON.stringify(logContext)
    );
  }

  /**
   * Genera un ID de correlación único para tracking
   */
  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Obtiene código de error basado en status HTTP
   */
  private getErrorCodeFromStatus(status: number): string {
    const statusMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
    };

    return statusMap[status] || 'UNKNOWN_ERROR';
  }

  /**
   * Determina si es un error de base de datos
   */
  private isDatabaseError(error: any): boolean {
    return error.code && typeof error.code === 'string' && 
           (error.code.startsWith('23') || error.name === 'QueryFailedError');
  }

  /**
   * Determina si es un error de validación
   */
  private isValidationError(error: any): boolean {
    return error.name === 'ValidationError' || 
           (error.response && error.response.statusCode === 400 && 
            error.response.message && Array.isArray(error.response.message));
  }

  /**
   * Sanitiza el body del request para logging (remueve datos sensibles)
   */
  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') {
      return body;
    }

    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...body };

    Object.keys(sanitized).forEach(key => {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      }
    });

    return sanitized;
  }
}
