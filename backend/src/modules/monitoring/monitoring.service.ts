// ============================================================================
// 📊 SISTEMA DE MONITOREO BACKEND - ACALUD
// ============================================================================
import { Injectable, Logger } from '@nestjs/common';
import { Controller, Post, Body, Get, Query } from '@nestjs/common';

interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  data?: any;
  userId?: string;
  sessionId: string;
  userAgent: string;
  url: string;
  component?: string;
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: string;
  userId?: string;
  sessionId: string;
  url: string;
}

interface ErrorReport {
  error: string;
  stack?: string;
  errorInfo?: any;
  userId?: string;
  sessionId: string;
  url: string;
  timestamp: string;
  component?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  /**
   * Procesa logs del frontend
   */
  async processLogs(logs: LogEntry[]): Promise<void> {
    for (const log of logs) {
      this.logger.log(`[${log.level.toUpperCase()}] ${log.component || 'FRONTEND'}: ${log.message}`, {
        userId: log.userId,
        sessionId: log.sessionId,
        url: log.url,
        data: log.data
      });

      // En producción, enviar a servicio externo (DataDog, LogRocket, etc.)
      if (process.env.NODE_ENV === 'production') {
        await this.sendToExternalLogService(log);
      }
    }
  }

  /**
   * Procesa métricas de rendimiento
   */
  async processMetrics(metrics: PerformanceMetric[]): Promise<void> {
    for (const metric of metrics) {
      this.logger.log(`Performance metric: ${metric.name} = ${metric.value}ms`, {
        userId: metric.userId,
        sessionId: metric.sessionId,
        url: metric.url
      });

      // En producción, enviar a servicio de métricas
      if (process.env.NODE_ENV === 'production') {
        await this.sendToMetricsService(metric);
      }
    }
  }

  /**
   * Procesa reportes de errores
   */
  async processErrors(errors: ErrorReport[]): Promise<void> {
    for (const error of errors) {
      this.logger.error(`Frontend error in ${error.component}: ${error.error}`, {
        userId: error.userId,
        sessionId: error.sessionId,
        url: error.url,
        severity: error.severity,
        stack: error.stack
      });

      // En producción, enviar a servicio de errores (Sentry)
      if (process.env.NODE_ENV === 'production') {
        await this.sendToErrorService(error);
      }
    }
  }

  /**
   * Obtiene métricas de salud del sistema
   */
  async getHealthMetrics() {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    return {
      status: 'healthy',
      uptime: `${Math.floor(uptime / 60)} minutes`,
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
      },
      timestamp: new Date().toISOString()
    };
  }

  private async sendToExternalLogService(log: LogEntry): Promise<void> {
    // Implementar integración con servicio externo
    // Ejemplo: DataDog, LogRocket, etc.
  }

  private async sendToMetricsService(metric: PerformanceMetric): Promise<void> {
    // Implementar integración con servicio de métricas
    // Ejemplo: Prometheus, DataDog, etc.
  }

  private async sendToErrorService(error: ErrorReport): Promise<void> {
    // Implementar integración con Sentry u otro servicio de errores
  }
}

@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Post('logs')
  async receiveLogs(@Body() body: { logs: LogEntry[] }) {
    await this.monitoringService.processLogs(body.logs);
    return { success: true };
  }

  @Post('metrics')
  async receiveMetrics(@Body() body: { metrics: PerformanceMetric[] }) {
    await this.monitoringService.processMetrics(body.metrics);
    return { success: true };
  }

  @Post('errors')
  async receiveErrors(@Body() body: { errors: ErrorReport[] }) {
    await this.monitoringService.processErrors(body.errors);
    return { success: true };
  }

  @Get('health')
  async getHealth() {
    return this.monitoringService.getHealthMetrics();
  }
}
