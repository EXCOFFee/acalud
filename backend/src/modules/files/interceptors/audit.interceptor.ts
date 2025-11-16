/**
 * 📊 INTERCEPTOR DE AUDITORÍA Y LOGGING AVANZADO
 * 
 * Sistema completo de auditoría para el módulo de archivos que registra:
 * - Todas las operaciones CRUD
 * - Métricas de performance
 * - Accesos y descargas
 * - Errores y excepciones
 * - Estadísticas de uso
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError, finalize } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * Tipos de eventos auditables
 */
export enum AuditEventType {
  FILE_UPLOAD = 'FILE_UPLOAD',
  FILE_DOWNLOAD = 'FILE_DOWNLOAD', 
  FILE_VIEW = 'FILE_VIEW',
  FILE_UPDATE = 'FILE_UPDATE',
  FILE_DELETE = 'FILE_DELETE',
  FILE_SHARE = 'FILE_SHARE',
  FOLDER_CREATE = 'FOLDER_CREATE',
  FOLDER_UPDATE = 'FOLDER_UPDATE',
  FOLDER_DELETE = 'FOLDER_DELETE',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  ACCESS_DENIED = 'ACCESS_DENIED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  SEARCH_PERFORMED = 'SEARCH_PERFORMED',
  BATCH_OPERATION = 'BATCH_OPERATION',
}

/**
 * Niveles de severidad para eventos
 */
export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * Estructura del evento de auditoría
 */
export interface AuditEvent {
  eventId: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  timestamp: Date;
  requestId: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  method: string;
  resourceId?: string;
  resourceType?: string;
  resourceName?: string;
  details: {
    [key: string]: any;
  };
  performance: {
    startTime: number;
    endTime?: number;
    duration?: number;
    memoryUsage?: any;
  };
  success: boolean;
  errorMessage?: string;
  stackTrace?: string;
}

/**
 * Métricas de performance
 */
export interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorRate: number;
  slowQueries: number;
  memoryPeaks: number[];
  concurrentUsers: Set<string>;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  private readonly auditLogger = new Logger('AUDIT');
  private readonly performanceLogger = new Logger('PERFORMANCE');
  private readonly securityLogger = new Logger('SECURITY');
  
  // Métricas en memoria (en producción usar Redis/Base de datos)
  private metrics: PerformanceMetrics = {
    requestCount: 0,
    averageResponseTime: 0,
    errorRate: 0,
    slowQueries: 0,
    memoryPeaks: [],
    concurrentUsers: new Set(),
  };

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    
    // Crear evento de auditoría base
    const auditEvent = this.createBaseAuditEvent(request, requestId, startTime);
    
    // Actualizar métricas
    this.updateMetrics(request);
    
    // Logging de inicio de petición
    this.logRequestStart(auditEvent);

    return next.handle().pipe(
      tap((data) => {
        // Petición exitosa
        this.handleSuccessfulRequest(auditEvent, response, data, startTime);
      }),
      catchError((error) => {
        // Error en la petición
        this.handleFailedRequest(auditEvent, error, startTime);
        throw error; // Re-lanzar el error
      }),
      finalize(() => {
        // Finalización (siempre se ejecuta)
        this.finalizeAudit(auditEvent);
      })
    );
  }

  /**
   * 🏗️ Crear evento de auditoría base
   */
  private createBaseAuditEvent(request: Request, requestId: string, startTime: number): AuditEvent {
    const user = (request as any).user;
    
    return {
      eventId: this.generateEventId(),
      eventType: this.determineEventType(request),
      severity: AuditSeverity.INFO,
      timestamp: new Date(),
      requestId,
      userId: user?.id,
      userEmail: user?.email,
      userRole: user?.role,
      ipAddress: this.getClientIP(request),
      userAgent: request.get('User-Agent') || 'Unknown',
      endpoint: request.originalUrl,
      method: request.method,
      resourceId: this.extractResourceId(request),
      resourceType: this.determineResourceType(request),
      resourceName: this.extractResourceName(request),
      details: {
        query: request.query,
        params: request.params,
        body: this.sanitizeRequestBody(request.body),
        headers: this.sanitizeHeaders(request.headers),
        fileInfo: this.extractFileInfo(request),
      },
      performance: {
        startTime,
        memoryUsage: process.memoryUsage(),
      },
      success: false, // Se actualizará después
    };
  }

  /**
   * 📝 Logging de inicio de petición
   */
  private logRequestStart(event: AuditEvent): void {
    this.auditLogger.log(`🚀 [${event.requestId}] ${event.eventType} iniciado`);
    this.auditLogger.log(`👤 [${event.requestId}] Usuario: ${event.userEmail || 'ANONYMOUS'} (${event.userId || 'N/A'})`);
    this.auditLogger.log(`🌐 [${event.requestId}] ${event.method} ${event.endpoint}`);
    this.auditLogger.log(`📍 [${event.requestId}] IP: ${event.ipAddress}`);
    
    if (event.resourceId) {
      this.auditLogger.log(`📄 [${event.requestId}] Recurso: ${event.resourceType}/${event.resourceId}`);
    }

    // Log especial para operaciones sensibles
    if (this.isSensitiveOperation(event.eventType)) {
      this.securityLogger.warn(`🔒 [${event.requestId}] Operación sensible: ${event.eventType} por ${event.userEmail}`);
    }
  }

  /**
   * ✅ Manejar petición exitosa
   */
  private handleSuccessfulRequest(
    event: AuditEvent, 
    response: Response, 
    data: any, 
    startTime: number
  ): void {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Actualizar evento
    event.success = true;
    event.performance.endTime = endTime;
    event.performance.duration = duration;
    event.details.responseSize = JSON.stringify(data || {}).length;
    event.details.statusCode = response.statusCode;

    // Determinar severidad basada en performance
    if (duration > 5000) {
      event.severity = AuditSeverity.WARNING;
      this.performanceLogger.warn(`⚠️ [${event.requestId}] Operación lenta: ${duration}ms`);
    }

    // Logging detallado
    this.auditLogger.log(`✅ [${event.requestId}] ${event.eventType} completado exitosamente`);
    this.auditLogger.log(`⏱️ [${event.requestId}] Duración: ${duration}ms`);
    this.auditLogger.log(`📊 [${event.requestId}] Estado: ${response.statusCode}`);

    // Log específico por tipo de operación
    this.logOperationSpecificDetails(event, data);

    // Actualizar métricas de performance
    this.updatePerformanceMetrics(duration, true);
  }

  /**
   * ❌ Manejar petición fallida
   */
  private handleFailedRequest(event: AuditEvent, error: any, startTime: number): void {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Actualizar evento
    event.success = false;
    event.severity = this.determineSeverityFromError(error);
    event.performance.endTime = endTime;
    event.performance.duration = duration;
    event.errorMessage = error.message;
    event.stackTrace = error.stack;
    event.details.errorCode = error.status || error.statusCode;
    event.details.errorType = error.constructor.name;

    // Logging de error
    this.auditLogger.error(`❌ [${event.requestId}] ${event.eventType} falló`);
    this.auditLogger.error(`💥 [${event.requestId}] Error: ${error.message}`);
    this.auditLogger.error(`⏱️ [${event.requestId}] Duración hasta fallo: ${duration}ms`);

    // Log de seguridad para errores críticos
    if (event.severity === AuditSeverity.CRITICAL) {
      this.securityLogger.error(`🚨 [${event.requestId}] ERROR CRÍTICO: ${error.message}`);
      this.securityLogger.error(`🚨 [${event.requestId}] Usuario: ${event.userEmail}, IP: ${event.ipAddress}`);
    }

    // Actualizar métricas de performance
    this.updatePerformanceMetrics(duration, false);
  }

  /**
   * 🏁 Finalizar auditoría
   */
  private finalizeAudit(event: AuditEvent): void {
    // Calcular memoria final
    const finalMemory = process.memoryUsage();
    event.performance.memoryUsage = {
      initial: event.performance.memoryUsage,
      final: finalMemory,
      delta: {
        rss: finalMemory.rss - event.performance.memoryUsage.rss,
        heapUsed: finalMemory.heapUsed - event.performance.memoryUsage.heapUsed,
      }
    };

    // Guardar evento de auditoría (en producción: base de datos)
    this.saveAuditEvent(event);

    // Log de métricas periódicas
    if (this.metrics.requestCount % 100 === 0) {
      this.logPerformanceMetrics();
    }
  }

  /**
   * 🔍 Determinar tipo de evento
   */
  private determineEventType(request: Request): AuditEventType {
    const { method, originalUrl } = request;
    
    if (originalUrl.includes('/upload')) return AuditEventType.FILE_UPLOAD;
    if (originalUrl.includes('/download')) return AuditEventType.FILE_DOWNLOAD;
    if (originalUrl.includes('/search')) return AuditEventType.SEARCH_PERFORMED;
    if (originalUrl.includes('/folder')) {
      if (method === 'POST') return AuditEventType.FOLDER_CREATE;
      if (method === 'PUT' || method === 'PATCH') return AuditEventType.FOLDER_UPDATE;
      if (method === 'DELETE') return AuditEventType.FOLDER_DELETE;
    }
    
    if (method === 'GET') return AuditEventType.FILE_VIEW;
    if (method === 'POST') return AuditEventType.FILE_UPLOAD;
    if (method === 'PUT' || method === 'PATCH') return AuditEventType.FILE_UPDATE;
    if (method === 'DELETE') return AuditEventType.FILE_DELETE;
    
    return AuditEventType.FILE_VIEW;
  }

  /**
   * 📋 Logging específico por operación
   */
  private logOperationSpecificDetails(event: AuditEvent, data: any): void {
    switch (event.eventType) {
      case AuditEventType.FILE_UPLOAD:
        this.auditLogger.log(`📤 [${event.requestId}] Archivo subido: ${event.resourceName}`);
        this.auditLogger.log(`📏 [${event.requestId}] Tamaño: ${data?.size || 'N/A'} bytes`);
        break;
        
      case AuditEventType.FILE_DOWNLOAD:
        this.auditLogger.log(`📥 [${event.requestId}] Archivo descargado: ${event.resourceName}`);
        break;
        
      case AuditEventType.SEARCH_PERFORMED:
        this.auditLogger.log(`🔍 [${event.requestId}] Búsqueda: "${event.details.query?.search || 'N/A'}"`);
        this.auditLogger.log(`📊 [${event.requestId}] Resultados: ${data?.total || 0}`);
        break;
        
      case AuditEventType.FOLDER_CREATE:
        this.auditLogger.log(`📁 [${event.requestId}] Carpeta creada: ${event.resourceName}`);
        break;
    }
  }

  /**
   * 📊 Actualizar métricas de performance
   */
  private updateMetrics(request: Request): void {
    this.metrics.requestCount++;
    
    const user = (request as any).user;
    if (user?.id) {
      this.metrics.concurrentUsers.add(user.id);
    }
  }

  /**
   * ⚡ Actualizar métricas de performance post-petición
   */
  private updatePerformanceMetrics(duration: number, success: boolean): void {
    // Actualizar tiempo promedio de respuesta
    const totalTime = (this.metrics.averageResponseTime * (this.metrics.requestCount - 1)) + duration;
    this.metrics.averageResponseTime = totalTime / this.metrics.requestCount;
    
    // Contar consultas lentas
    if (duration > 2000) {
      this.metrics.slowQueries++;
    }
    
    // Actualizar tasa de error
    if (!success) {
      this.metrics.errorRate = ((this.metrics.errorRate * (this.metrics.requestCount - 1)) + 1) / this.metrics.requestCount;
    } else {
      this.metrics.errorRate = (this.metrics.errorRate * (this.metrics.requestCount - 1)) / this.metrics.requestCount;
    }
  }

  /**
   * 📈 Log de métricas de performance
   */
  private logPerformanceMetrics(): void {
    this.performanceLogger.log(`📊 === MÉTRICAS DE PERFORMANCE ===`);
    this.performanceLogger.log(`📈 Total de peticiones: ${this.metrics.requestCount}`);
    this.performanceLogger.log(`⏱️ Tiempo promedio de respuesta: ${Math.round(this.metrics.averageResponseTime)}ms`);
    this.performanceLogger.log(`❌ Tasa de error: ${(this.metrics.errorRate * 100).toFixed(2)}%`);
    this.performanceLogger.log(`🐌 Consultas lentas: ${this.metrics.slowQueries}`);
    this.performanceLogger.log(`👥 Usuarios concurrentes: ${this.metrics.concurrentUsers.size}`);
    this.performanceLogger.log(`💾 Uso de memoria: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  }

  /**
   * Métodos utilitarios
   */
  private generateRequestId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getClientIP(request: Request): string {
    return request.ip || 
           request.connection.remoteAddress || 
           (request.headers['x-forwarded-for'] as string)?.split(',')[0] || 
           'Unknown';
  }

  private extractResourceId(request: Request): string | undefined {
    return request.params?.id || request.params?.fileId || request.params?.folderId;
  }

  private determineResourceType(request: Request): string {
    if (request.originalUrl.includes('/folder')) return 'folder';
    return 'file';
  }

  private extractResourceName(request: Request): string | undefined {
    return request.params?.filename || 
           request.body?.displayName || 
           request.body?.name || 
           request.params?.name;
  }

  private extractFileInfo(request: Request): any {
    if (request.file) {
      return {
        originalName: request.file.originalname,
        mimeType: request.file.mimetype,
        size: request.file.size,
      };
    }
    
    if (request.files && Array.isArray(request.files)) {
      return request.files.map(file => ({
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
      }));
    }
    
    return null;
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return null;
    
    // Eliminar campos sensibles
    const sanitized = { ...body };
    delete sanitized.password;
    delete sanitized.token;
    delete sanitized.secret;
    
    return sanitized;
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    delete sanitized.authorization;
    delete sanitized.cookie;
    return sanitized;
  }

  private isSensitiveOperation(eventType: AuditEventType): boolean {
    return [
      AuditEventType.FILE_DELETE,
      AuditEventType.FOLDER_DELETE,
      AuditEventType.PERMISSION_CHANGE,
      AuditEventType.BATCH_OPERATION,
    ].includes(eventType);
  }

  private determineSeverityFromError(error: any): AuditSeverity {
    if (error.status >= 500) return AuditSeverity.CRITICAL;
    if (error.status >= 400) return AuditSeverity.ERROR;
    return AuditSeverity.WARNING;
  }

  private saveAuditEvent(event: AuditEvent): void {
    // En producción, guardar en base de datos
    // Por ahora, solo logging estructurado
    this.auditLogger.log(`💾 [AUDIT_SAVE] ${JSON.stringify({
      eventId: event.eventId,
      eventType: event.eventType,
      userId: event.userId,
      success: event.success,
      duration: event.performance.duration,
      endpoint: event.endpoint,
    })}`);
  }
}