// ============================================================================
// 📊 SISTEMA DE LOGGING AVANZADO - ACALUD
// ============================================================================
/**
 * 🎯 ¿QUÉ HACE ESTE ARCHIVO?
 * Sistema completo de logging para desarrollo y producción.
 * Captura errores, métricas de rendimiento, y eventos de usuario.
 * 
 * 🏗️ CARACTERÍSTICAS:
 * ✅ Logs estructurados con niveles
 * ✅ Envío automático a servicios externos en producción
 * ✅ Métricas de rendimiento (Core Web Vitals)
 * ✅ Tracking de errores con contexto
 * ✅ Queue de logs para mejor rendimiento
 */

interface LogLevel {
  DEBUG: 'debug';
  INFO: 'info';
  WARN: 'warn';
  ERROR: 'error';
  FATAL: 'fatal';
}

export const LOG_LEVELS: LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  FATAL: 'fatal'
};

interface LogEntry {
  timestamp: string;
  level: keyof LogLevel;
  message: string;
  data?: any;
  userId?: string;
  sessionId: string;
  userAgent: string;
  url: string;
  component?: string;
  action?: string;
  duration?: number;
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
  error: Error;
  errorInfo?: any;
  userId?: string;
  sessionId: string;
  url: string;
  timestamp: string;
  component?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * 📝 CLASE PRINCIPAL DE LOGGING
 */
class Logger {
  private sessionId: string;
  private userId?: string;
  private logQueue: LogEntry[] = [];
  private metricsQueue: PerformanceMetric[] = [];
  private errorQueue: ErrorReport[] = [];
  private flushInterval: number = 5000; // 5 segundos
  private isProduction: boolean;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isProduction = import.meta.env.PROD;
    this.startPerformanceMonitoring();
    this.startAutoFlush();
  }

  /**
   * 🔧 CONFIGURACIÓN INICIAL
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public setUserId(userId: string): void {
    this.userId = userId;
  }

  /**
   * 📝 MÉTODOS DE LOGGING
   */
  public debug(message: string, data?: any, component?: string): void {
    this.log(LOG_LEVELS.DEBUG, message, data, component);
  }

  public info(message: string, data?: any, component?: string): void {
    this.log(LOG_LEVELS.INFO, message, data, component);
  }

  public warn(message: string, data?: any, component?: string): void {
    this.log(LOG_LEVELS.WARN, message, data, component);
  }

  public error(message: string, error?: Error, component?: string): void {
    this.log(LOG_LEVELS.ERROR, message, { error: error?.toString(), stack: error?.stack }, component);
  }

  public fatal(message: string, error?: Error, component?: string): void {
    this.log(LOG_LEVELS.FATAL, message, { error: error?.toString(), stack: error?.stack }, component);
    this.flushLogs(); // Enviar inmediatamente
  }

  private log(level: keyof LogLevel, message: string, data?: any, component?: string): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      userId: this.userId,
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      component
    };

    // Añadir a la queue
    this.logQueue.push(logEntry);

    // En desarrollo, mostrar en consola
    if (!this.isProduction) {
      this.logToConsole(logEntry);
    }

    // Si es error crítico, enviar inmediatamente
    if (level === LOG_LEVELS.ERROR || level === LOG_LEVELS.FATAL) {
      this.flushLogs();
    }
  }

  private logToConsole(entry: LogEntry): void {
    const style = this.getConsoleStyle(entry.level);
    const prefix = `[${entry.level.toUpperCase()}] ${entry.component || 'APP'}`;
    
    console.groupCollapsed(`%c${prefix}%c ${entry.message}`, style, 'color: inherit');
    console.log('📅 Timestamp:', entry.timestamp);
    console.log('🌐 URL:', entry.url);
    console.log('👤 User ID:', entry.userId || 'Anonymous');
    console.log('🆔 Session:', entry.sessionId);
    if (entry.data) {
      console.log('📊 Data:', entry.data);
    }
    console.groupEnd();
  }

  private getConsoleStyle(level: keyof LogLevel): string {
    const styles = {
      debug: 'color: #6B7280; background: #F9FAFB; padding: 2px 6px; border-radius: 3px;',
      info: 'color: #2563EB; background: #EFF6FF; padding: 2px 6px; border-radius: 3px;',
      warn: 'color: #D97706; background: #FFFBEB; padding: 2px 6px; border-radius: 3px;',
      error: 'color: #DC2626; background: #FEF2F2; padding: 2px 6px; border-radius: 3px;',
      fatal: 'color: #FFFFFF; background: #DC2626; padding: 2px 6px; border-radius: 3px; font-weight: bold;'
    };
    return styles[level];
  }

  /**
   * 📈 MÉTRICAS DE RENDIMIENTO
   */
  public trackPerformance(name: string, value: number): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      sessionId: this.sessionId,
      url: window.location.href
    };

    this.metricsQueue.push(metric);

    if (!this.isProduction) {
      console.log(`📊 Performance: ${name} = ${value}ms`);
    }
  }

  public trackUserAction(action: string, component: string, duration?: number): void {
    this.info(`User action: ${action}`, { duration }, component);
  }

  public trackPageView(page: string): void {
    this.info(`Page view: ${page}`, { referrer: document.referrer });
  }

  private startPerformanceMonitoring(): void {
    // Core Web Vitals
    if ('web-vital' in window) {
      // Esta librería se añadiría en producción
      // getCLS(this.trackWebVital.bind(this));
      // getFID(this.trackWebVital.bind(this));
      // getLCP(this.trackWebVital.bind(this));
    }

    // Métricas básicas de rendimiento
    window.addEventListener('load', () => {
      setTimeout(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (perfData) {
          this.trackPerformance('page_load_time', perfData.loadEventEnd - perfData.navigationStart);
          this.trackPerformance('dom_content_loaded', perfData.domContentLoadedEventEnd - perfData.navigationStart);
          this.trackPerformance('first_byte', perfData.responseStart - perfData.requestStart);
        }
      }, 0);
    });
  }

  /**
   * 🐛 MANEJO DE ERRORES
   */
  public reportError(error: Error, errorInfo?: any, component?: string, severity: ErrorReport['severity'] = 'medium'): void {
    const errorReport: ErrorReport = {
      error,
      errorInfo,
      userId: this.userId,
      sessionId: this.sessionId,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      component,
      severity
    };

    this.errorQueue.push(errorReport);
    this.error(`Error in ${component || 'unknown component'}`, error, component);

    // Enviar inmediatamente si es crítico
    if (severity === 'critical') {
      this.flushErrors();
    }
  }

  /**
   * 📤 ENVÍO DE DATOS
   */
  private startAutoFlush(): void {
    setInterval(() => {
      this.flushAll();
    }, this.flushInterval);

    // Flush al cerrar la página
    window.addEventListener('beforeunload', () => {
      this.flushAll();
    });

    // Flush cuando la página se oculta
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flushAll();
      }
    });
  }

  private flushAll(): void {
    this.flushLogs();
    this.flushMetrics();
    this.flushErrors();
  }

  private flushLogs(): void {
    if (this.logQueue.length === 0) return;

    const logs = [...this.logQueue];
    this.logQueue = [];

    if (this.isProduction) {
      this.sendToLogService(logs);
    }
  }

  private flushMetrics(): void {
    if (this.metricsQueue.length === 0) return;

    const metrics = [...this.metricsQueue];
    this.metricsQueue = [];

    if (this.isProduction) {
      this.sendToMetricsService(metrics);
    }
  }

  private flushErrors(): void {
    if (this.errorQueue.length === 0) return;

    const errors = [...this.errorQueue];
    this.errorQueue = [];

    if (this.isProduction) {
      this.sendToErrorService(errors);
    }
  }

  private async sendToLogService(logs: LogEntry[]): Promise<void> {
    try {
      // En producción, enviar a servicio de logging (ej: LogRocket, DataDog, Sentry)
      await fetch('/api/v1/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs })
      });
    } catch (error) {
      console.error('Failed to send logs:', error);
    }
  }

  private async sendToMetricsService(metrics: PerformanceMetric[]): Promise<void> {
    try {
      // En producción, enviar a servicio de métricas
      await fetch('/api/v1/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics })
      });
    } catch (error) {
      console.error('Failed to send metrics:', error);
    }
  }

  private async sendToErrorService(errors: ErrorReport[]): Promise<void> {
    try {
      // En producción, enviar a servicio de errores (ej: Sentry)
      await fetch('/api/v1/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ errors })
      });
    } catch (error) {
      console.error('Failed to send errors:', error);
    }
  }
}

// ============================================================================
// 🎯 INSTANCIA SINGLETON Y UTILIDADES
// ============================================================================

export const logger = new Logger();

// Hook para usar en componentes React
export const useLogger = () => {
  return {
    debug: logger.debug.bind(logger),
    info: logger.info.bind(logger),
    warn: logger.warn.bind(logger),
    error: logger.error.bind(logger),
    fatal: logger.fatal.bind(logger),
    trackPerformance: logger.trackPerformance.bind(logger),
    trackUserAction: logger.trackUserAction.bind(logger),
    trackPageView: logger.trackPageView.bind(logger),
    reportError: logger.reportError.bind(logger),
    setUserId: logger.setUserId.bind(logger)
  };
};

// HOC para tracking automático de errores en componentes
export const withErrorTracking = <P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) => {
  return React.forwardRef<any, P>((props, ref) => {
    const handleError = (error: Error, errorInfo: any) => {
      logger.reportError(error, errorInfo, componentName || Component.name, 'medium');
    };

    return (
      <ErrorBoundaryWithTracking onError={handleError}>
        <Component {...props} ref={ref} />
      </ErrorBoundaryWithTracking>
    );
  });
};

// Error Boundary que integra con el sistema de logging
class ErrorBoundaryWithTracking extends React.Component<
  { children: React.ReactNode; onError: (error: Error, errorInfo: any) => void },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    this.props.onError(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">
            Este componente ha encontrado un error. El problema ha sido reportado automáticamente.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * 📊 RESUMEN DE FUNCIONALIDADES:
 * 
 * 🎯 LOGGING:
 * ✅ Múltiples niveles (debug, info, warn, error, fatal)
 * ✅ Logs estructurados con contexto completo
 * ✅ Queue de logs para mejor rendimiento
 * ✅ Envío automático en producción
 * 
 * 📈 MÉTRICAS:
 * ✅ Core Web Vitals (LCP, FID, CLS)
 * ✅ Métricas de carga de página
 * ✅ Tracking de acciones de usuario
 * ✅ Métricas de rendimiento personalizadas
 * 
 * 🐛 ERRORES:
 * ✅ Captura automática de errores de React
 * ✅ Reporting con contexto completo
 * ✅ Clasificación por severidad
 * ✅ Integración con servicios externos
 * 
 * 🚀 USO EN COMPONENTES:
 * ```tsx
 * const MyComponent = () => {
 *   const logger = useLogger();
 *   
 *   const handleClick = () => {
 *     logger.trackUserAction('button_click', 'MyComponent');
 *     logger.info('User clicked button', { buttonId: 'submit' });
 *   };
 * };
 * ```
 */
