/**
 * 🛡️ INTERCEPTOR DE MANEJO DE ERRORES DE ARCHIVOS
 * 
 * Intercepta y maneja errores específicos del módulo de archivos,
 * proporcionando respuestas consistentes y logging detallado.
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
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

/**
 * Tipos de errores específicos de archivos
 */
export interface FileErrorDetails {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  requestId?: string;
  userId?: string;
  fileName?: string;
}

/**
 * Configuración de respuesta de error
 */
export interface FileErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: FileErrorDetails;
  timestamp: string;
  path: string;
}

@Injectable()
export class FileErrorInterceptor implements NestInterceptor {
  private readonly logger = new Logger(FileErrorInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    // ✅ SOLO aplicar este interceptor a rutas de archivos
    // Si no es una ruta de files, dejar pasar el error sin modificar
    const isFileRoute = request.url.includes('/files') || request.url.includes('/uploads');
    
    if (!isFileRoute) {
      // No es ruta de archivos, pasar al siguiente handler sin interceptar
      return next.handle();
    }

    // Generar ID único para la petición
    const requestId = this.generateRequestId();
    request.requestId = requestId;

    // Logging de inicio de petición
    this.logger.log(`📨 [${requestId}] ${request.method} ${request.url} - Usuario: ${request.user?.id || 'ANONYMOUS'}`);

    return next.handle().pipe(
      tap(() => {
        // Logging de petición exitosa
        const processingTime = Date.now() - startTime;
        this.logger.log(`✅ [${requestId}] Completado en ${processingTime}ms`);
      }),
      catchError((error: Error) => {
        const processingTime = Date.now() - startTime;
        const errorDetails = this.processFileError(error, request, requestId, processingTime);
        
        // Logging detallado del error
        this.logError(errorDetails, request, requestId);
        
        // Crear respuesta de error estructurada
        const errorResponse = this.createErrorResponse(errorDetails, request);
        
        // Devolver HttpException apropiada
        return throwError(() => new HttpException(errorResponse, errorDetails.statusCode));
      })
    );
  }

  /**
   * 🔍 Procesar y clasificar errores de archivos
   */
  private processFileError(
    error: Error, 
    request: any, 
    requestId: string,
    processingTime: number
  ): {
    statusCode: number;
    code: string;
    message: string;
    details: FileErrorDetails;
  } {
    const fileName = this.extractFileName(request);
    const userId = request.user?.id;

    // Clasificación de errores específicos de archivos
    if (error.message.includes('Archivo no proporcionado')) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'FILE_NOT_PROVIDED',
        message: 'No se proporcionó ningún archivo para procesar',
        details: {
          code: 'FILE_NOT_PROVIDED',
          message: error.message,
          timestamp: new Date(),
          requestId,
          userId,
          fileName,
        }
      };
    }

    if (error.message.includes('demasiado grande') || error.message.includes('tamaño')) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'FILE_TOO_LARGE',
        message: 'El archivo excede el tamaño máximo permitido',
        details: {
          code: 'FILE_TOO_LARGE',
          message: error.message,
          timestamp: new Date(),
          requestId,
          userId,
          fileName,
          details: { maxSize: '5GB' }
        }
      };
    }

    if (error.message.includes('tipo no permitido') || error.message.includes('MIME')) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'INVALID_FILE_TYPE',
        message: 'Tipo de archivo no permitido',
        details: {
          code: 'INVALID_FILE_TYPE',
          message: error.message,
          timestamp: new Date(),
          requestId,
          userId,
          fileName,
        }
      };
    }

    if (error.message.includes('cuota') || error.message.includes('límite')) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        code: 'QUOTA_EXCEEDED',
        message: 'Cuota de almacenamiento o límite de archivos excedido',
        details: {
          code: 'QUOTA_EXCEEDED',
          message: error.message,
          timestamp: new Date(),
          requestId,
          userId,
          fileName,
        }
      };
    }

    if (error.message.includes('duplicado') || error.message.includes('existe')) {
      return {
        statusCode: HttpStatus.CONFLICT,
        code: 'DUPLICATE_FILE',
        message: 'Ya existe un archivo con el mismo nombre',
        details: {
          code: 'DUPLICATE_FILE',
          message: error.message,
          timestamp: new Date(),
          requestId,
          userId,
          fileName,
        }
      };
    }

    if (error.message.includes('permisos') || error.message.includes('acceso')) {
      return {
        statusCode: HttpStatus.FORBIDDEN,
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Permisos insuficientes para realizar esta operación',
        details: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: error.message,
          timestamp: new Date(),
          requestId,
          userId,
          fileName,
        }
      };
    }

    if (error.message.includes('no encontrado') || error.message.includes('not found')) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        code: 'FILE_NOT_FOUND',
        message: 'El archivo solicitado no fue encontrado',
        details: {
          code: 'FILE_NOT_FOUND',
          message: error.message,
          timestamp: new Date(),
          requestId,
          userId,
          fileName,
        }
      };
    }

    if (error.message.includes('base de datos') || error.message.includes('database')) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'DATABASE_ERROR',
        message: 'Error interno de base de datos',
        details: {
          code: 'DATABASE_ERROR',
          message: 'Error interno del servidor',
          timestamp: new Date(),
          requestId,
          userId,
          fileName,
          details: { originalError: error.message }
        }
      };
    }

    if (error.message.includes('espacio') || error.message.includes('disk')) {
      return {
        statusCode: 507, // HTTP 507 Insufficient Storage
        code: 'INSUFFICIENT_STORAGE',
        message: 'Espacio insuficiente en el servidor',
        details: {
          code: 'INSUFFICIENT_STORAGE',
          message: error.message,
          timestamp: new Date(),
          requestId,
          userId,
          fileName,
        }
      };
    }

    // Manejo de HttpExceptions existentes
    if (error instanceof HttpException) {
      return {
        statusCode: error.getStatus(),
        code: this.getErrorCode(error),
        message: error.message,
        details: {
          code: this.getErrorCode(error),
          message: error.message,
          timestamp: new Date(),
          requestId,
          userId,
          fileName,
        }
      };
    }

    // Error genérico
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
      details: {
        code: 'INTERNAL_ERROR',
        message: 'Ha ocurrido un error inesperado',
        timestamp: new Date(),
        requestId,
        userId,
        fileName,
        details: { processingTime }
      }
    };
  }

  /**
   * 📝 Logging detallado de errores
   */
  private logError(errorDetails: any, request: any, requestId: string): void {
    const { code, details } = errorDetails;
    
    this.logger.error(`❌ [${requestId}] ERROR_${code}`);
    this.logger.error(`📄 [${requestId}] Archivo: ${details.fileName || 'N/A'}`);
    this.logger.error(`👤 [${requestId}] Usuario: ${details.userId || 'ANONYMOUS'}`);
    this.logger.error(`🌐 [${requestId}] Endpoint: ${request.method} ${request.url}`);
    this.logger.error(`💬 [${requestId}] Mensaje: ${details.message}`);
    
    if (details.details) {
      this.logger.error(`🔍 [${requestId}] Detalles adicionales:`, JSON.stringify(details.details, null, 2));
    }

    // Para errores críticos, registrar stack trace
    if (errorDetails.statusCode >= 500) {
      this.logger.error(`📚 [${requestId}] Stack trace disponible para investigación`);
    }
  }

  /**
   * 🏗️ Crear respuesta de error estructurada
   */
  private createErrorResponse(errorDetails: any, request: any): FileErrorResponse {
    return {
      statusCode: errorDetails.statusCode,
      error: this.getErrorName(errorDetails.statusCode),
      message: errorDetails.message,
      details: errorDetails.details,
      timestamp: new Date().toISOString(),
      path: request.url,
    };
  }

  /**
   * 🔤 Obtener código de error desde HttpException
   */
  private getErrorCode(error: HttpException): string {
    const status = error.getStatus();
    switch (status) {
      case HttpStatus.BAD_REQUEST: return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED: return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN: return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND: return 'NOT_FOUND';
      case HttpStatus.CONFLICT: return 'CONFLICT';
      case 507: return 'INSUFFICIENT_STORAGE';
      default: return 'INTERNAL_ERROR';
    }
  }

  /**
   * 📛 Obtener nombre de error desde código de estado
   */
  private getErrorName(statusCode: number): string {
    switch (statusCode) {
      case HttpStatus.BAD_REQUEST: return 'Bad Request';
      case HttpStatus.UNAUTHORIZED: return 'Unauthorized';
      case HttpStatus.FORBIDDEN: return 'Forbidden';
      case HttpStatus.NOT_FOUND: return 'Not Found';
      case HttpStatus.CONFLICT: return 'Conflict';
      case 507: return 'Insufficient Storage';
      case HttpStatus.INTERNAL_SERVER_ERROR: return 'Internal Server Error';
      default: return 'Unknown Error';
    }
  }

  /**
   * 📎 Extraer nombre de archivo desde la request
   */
  private extractFileName(request: any): string | undefined {
    // Desde archivos subidos
    if (request.file?.originalname) {
      return request.file.originalname;
    }
    
    if (request.files?.length > 0) {
      return request.files[0].originalname;
    }
    
    // Desde parámetros de URL
    if (request.params?.filename) {
      return request.params.filename;
    }
    
    if (request.params?.id) {
      return `ID:${request.params.id}`;
    }
    
    return undefined;
  }

  /**
   * 🆔 Generar ID único para la petición
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}