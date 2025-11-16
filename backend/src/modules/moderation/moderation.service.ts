/**
 * 🛡️ SERVICIO DE MODERACIÓN - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Maneja toda la lógica de negocio relacionada con el sistema de reportes y moderación.
 * Permite a usuarios reportar contenido inapropiado y a moderadores gestionar estos reportes.
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Responsabilidad única de gestión de reportes y moderación
 * - OCP: Extensible para nuevos tipos de reportes sin modificar código existente
 * - LSP: Implementa correctamente los contratos de servicio
 * - ISP: Interfaces específicas para cada operación
 * - DIP: Depende de abstracciones (repositorios, interfaces) no de implementaciones
 * 
 * CASOS DE USO CUBIERTOS:
 * - CU-40: Reportar actividad por contenido inapropiado
 * - CU-41: Ver lista de reportes como moderador
 * - CU-42: Gestionar reportes (aprobar/rechazar/resolver)
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, In, IsNull, Not } from 'typeorm';
import { Report, ReportStatus, ReportSeverity, ReportType } from './entities/report.entity';
import { CreateReportDto, UpdateReportDto, ReportFilterDto } from './dto';
import { User, UserRole } from '../users/user.entity';
import { Activity } from '../activities/activity.entity';

/**
 * Interfaz para respuestas paginadas de reportes
 */
interface PaginatedReports {
  /** Arreglo de reportes */
  data: Report[];
  /** Información de paginación */
  pagination: {
    /** Página actual */
    page: number;
    /** Elementos por página */
    limit: number;
    /** Total de elementos */
    total: number;
    /** Total de páginas */
    totalPages: number;
    /** Si hay página siguiente */
    hasNext: boolean;
    /** Si hay página anterior */
    hasPrev: boolean;
  };
}

/**
 * Interfaz para estadísticas de reportes
 */
interface ReportStatistics {
  /** Total de reportes */
  total: number;
  /** Reportes por estado */
  byStatus: Record<ReportStatus, number>;
  /** Reportes por tipo */
  byType: Record<ReportType, number>;
  /** Reportes por severidad */
  bySeverity: Record<ReportSeverity, number>;
  /** Reportes pendientes */
  pending: number;
  /** Reportes en revisión */
  reviewing: number;
  /** Reportes resueltos */
  resolved: number;
  /** Reportes rechazados */
  rejected: number;
  /** Tiempo promedio de resolución (días) */
  avgResolutionTime: number;
  /** Reportes creados en últimas 24h */
  recentReports: number;
}

/**
 * Servicio de moderación y gestión de reportes
 * 
 * @description Proporciona todas las operaciones necesarias para el sistema de reportes:
 * creación, listado, actualización, estadísticas y validaciones.
 * 
 * @example
 * ```typescript
 * // Crear un reporte
 * const report = await moderationService.createReport(createReportDto, userId, ip, userAgent);
 * 
 * // Listar reportes pendientes
 * const reports = await moderationService.findReports({ status: ReportStatus.PENDING }, page, limit);
 * 
 * // Actualizar reporte
 * const updated = await moderationService.updateReport(reportId, updateDto, moderatorId);
 * ```
 */
@Injectable()
export class ModerationService {
  /**
   * Logger para registro de operaciones del servicio
   */
  private readonly logger = new Logger(ModerationService.name);

  constructor(
    /**
     * Repositorio de reportes
     * @description Maneja todas las operaciones de base de datos para reportes
     */
    @InjectRepository(Report)
    private readonly reportRepository: Repository<Report>,

    /**
     * Repositorio de usuarios
     * @description Usado para validar usuarios reporteros y moderadores
     */
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    /**
     * Repositorio de actividades
     * @description Usado para validar actividades reportadas
     */
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
  ) {
    this.logger.log('🛡️ ModerationService inicializado correctamente');
  }

  // =============================================================================
  // CREAR REPORTE (CU-40)
  // =============================================================================

  /**
   * Crea un nuevo reporte de contenido inapropiado
   * 
   * @description Permite a cualquier usuario autenticado reportar contenido que considere
   * inapropiado. Incluye validaciones para prevenir spam y abusos del sistema.
   * 
   * VALIDACIONES:
   * - Usuario reportero existe y está activo
   * - Actividad reportada existe (si se proporciona)
   * - Usuario no ha reportado el mismo contenido recientemente (anti-spam)
   * - Límite de reportes por usuario por día (anti-abuso)
   * - Todos los campos requeridos están presentes y válidos
   * 
   * @param createReportDto - Datos del reporte a crear
   * @param reporterId - ID del usuario que crea el reporte
   * @param ipAddress - IP del usuario (para detección de spam)
   * @param userAgent - User-Agent del navegador (para análisis)
   * @returns Reporte creado con todas sus relaciones
   * 
   * @throws NotFoundException Si el usuario o la actividad no existen
   * @throws BadRequestException Si los datos son inválidos
   * @throws ConflictException Si se detecta spam o abuso
   * @throws ForbiddenException Si el usuario está suspendido
   * 
   * @example
   * ```typescript
   * const createDto = {
   *   type: ReportType.INAPPROPRIATE_CONTENT,
   *   reason: "Contiene lenguaje ofensivo",
   *   description: "La pregunta 3 usa términos discriminatorios...",
   *   severity: ReportSeverity.HIGH,
   *   reportedActivityId: "123e4567-..."
   * };
   * 
   * const report = await moderationService.createReport(
   *   createDto,
   *   userId,
   *   "192.168.1.1",
   *   "Mozilla/5.0..."
   * );
   * console.log(`Reporte creado: ${report.id}`);
   * ```
   */
  async createReport(
    createReportDto: CreateReportDto,
    reporterId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<Report> {
    this.logger.log(`📝 Creando reporte de tipo: ${createReportDto.type} por usuario: ${reporterId}`);

    // 1. VALIDAR USUARIO REPORTERO
    const reporter = await this.userRepository.findOne({
      where: { id: reporterId },
    });

    if (!reporter) {
      this.logger.error(`❌ Usuario reportero no encontrado: ${reporterId}`);
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!reporter.isActive) {
      this.logger.error(`❌ Usuario reportero inactivo: ${reporterId}`);
      throw new ForbiddenException('Tu cuenta está suspendida y no puedes crear reportes');
    }

    // 2. VALIDAR ACTIVIDAD REPORTADA (si se proporciona)
    let reportedActivity: Activity | null = null;
    if (createReportDto.reportedActivityId) {
      reportedActivity = await this.activityRepository.findOne({
        where: { id: createReportDto.reportedActivityId },
      });

      if (!reportedActivity) {
        this.logger.error(`❌ Actividad reportada no encontrada: ${createReportDto.reportedActivityId}`);
        throw new NotFoundException('La actividad reportada no existe');
      }
    }

    // 3. VALIDAR SPAM: Verificar si el usuario ya reportó el mismo contenido recientemente
    if (createReportDto.reportedActivityId) {
      const recentDuplicate = await this.reportRepository.findOne({
        where: {
          reporterId,
          reportedActivityId: createReportDto.reportedActivityId,
          createdAt: Between(
            new Date(Date.now() - 24 * 60 * 60 * 1000), // Últimas 24 horas
            new Date()
          ),
        },
      });

      if (recentDuplicate) {
        this.logger.warn(`⚠️ Intento de reporte duplicado por usuario: ${reporterId}`);
        throw new ConflictException(
          'Ya has reportado este contenido recientemente. Por favor espera 24 horas antes de crear un nuevo reporte.'
        );
      }
    }

    // 4. VALIDAR LÍMITE DE REPORTES POR DÍA (máximo 10 reportes por usuario por día)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const reportsToday = await this.reportRepository.count({
      where: {
        reporterId,
        createdAt: Between(todayStart, todayEnd),
      },
    });

    if (reportsToday >= 10) {
      this.logger.warn(`⚠️ Usuario excedió límite de reportes diarios: ${reporterId} (${reportsToday}/10)`);
      throw new ConflictException(
        'Has alcanzado el límite de reportes por día (10). Por favor intenta mañana.'
      );
    }

    // 5. CREAR EL REPORTE
    const report = this.reportRepository.create({
      type: createReportDto.type,
      reason: createReportDto.reason.trim(),
      description: createReportDto.description.trim(),
      severity: createReportDto.severity || ReportSeverity.MEDIUM,
      status: ReportStatus.PENDING,
      reporterId,
      reporter,
      reportedActivityId: createReportDto.reportedActivityId || null,
      reportedActivity,
      ipAddress: ipAddress || null,
      userAgent: userAgent || null,
      moderatorId: null,
      moderatorNotes: null,
      actionTaken: null,
      reviewedAt: null,
    });

    // 6. GUARDAR EN BASE DE DATOS
    const savedReport = await this.reportRepository.save(report);
    this.logger.log(`✅ Reporte creado exitosamente: ${savedReport.id} (Severidad: ${savedReport.severity})`);

    // 7. SI ES CRÍTICO, NOTIFICAR A MODERADORES (implementar notificación)
    if (savedReport.severity === ReportSeverity.CRITICAL) {
      this.logger.warn(`🚨 Reporte CRÍTICO creado: ${savedReport.id} - requiere atención inmediata`);
      // TODO: Enviar notificación push/email a moderadores
      // await this.notificationService.notifyModerators(savedReport);
    }

    // 8. RETORNAR REPORTE CON RELACIONES
    return this.reportRepository.findOne({
      where: { id: savedReport.id },
      relations: ['reporter', 'reportedActivity', 'moderator'],
    });
  }

  // =============================================================================
  // LISTAR REPORTES CON FILTROS (CU-41)
  // =============================================================================

  /**
   * Lista reportes con filtros y paginación
   * 
   * @description Permite a moderadores y admins ver reportes filtrados por múltiples criterios:
   * tipo, estado, severidad, fechas, usuario, etc. Incluye paginación y ordenamiento.
   * 
   * CARACTERÍSTICAS:
   * - Filtrado por múltiples criterios simultáneos
   * - Paginación eficiente
   * - Ordenamiento por fecha de creación (más recientes primero)
   * - Búsqueda de texto en reason y description
   * - Carga de relaciones (reporter, activity, moderator)
   * 
   * @param filters - Criterios de filtrado
   * @param page - Número de página (base 1)
   * @param limit - Elementos por página (máximo 100)
   * @returns Objeto con arreglo de reportes y metadata de paginación
   * 
   * @example
   * ```typescript
   * // Buscar reportes pendientes de alta prioridad
   * const result = await moderationService.findReports({
   *   status: ReportStatus.PENDING,
   *   severity: ReportSeverity.HIGH
   * }, 1, 10);
   * 
   * console.log(`Encontrados ${result.pagination.total} reportes`);
   * result.data.forEach(report => {
   *   console.log(`- ${report.reason} (${report.severity})`);
   * });
   * ```
   */
  async findReports(
    filters: ReportFilterDto,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedReports> {
    this.logger.log(`🔍 Listando reportes con filtros: ${JSON.stringify(filters)} - Página: ${page}`);

    // Validar y ajustar parámetros de paginación
    const pageNumber = Math.max(1, page);
    const limitNumber = Math.min(100, Math.max(1, limit));
    const skip = (pageNumber - 1) * limitNumber;

    // Construir el objeto where dinámicamente
    const where: any = {};

    // Filtro por tipo
    if (filters.type) {
      where.type = filters.type;
    }

    // Filtro por estado
    if (filters.status) {
      where.status = filters.status;
    }

    // Filtro por severidad
    if (filters.severity) {
      where.severity = filters.severity;
    }

    // Filtro por reportero
    if (filters.reporterId) {
      where.reporterId = filters.reporterId;
    }

    // Filtro por moderador
    if (filters.moderatorId) {
      where.moderatorId = filters.moderatorId;
    }

    // Filtro por actividad reportada
    if (filters.reportedActivityId) {
      where.reportedActivityId = filters.reportedActivityId;
    }

    // Filtro por rango de fechas
    if (filters.startDate || filters.endDate) {
      const startDate = filters.startDate ? new Date(filters.startDate) : new Date(0);
      const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
      where.createdAt = Between(startDate, endDate);
    }

    // Búsqueda de texto (en reason o description)
    if (filters.search) {
      // TypeORM no soporta OR directamente en where simple, usar queryBuilder
      const queryBuilder = this.reportRepository
        .createQueryBuilder('report')
        .leftJoinAndSelect('report.reporter', 'reporter')
        .leftJoinAndSelect('report.reportedActivity', 'activity')
        .leftJoinAndSelect('report.moderator', 'moderator')
        .where('1=1'); // Base para agregar condiciones

      // Aplicar filtros estáticos
      Object.keys(where).forEach(key => {
        if (key === 'createdAt') {
          // Manejar Between especialmente
          queryBuilder.andWhere(`report.${key} BETWEEN :startDate AND :endDate`, {
            startDate: where[key]._value[0],
            endDate: where[key]._value[1],
          });
        } else {
          queryBuilder.andWhere(`report.${key} = :${key}`, { [key]: where[key] });
        }
      });

      // Aplicar búsqueda de texto (case-insensitive)
      queryBuilder.andWhere(
        '(LOWER(report.reason) LIKE LOWER(:search) OR LOWER(report.description) LIKE LOWER(:search))',
        { search: `%${filters.search}%` }
      );

      // Contar total
      const total = await queryBuilder.getCount();

      // Obtener datos paginados
      const data = await queryBuilder
        .orderBy('report.createdAt', 'DESC')
        .skip(skip)
        .take(limitNumber)
        .getMany();

      this.logger.log(`📊 Encontrados ${total} reportes (mostrando ${data.length})`);

      return {
        data,
        pagination: {
          page: pageNumber,
          limit: limitNumber,
          total,
          totalPages: Math.ceil(total / limitNumber),
          hasNext: pageNumber < Math.ceil(total / limitNumber),
          hasPrev: pageNumber > 1,
        },
      };
    }

    // Búsqueda sin texto (más eficiente)
    const [data, total] = await this.reportRepository.findAndCount({
      where,
      relations: ['reporter', 'reportedActivity', 'moderator'],
      order: { createdAt: 'DESC' },
      skip,
      take: limitNumber,
    });

    this.logger.log(`📊 Encontrados ${total} reportes (mostrando ${data.length})`);

    return {
      data,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
        hasNext: pageNumber < Math.ceil(total / limitNumber),
        hasPrev: pageNumber > 1,
      },
    };
  }

  // =============================================================================
  // OBTENER REPORTE POR ID
  // =============================================================================

  /**
   * Obtiene un reporte específico por su ID
   * 
   * @description Retorna un reporte con todas sus relaciones cargadas.
   * Usado para ver detalles completos antes de tomar acción.
   * 
   * @param id - ID del reporte (UUID)
   * @returns Reporte con todas sus relaciones
   * 
   * @throws NotFoundException Si el reporte no existe
   * 
   * @example
   * ```typescript
   * const report = await moderationService.findReportById('123e4567-...');
   * console.log(`Reporte: ${report.reason}`);
   * console.log(`Reportado por: ${report.reporter.name}`);
   * console.log(`Estado: ${report.status}`);
   * ```
   */
  async findReportById(id: string): Promise<Report> {
    this.logger.log(`🔍 Buscando reporte: ${id}`);

    const report = await this.reportRepository.findOne({
      where: { id },
      relations: ['reporter', 'reportedActivity', 'reportedActivity.creator', 'moderator'],
    });

    if (!report) {
      this.logger.error(`❌ Reporte no encontrado: ${id}`);
      throw new NotFoundException('Reporte no encontrado');
    }

    this.logger.log(`✅ Reporte encontrado: ${report.id} (${report.status})`);
    return report;
  }

  // =============================================================================
  // ACTUALIZAR REPORTE (CU-42)
  // =============================================================================

  /**
   * Actualiza un reporte existente (solo moderadores)
   * 
   * @description Permite a moderadores cambiar el estado de un reporte,
   * agregar notas y registrar acciones tomadas. Incluye validaciones de permisos.
   * 
   * VALIDACIONES:
   * - Reporte existe
   * - Usuario es moderador o admin
   * - Transiciones de estado son válidas
   * - Si se resuelve/rechaza, requiere notas del moderador
   * 
   * ACCIONES AUTOMÁTICAS:
   * - Asigna moderador automáticamente al cambiar a "reviewing"
   * - Registra fecha de revisión al resolver/rechazar
   * - Notifica al usuario que reportó (si el reporte se resuelve)
   * 
   * @param id - ID del reporte a actualizar
   * @param updateReportDto - Datos a actualizar
   * @param moderatorId - ID del moderador que actualiza
   * @returns Reporte actualizado
   * 
   * @throws NotFoundException Si el reporte no existe
   * @throws ForbiddenException Si el usuario no es moderador
   * @throws BadRequestException Si la transición de estado es inválida
   * 
   * @example
   * ```typescript
   * // Resolver un reporte
   * const updated = await moderationService.updateReport(
   *   reportId,
   *   {
   *     status: ReportStatus.RESOLVED,
   *     moderatorNotes: "Contenido revisado, efectivamente viola políticas.",
   *     actionTaken: "Actividad desactivada y usuario advertido"
   *   },
   *   moderatorId
   * );
   * console.log(`Reporte ${updated.id} resuelto por ${updated.moderator.name}`);
   * ```
   */
  async updateReport(
    id: string,
    updateReportDto: UpdateReportDto,
    moderatorId: string,
  ): Promise<Report> {
    this.logger.log(`📝 Actualizando reporte: ${id} por moderador: ${moderatorId}`);

    // 1. VALIDAR QUE EL REPORTE EXISTE
    const report = await this.findReportById(id);

    // 2. VALIDAR QUE EL USUARIO ES MODERADOR O ADMIN
    const moderator = await this.userRepository.findOne({
      where: { id: moderatorId },
    });

    if (!moderator) {
      this.logger.error(`❌ Moderador no encontrado: ${moderatorId}`);
      throw new NotFoundException('Usuario moderador no encontrado');
    }

    // Solo admins pueden moderar reportes (en el futuro se puede agregar rol MODERATOR)
    if (![UserRole.ADMIN].includes(moderator.role)) {
      this.logger.error(`❌ Usuario sin permisos de moderador: ${moderatorId} (Rol: ${moderator.role})`);
      throw new ForbiddenException('Solo administradores pueden actualizar reportes');
    }

    // 3. VALIDAR TRANSICIONES DE ESTADO
    if (updateReportDto.status) {
      const validTransitions: Record<ReportStatus, ReportStatus[]> = {
        [ReportStatus.PENDING]: [ReportStatus.REVIEWING, ReportStatus.CLOSED],
        [ReportStatus.REVIEWING]: [ReportStatus.RESOLVED, ReportStatus.REJECTED, ReportStatus.PENDING, ReportStatus.CLOSED],
        [ReportStatus.RESOLVED]: [ReportStatus.CLOSED],
        [ReportStatus.REJECTED]: [ReportStatus.CLOSED],
        [ReportStatus.CLOSED]: [],
      };

      const allowedStates = validTransitions[report.status];
      if (!allowedStates.includes(updateReportDto.status)) {
        this.logger.error(
          `❌ Transición de estado inválida: ${report.status} -> ${updateReportDto.status}`
        );
        throw new BadRequestException(
          `No se puede cambiar el estado de ${report.status} a ${updateReportDto.status}`
        );
      }
    }

    // 4. VALIDAR QUE REPORTES RESUELTOS/RECHAZADOS TENGAN NOTAS
    if (
      updateReportDto.status &&
      [ReportStatus.RESOLVED, ReportStatus.REJECTED].includes(updateReportDto.status)
    ) {
      if (!updateReportDto.moderatorNotes && !report.moderatorNotes) {
        this.logger.error(`❌ Intento de resolver/rechazar sin notas: ${id}`);
        throw new BadRequestException(
          'Debes proporcionar notas del moderador al resolver o rechazar un reporte'
        );
      }
    }

    // 5. APLICAR ACTUALIZACIONES
    if (updateReportDto.status) {
      report.status = updateReportDto.status;
    }

    if (updateReportDto.moderatorNotes) {
      report.moderatorNotes = updateReportDto.moderatorNotes.trim();
    }

    if (updateReportDto.actionTaken) {
      report.actionTaken = updateReportDto.actionTaken.trim();
    }

    // 6. ASIGNAR MODERADOR SI PASA A "REVIEWING" Y NO TIENE MODERADOR
    if (updateReportDto.status === ReportStatus.REVIEWING && !report.moderatorId) {
      report.moderatorId = moderatorId;
      report.moderator = moderator;
      this.logger.log(`✅ Moderador asignado: ${moderator.name} (${moderatorId})`);
    }

    // 7. REGISTRAR FECHA DE REVISIÓN SI SE RESUELVE/RECHAZA
    if (
      updateReportDto.status &&
      [ReportStatus.RESOLVED, ReportStatus.REJECTED].includes(updateReportDto.status)
    ) {
      report.reviewedAt = new Date();
      this.logger.log(`✅ Reporte marcado como revisado en: ${report.reviewedAt.toISOString()}`);
    }

    // 8. GUARDAR CAMBIOS
    const updatedReport = await this.reportRepository.save(report);
    this.logger.log(`✅ Reporte actualizado exitosamente: ${updatedReport.id} (${updatedReport.status})`);

    // 9. NOTIFICAR AL USUARIO QUE REPORTÓ (si está resuelto)
    if (updateReportDto.status === ReportStatus.RESOLVED) {
      this.logger.log(`📧 Enviando notificación al reportero: ${report.reporter.email}`);
      // TODO: Implementar notificación
      // await this.notificationService.notifyReportResolved(report);
    }

    // 10. RETORNAR CON RELACIONES
    return this.findReportById(updatedReport.id);
  }

  // =============================================================================
  // ESTADÍSTICAS DE REPORTES
  // =============================================================================

  /**
   * Obtiene estadísticas completas del sistema de reportes
   * 
   * @description Genera estadísticas agregadas útiles para dashboards de moderación:
   * totales por estado, tipo, severidad, tiempos de resolución, etc.
   * 
   * @param startDate - Fecha de inicio (opcional)
   * @param endDate - Fecha de fin (opcional)
   * @returns Objeto con estadísticas completas
   * 
   * @example
   * ```typescript
   * const stats = await moderationService.getReportStatistics();
   * console.log(`Total reportes: ${stats.total}`);
   * console.log(`Pendientes: ${stats.pending}`);
   * console.log(`Tiempo promedio resolución: ${stats.avgResolutionTime} días`);
   * ```
   */
  async getReportStatistics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<ReportStatistics> {
    this.logger.log('📊 Generando estadísticas de reportes');

    const where: any = {};
    if (startDate || endDate) {
      const start = startDate || new Date(0);
      const end = endDate || new Date();
      where.createdAt = Between(start, end);
    }

    // Total de reportes
    const total = await this.reportRepository.count({ where });

    // Reportes por estado
    const byStatus: any = {};
    for (const status of Object.values(ReportStatus)) {
      byStatus[status] = await this.reportRepository.count({
        where: { ...where, status },
      });
    }

    // Reportes por tipo
    const byType: any = {};
    for (const type of Object.values(ReportType)) {
      byType[type] = await this.reportRepository.count({
        where: { ...where, type },
      });
    }

    // Reportes por severidad
    const bySeverity: any = {};
    for (const severity of Object.values(ReportSeverity)) {
      bySeverity[severity] = await this.reportRepository.count({
        where: { ...where, severity },
      });
    }

    // Reportes recientes (últimas 24 horas)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentReports = await this.reportRepository.count({
      where: {
        createdAt: Between(oneDayAgo, new Date()),
      },
    });

    // Tiempo promedio de resolución
    const resolvedReports = await this.reportRepository.find({
      where: {
        ...where,
        status: In([ReportStatus.RESOLVED, ReportStatus.REJECTED]),
        reviewedAt: Not(IsNull()),
      },
    });

    let avgResolutionTime = 0;
    if (resolvedReports.length > 0) {
      const totalDays = resolvedReports.reduce((sum, report) => {
        const createdAt = report.createdAt.getTime();
        const reviewedAt = report.reviewedAt?.getTime() || Date.now();
        const days = (reviewedAt - createdAt) / (1000 * 60 * 60 * 24);
        return sum + days;
      }, 0);
      avgResolutionTime = Math.round((totalDays / resolvedReports.length) * 10) / 10;
    }

    const statistics: ReportStatistics = {
      total,
      byStatus,
      byType,
      bySeverity,
      pending: byStatus[ReportStatus.PENDING] || 0,
      reviewing: byStatus[ReportStatus.REVIEWING] || 0,
      resolved: byStatus[ReportStatus.RESOLVED] || 0,
      rejected: byStatus[ReportStatus.REJECTED] || 0,
      avgResolutionTime,
      recentReports,
    };

    this.logger.log(`📈 Estadísticas generadas: ${total} reportes analizados`);
    return statistics;
  }

  // =============================================================================
  // ELIMINAR REPORTE (solo admins)
  // =============================================================================

  /**
   * Elimina permanentemente un reporte (solo administradores)
   * 
   * @description Borra un reporte de la base de datos. Esta acción es irreversible
   * y solo debe ser usada en casos excepcionales (ej: reportes de prueba, spam extremo).
   * 
   * @param id - ID del reporte a eliminar
   * @param adminId - ID del administrador que elimina
   * 
   * @throws NotFoundException Si el reporte no existe
   * @throws ForbiddenException Si el usuario no es admin
   * 
   * @example
   * ```typescript
   * await moderationService.deleteReport(reportId, adminId);
   * console.log('Reporte eliminado permanentemente');
   * ```
   */
  async deleteReport(id: string, adminId: string): Promise<void> {
    this.logger.log(`🗑️ Eliminando reporte: ${id} por admin: ${adminId}`);

    // Validar que existe
    const report = await this.findReportById(id);

    // Validar que el usuario es admin
    const admin = await this.userRepository.findOne({
      where: { id: adminId },
    });

    if (!admin || admin.role !== UserRole.ADMIN) {
      this.logger.error(`❌ Usuario sin permisos de admin: ${adminId}`);
      throw new ForbiddenException('Solo administradores pueden eliminar reportes');
    }

    // Eliminar
    await this.reportRepository.remove(report);
    this.logger.log(`✅ Reporte eliminado: ${id}`);
  }
}
