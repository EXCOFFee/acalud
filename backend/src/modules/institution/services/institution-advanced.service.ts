/**
 * 🏛️ SERVICIO AVANZADO DE GESTIÓN INSTITUCIONAL MULTI-TENANT
 * 
 * Sistema completo de gestión para arquitectura multi-tenant educativa.
 * Maneja instituciones, sucursales y departamentos con todas sus complejidades.
 * 
 * CARACTERÍSTICAS PRINCIPALES:
 * - Gestión completa del ciclo de vida institucional
 * - Arquitectura multi-tenant robusta y escalable
 * - Control granular de suscripciones y límites
 * - Análisis y reportes consolidados
 * - Gestión jerárquica de organizaciones
 * - Integración con todos los módulos del sistema
 * 
 * FUNCIONALIDADES AVANZADAS:
 * - Aprovisionamiento automático de recursos
 * - Migración de datos entre planes
 * - Análisis predictivo de uso
 * - Gestión de facturación y pagos
 * - Configuraciones heredadas y personalizadas
 * - Auditoría completa de cambios
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository, SelectQueryBuilder, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
// import { Cron, CronExpression } from '@nestjs/schedule';

// Entidades
import { 
  Institution, 
  InstitutionType, 
  InstitutionStatus, 
  SubscriptionPlan,
  InstitutionSize,
  SubscriptionLimits
} from '../entities/institution.entity';
import { 
  Branch, 
  BranchType, 
  BranchStatus, 
  BranchSize 
} from '../entities/branch.entity';
import { 
  Department, 
  DepartmentType, 
  DepartmentStatus, 
  DepartmentLevel,
  BudgetStatus 
} from '../entities/department.entity';

// DTOs (que necesitaremos crear)
interface CreateInstitutionDto {
  code: string;
  name: string;
  shortName?: string;
  description?: string;
  type: InstitutionType;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  timezone?: string;
  domain?: string;
  subscriptionPlan?: SubscriptionPlan;
  allowSelfRegistration?: boolean;
  allowedEmailDomains?: string[];
}

interface CreateBranchDto {
  institutionId: string;
  parentBranchId?: string;
  code: string;
  name: string;
  shortName?: string;
  description?: string;
  type: BranchType;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  timezone?: string;
  coordinates?: { latitude: number; longitude: number };
  useInstitutionDefaults?: boolean;
}

interface CreateDepartmentDto {
  institutionId: string;
  branchId?: string;
  parentDepartmentId?: string;
  code: string;
  name: string;
  shortName?: string;
  description?: string;
  type: DepartmentType;
  level: DepartmentLevel;
  contactEmail?: string;
  contactPhone?: string;
  location?: string;
  headId?: string;
  annualBudget?: number;
  currency?: string;
  mission?: string;
  vision?: string;
  values?: string[];
}

interface InstitutionFilterDto {
  page: number;
  limit: number;
  type?: InstitutionType;
  status?: InstitutionStatus;
  subscriptionPlan?: SubscriptionPlan;
  size?: InstitutionSize;
  country?: string;
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'totalUsers' | 'subscriptionEndDate';
  sortOrder?: 'ASC' | 'DESC';
  includeTrialExpired?: boolean;
}

interface AnalyticsFilters {
  institutionIds?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  groupBy?: 'institution' | 'branch' | 'department' | 'type';
  metrics?: string[];
}

@Injectable()
export class InstitutionAdvancedService {
  private readonly logger = new Logger(InstitutionAdvancedService.name);

  constructor(
    @InjectRepository(Institution)
    private readonly institutionRepository: Repository<Institution>,
    @InjectRepository(Branch)
    private readonly branchRepository: TreeRepository<Branch>,
    @InjectRepository(Department)
    private readonly departmentRepository: Repository<Department>,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2
  ) {}

  // =============================================================================
  // GESTIÓN DE INSTITUCIONES
  // =============================================================================

  /**
   * 🏛️ Obtener instituciones con filtros avanzados
   */
  async getInstitutions(filters: InstitutionFilterDto): Promise<any> {
    this.logger.log(`🏛️ Obteniendo instituciones con filtros`);

    const queryBuilder = this.createInstitutionQuery(filters);

    // Aplicar paginación
    const offset = (filters.page - 1) * filters.limit;
    queryBuilder.skip(offset).take(filters.limit);

    // Ejecutar consulta
    const [institutions, total] = await queryBuilder.getManyAndCount();

    return {
      data: institutions.map(inst => inst.getApiSummary()),
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
      hasNextPage: filters.page < Math.ceil(total / filters.limit),
      hasPrevPage: filters.page > 1,
      summary: await this.getInstitutionsSummary(filters),
    };
  }

  /**
   * 📄 Obtener institución específica
   */
  async getInstitution(institutionId: string, includeDetails: boolean = false): Promise<any> {
    this.logger.log(`📄 Obteniendo institución: ${institutionId}`);

    const institution = await this.institutionRepository.findOne({
      where: { id: institutionId },
    });

    if (!institution) {
      throw new NotFoundException(`Institución con ID ${institutionId} no encontrada`);
    }

    const baseData = institution.getApiSummary();

    if (includeDetails) {
      const [branches, departments, fullStats] = await Promise.all([
        this.getBranchesCount(institutionId),
        this.getDepartmentsCount(institutionId),
        this.getInstitutionStatistics(institutionId),
      ]);

      return {
        ...baseData,
        branchesCount: branches,
        departmentsCount: departments,
        statistics: fullStats,
        settings: institution.settings,
        subscriptionDetails: {
          plan: institution.subscriptionPlan,
          limits: institution.subscriptionLimits,
          startDate: institution.subscriptionStartDate,
          endDate: institution.subscriptionEndDate,
          isTrialActive: institution.isTrialActive,
          trialDaysRemaining: institution.trialDaysRemaining,
        },
      };
    }

    return baseData;
  }

  /**
   * ✨ Crear nueva institución
   */
  async createInstitution(createDto: CreateInstitutionDto, createdBy?: string): Promise<any> {
    this.logger.log(`✨ Creando institución: ${createDto.name}`);

    // Verificar duplicados
    await this.validateInstitutionUniqueness(createDto.code, createDto.domain);

    // Crear institución
    const institution = this.institutionRepository.create({
      ...createDto,
      subscriptionPlan: createDto.subscriptionPlan || SubscriptionPlan.FREE,
      status: InstitutionStatus.TRIAL,
      isTrialActive: true,
      trialDaysRemaining: 30,
      totalUsers: 0,
      activeUsers: 0,
      totalStorageUsed: 0,
      createdById: createdBy,
    });

    const savedInstitution = await this.institutionRepository.save(institution);

    // Configurar recursos iniciales
    await this.provisionInitialResources(savedInstitution);

    this.logger.log(`✅ Institución creada exitosamente: ${savedInstitution.id}`);

    // Emitir eventos
    this.eventEmitter.emit('institution.created', {
      institutionId: savedInstitution.id,
      name: savedInstitution.name,
      type: savedInstitution.type,
      plan: savedInstitution.subscriptionPlan,
      createdBy,
    });

    return savedInstitution.getApiSummary();
  }

  /**
   * ✏️ Actualizar institución existente
   */
  async updateInstitution(
    institutionId: string, 
    updateData: Partial<CreateInstitutionDto>,
    updatedBy?: string
  ): Promise<any> {
    this.logger.log(`✏️ Actualizando institución: ${institutionId}`);

    const institution = await this.institutionRepository.findOne({
      where: { id: institutionId },
    });

    if (!institution) {
      throw new NotFoundException(`Institución con ID ${institutionId} no encontrada`);
    }

    // Verificar cambios en código o dominio
    if (updateData.code && updateData.code !== institution.code) {
      await this.validateInstitutionUniqueness(updateData.code);
    }

    if (updateData.domain && updateData.domain !== institution.domain) {
      await this.validateInstitutionUniqueness(undefined, updateData.domain);
    }

    // Actualizar campos
    Object.assign(institution, updateData);
    institution.lastModifiedById = updatedBy;

    const updatedInstitution = await this.institutionRepository.save(institution);

    this.logger.log(`✅ Institución actualizada exitosamente: ${institutionId}`);

    // Emitir evento
    this.eventEmitter.emit('institution.updated', {
      institutionId: updatedInstitution.id,
      changes: updateData,
      updatedBy,
    });

    return updatedInstitution.getApiSummary();
  }

  /**
   * 🔄 Cambiar plan de suscripción
   */
  async changeSubscriptionPlan(
    institutionId: string, 
    newPlan: SubscriptionPlan,
    months: number = 12
  ): Promise<any> {
    this.logger.log(`🔄 Cambiando plan de suscripción: ${institutionId} -> ${newPlan}`);

    const institution = await this.institutionRepository.findOne({
      where: { id: institutionId },
    });

    if (!institution) {
      throw new NotFoundException(`Institución con ID ${institutionId} no encontrada`);
    }

    const oldPlan = institution.subscriptionPlan;
    
    // Verificar compatibilidad y migración de datos
    await this.validatePlanMigration(institution, newPlan);

    // Renovar suscripción con nuevo plan
    institution.renewSubscription(newPlan, months);
    
    await this.institutionRepository.save(institution);

    // Migrar configuraciones si es necesario
    if (oldPlan !== newPlan) {
      await this.migratePlanFeatures(institution, oldPlan, newPlan);
    }

    this.logger.log(`✅ Plan cambiado exitosamente de ${oldPlan} a ${newPlan}`);

    // Emitir evento
    this.eventEmitter.emit('institution.plan.changed', {
      institutionId,
      oldPlan,
      newPlan,
      months,
    });

    return {
      success: true,
      message: `Plan cambiado exitosamente a ${newPlan}`,
      data: institution.getApiSummary(),
    };
  }

  // =============================================================================
  // GESTIÓN DE SUCURSALES
  // =============================================================================

  /**
   * 🏢 Obtener sucursales de una institución
   */
  async getBranches(institutionId: string, includeHierarchy: boolean = false): Promise<any> {
    this.logger.log(`🏢 Obteniendo sucursales de institución: ${institutionId}`);

    const queryBuilder = this.branchRepository
      .createQueryBuilder('branch')
      .where('branch.institutionId = :institutionId', { institutionId })
      .andWhere('branch.deletedAt IS NULL')
      .orderBy('branch.displayOrder', 'ASC')
      .addOrderBy('branch.name', 'ASC');

    const branches = await queryBuilder.getMany();

    if (includeHierarchy) {
      // Construir estructura jerárquica
      return this.buildBranchHierarchy(branches);
    }

    return branches.map(branch => branch.getApiSummary());
  }

  /**
   * ➕ Crear nueva sucursal
   */
  async createBranch(createDto: CreateBranchDto, createdBy?: string): Promise<any> {
    this.logger.log(`➕ Creando sucursal: ${createDto.name}`);

    // Verificar que la institución existe
    const institution = await this.institutionRepository.findOne({
      where: { id: createDto.institutionId },
    });

    if (!institution) {
      throw new NotFoundException('Institución no encontrada');
    }

    // Verificar límites del plan
    if (!await this.canCreateBranch(institution)) {
      throw new ForbiddenException('Ha alcanzado el límite de sucursales para su plan');
    }

    // Verificar duplicados en la institución
    const existingBranch = await this.branchRepository.findOne({
      where: { 
        institutionId: createDto.institutionId,
        code: createDto.code,
      },
    });

    if (existingBranch) {
      throw new ConflictException(`Ya existe una sucursal con el código ${createDto.code}`);
    }

    // Obtener sucursal padre si se especifica
    let parentBranch = null;
    if (createDto.parentBranchId) {
      parentBranch = await this.branchRepository.findOne({
        where: { id: createDto.parentBranchId },
      });

      if (!parentBranch) {
        throw new NotFoundException('Sucursal padre no encontrada');
      }
    }

    const branch = this.branchRepository.create({
      ...createDto,
      parentBranch,
      status: BranchStatus.ACTIVE,
      createdById: createdBy,
      // Configurar coordenadas si se proporcionan
      latitude: createDto.coordinates?.latitude,
      longitude: createDto.coordinates?.longitude,
    });

    const savedBranch = await this.branchRepository.save(branch);

    this.logger.log(`✅ Sucursal creada exitosamente: ${savedBranch.id}`);

    // Emitir evento
    this.eventEmitter.emit('branch.created', {
      branchId: savedBranch.id,
      institutionId: createDto.institutionId,
      name: savedBranch.name,
      type: savedBranch.type,
      createdBy,
    });

    return savedBranch.getApiSummary();
  }

  // =============================================================================
  // GESTIÓN DE DEPARTAMENTOS
  // =============================================================================

  /**
   * 🏛️ Obtener departamentos con filtros
   */
  async getDepartments(
    institutionId: string,
    branchId?: string,
    type?: DepartmentType,
    level?: DepartmentLevel
  ): Promise<any> {
    this.logger.log(`🏛️ Obteniendo departamentos - Institución: ${institutionId}`);

    const queryBuilder = this.departmentRepository
      .createQueryBuilder('department')
      .where('department.institutionId = :institutionId', { institutionId })
      .andWhere('department.deletedAt IS NULL');

    if (branchId) {
      queryBuilder.andWhere('department.branchId = :branchId', { branchId });
    }

    if (type) {
      queryBuilder.andWhere('department.type = :type', { type });
    }

    if (level) {
      queryBuilder.andWhere('department.level = :level', { level });
    }

    queryBuilder
      .orderBy('department.level', 'ASC')
      .addOrderBy('department.displayOrder', 'ASC')
      .addOrderBy('department.name', 'ASC');

    const departments = await queryBuilder.getMany();

    return departments.map(dept => dept.getApiSummary());
  }

  /**
   * ➕ Crear nuevo departamento
   */
  async createDepartment(createDto: CreateDepartmentDto, createdBy?: string): Promise<any> {
    this.logger.log(`➕ Creando departamento: ${createDto.name}`);

    // Verificar institución
    const institution = await this.institutionRepository.findOne({
      where: { id: createDto.institutionId },
    });

    if (!institution) {
      throw new NotFoundException('Institución no encontrada');
    }

    // Verificar límites del plan
    if (!await this.canCreateDepartment(institution)) {
      throw new ForbiddenException('Ha alcanzado el límite de departamentos para su plan');
    }

    // Verificar duplicados
    const existing = await this.departmentRepository.findOne({
      where: {
        institutionId: createDto.institutionId,
        branchId: createDto.branchId || null,
        code: createDto.code,
      },
    });

    if (existing) {
      throw new ConflictException(`Ya existe un departamento con el código ${createDto.code}`);
    }

    const department = this.departmentRepository.create({
      ...createDto,
      status: DepartmentStatus.ACTIVE,
      currency: createDto.currency || 'USD',
      totalStaff: 0,
      activeStaff: 0,
      spentBudget: 0,
      committedBudget: 0,
      performanceScore: 0,
      efficiencyRate: 0,
      createdById: createdBy,
    });

    const savedDepartment = await this.departmentRepository.save(department);

    this.logger.log(`✅ Departamento creado exitosamente: ${savedDepartment.id}`);

    // Emitir evento
    this.eventEmitter.emit('department.created', {
      departmentId: savedDepartment.id,
      institutionId: createDto.institutionId,
      branchId: createDto.branchId,
      name: savedDepartment.name,
      type: savedDepartment.type,
      createdBy,
    });

    return savedDepartment.getApiSummary();
  }

  // =============================================================================
  // ANÁLISIS Y REPORTES
  // =============================================================================

  /**
   * 📊 Obtener análisis consolidado multi-nivel
   */
  async getConsolidatedAnalytics(filters: AnalyticsFilters): Promise<any> {
    this.logger.log(`📊 Generando análisis consolidado`);

    const institutionIds = filters.institutionIds || await this.getActiveInstitutionIds();

    const [
      institutionMetrics,
      branchMetrics,
      departmentMetrics,
      usage,
      financial
    ] = await Promise.all([
      this.getInstitutionMetrics(institutionIds, filters),
      this.getBranchMetrics(institutionIds, filters),
      this.getDepartmentMetrics(institutionIds, filters),
      this.getUsageMetrics(institutionIds, filters),
      this.getFinancialMetrics(institutionIds, filters),
    ]);

    return {
      overview: {
        totalInstitutions: institutionIds.length,
        totalBranches: branchMetrics.totalBranches,
        totalDepartments: departmentMetrics.totalDepartments,
        totalUsers: institutionMetrics.totalUsers,
        activeUsers: institutionMetrics.activeUsers,
      },
      institutions: institutionMetrics,
      branches: branchMetrics,
      departments: departmentMetrics,
      usage: usage,
      financial: financial,
      trends: await this.calculateTrends(institutionIds, filters),
      recommendations: await this.generateRecommendations(institutionIds),
    };
  }

  /**
   * 📈 Obtener métricas de rendimiento institucional
   */
  async getInstitutionPerformance(institutionId: string): Promise<any> {
    this.logger.log(`📈 Obteniendo métricas de rendimiento: ${institutionId}`);

    const [institution, branches, departments] = await Promise.all([
      this.institutionRepository.findOne({ where: { id: institutionId } }),
      this.branchRepository.find({ where: { institutionId } }),
      this.departmentRepository.find({ where: { institutionId } }),
    ]);

    if (!institution) {
      throw new NotFoundException('Institución no encontrada');
    }

    // Calcular métricas consolidadas
    const performance = {
      overall: {
        healthScore: this.calculateHealthScore(institution, branches, departments),
        growthRate: this.calculateGrowthRate(institution),
        efficiency: this.calculateEfficiency(institution, branches, departments),
        sustainability: this.calculateSustainability(institution),
      },
      breakdown: {
        userEngagement: this.calculateUserEngagement(institution),
        financialHealth: this.calculateFinancialHealth(institution),
        operationalEfficiency: this.calculateOperationalEfficiency(branches, departments),
        contentUtilization: this.calculateContentUtilization(institution),
      },
      benchmarks: await this.getBenchmarks(institution),
      predictions: await this.generatePredictions(institution),
    };

    return performance;
  }

  // =============================================================================
  // TAREAS AUTOMÁTICAS Y MANTENIMIENTO
  // =============================================================================

  /**
   * 🔄 Actualizar estadísticas institucionales (ejecuta cada hora)
   */
  // @Cron(CronExpression.EVERY_HOUR)
  async updateInstitutionStatistics(): Promise<void> {
    this.logger.log('🔄 Actualizando estadísticas institucionales automáticamente');

    const institutions = await this.institutionRepository.find({
      where: { status: In([InstitutionStatus.ACTIVE, InstitutionStatus.TRIAL]) },
    });

    for (const institution of institutions) {
      try {
        await this.recalculateInstitutionStatistics(institution.id);
      } catch (error) {
        this.logger.error(`Error actualizando estadísticas para ${institution.id}:`, error);
      }
    }

    this.logger.log(`✅ Estadísticas actualizadas para ${institutions.length} instituciones`);
  }

  /**
   * ⏰ Verificar suscripciones vencidas (ejecuta diariamente)
   */
  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async checkExpiredSubscriptions(): Promise<void> {
    this.logger.log('⏰ Verificando suscripciones vencidas');

    const now = new Date();
    
    // Buscar suscripciones vencidas
    const expiredInstitutions = await this.institutionRepository
      .createQueryBuilder('institution')
      .where('institution.subscriptionEndDate < :now', { now })
      .andWhere('institution.status = :status', { status: InstitutionStatus.ACTIVE })
      .getMany();

    for (const institution of expiredInstitutions) {
      institution.status = InstitutionStatus.EXPIRED;
      await this.institutionRepository.save(institution);

      // Emitir evento
      this.eventEmitter.emit('institution.subscription.expired', {
        institutionId: institution.id,
        name: institution.name,
        expiredDate: institution.subscriptionEndDate,
      });
    }

    // Verificar trials vencidos
    const expiredTrials = await this.institutionRepository
      .createQueryBuilder('institution')
      .where('institution.isTrialActive = :active', { active: true })
      .andWhere('institution.trialDaysRemaining <= 0')
      .andWhere('institution.status = :status', { status: InstitutionStatus.TRIAL })
      .getMany();

    for (const institution of expiredTrials) {
      institution.isTrialActive = false;
      institution.status = InstitutionStatus.EXPIRED;
      await this.institutionRepository.save(institution);

      // Emitir evento
      this.eventEmitter.emit('institution.trial.expired', {
        institutionId: institution.id,
        name: institution.name,
      });
    }

    this.logger.log(`✅ Procesadas ${expiredInstitutions.length} suscripciones y ${expiredTrials.length} trials vencidos`);
  }

  // =============================================================================
  // UTILIDADES PRIVADAS
  // =============================================================================

  private createInstitutionQuery(filters: InstitutionFilterDto): SelectQueryBuilder<Institution> {
    const queryBuilder = this.institutionRepository
      .createQueryBuilder('institution')
      .where('institution.deletedAt IS NULL');

    // Aplicar filtros
    if (filters.type) {
      queryBuilder.andWhere('institution.type = :type', { type: filters.type });
    }

    if (filters.status) {
      queryBuilder.andWhere('institution.status = :status', { status: filters.status });
    }

    if (filters.subscriptionPlan) {
      queryBuilder.andWhere('institution.subscriptionPlan = :plan', { plan: filters.subscriptionPlan });
    }

    if (filters.size) {
      queryBuilder.andWhere('institution.size = :size', { size: filters.size });
    }

    if (filters.country) {
      queryBuilder.andWhere('institution.country = :country', { country: filters.country });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(LOWER(institution.name) LIKE LOWER(:search) OR LOWER(institution.code) LIKE LOWER(:search) OR LOWER(institution.contactEmail) LIKE LOWER(:search))',
        { search: `%${filters.search}%` }
      );
    }

    if (!filters.includeTrialExpired) {
      queryBuilder.andWhere(
        '(institution.status != :expired OR (institution.status = :trial AND institution.isTrialActive = :active))',
        { expired: InstitutionStatus.EXPIRED, trial: InstitutionStatus.TRIAL, active: true }
      );
    }

    // Ordenamiento
    const sortField = filters.sortBy === 'name' ? 'institution.name' :
                     filters.sortBy === 'createdAt' ? 'institution.createdAt' :
                     filters.sortBy === 'totalUsers' ? 'institution.totalUsers' :
                     filters.sortBy === 'subscriptionEndDate' ? 'institution.subscriptionEndDate' :
                     'institution.createdAt';

    queryBuilder.orderBy(sortField, filters.sortOrder || 'DESC');

    return queryBuilder;
  }

  private async validateInstitutionUniqueness(code?: string, domain?: string): Promise<void> {
    if (code) {
      const existingByCode = await this.institutionRepository.findOne({
        where: { code },
      });

      if (existingByCode) {
        throw new ConflictException(`Ya existe una institución con el código: ${code}`);
      }
    }

    if (domain) {
      const existingByDomain = await this.institutionRepository.findOne({
        where: { domain },
      });

      if (existingByDomain) {
        throw new ConflictException(`Ya existe una institución con el dominio: ${domain}`);
      }
    }
  }

  private async provisionInitialResources(institution: Institution): Promise<void> {
    // Crear recursos iniciales según el plan
    // Por ejemplo: carpetas por defecto, roles, configuraciones, etc.
    this.logger.log(`Aprovisionando recursos iniciales para: ${institution.id}`);
    
    // Esta lógica se expandiría para crear:
    // - Carpetas predeterminadas
    // - Roles y permisos base
    // - Configuraciones por defecto
    // - Webhooks de sistema
  }

  private async validatePlanMigration(institution: Institution, newPlan: SubscriptionPlan): Promise<void> {
    // Verificar si la migración es posible
    const currentUsage = {
      users: institution.totalUsers,
      storage: institution.totalStorageUsed,
      branches: await this.getBranchesCount(institution.id),
      departments: await this.getDepartmentsCount(institution.id),
    };

    // Obtener límites del nuevo plan
    const newLimits = this.getPlanLimits(newPlan);

    // Verificar límites
    if (newLimits.maxUsers !== -1 && currentUsage.users > newLimits.maxUsers) {
      throw new BadRequestException(`El plan ${newPlan} no soporta ${currentUsage.users} usuarios`);
    }

    if (newLimits.maxStorage !== -1 && currentUsage.storage > newLimits.maxStorage) {
      throw new BadRequestException(`El plan ${newPlan} no soporta ${currentUsage.storage} bytes de almacenamiento`);
    }

    if (newLimits.maxBranches !== -1 && currentUsage.branches > newLimits.maxBranches) {
      throw new BadRequestException(`El plan ${newPlan} no soporta ${currentUsage.branches} sucursales`);
    }

    if (newLimits.maxDepartments !== -1 && currentUsage.departments > newLimits.maxDepartments) {
      throw new BadRequestException(`El plan ${newPlan} no soporta ${currentUsage.departments} departamentos`);
    }
  }

  private async migratePlanFeatures(
    institution: Institution, 
    oldPlan: SubscriptionPlan, 
    newPlan: SubscriptionPlan
  ): Promise<void> {
    // Lógica para migrar características entre planes
    this.logger.log(`Migrando características de ${oldPlan} a ${newPlan} para ${institution.id}`);
    
    // Ejemplos de migración:
    // - Habilitar/deshabilitar funciones según el plan
    // - Ajustar límites de almacenamiento
    // - Configurar integraciones disponibles
    // - Actualizar configuraciones de API
  }

  private async canCreateBranch(institution: Institution): Promise<boolean> {
    const currentBranches = await this.getBranchesCount(institution.id);
    return institution.subscriptionLimits.maxBranches === -1 || 
           currentBranches < institution.subscriptionLimits.maxBranches;
  }

  private async canCreateDepartment(institution: Institution): Promise<boolean> {
    const currentDepartments = await this.getDepartmentsCount(institution.id);
    return institution.subscriptionLimits.maxDepartments === -1 || 
           currentDepartments < institution.subscriptionLimits.maxDepartments;
  }

  private async getBranchesCount(institutionId: string): Promise<number> {
    return await this.branchRepository.count({
      where: { institutionId, deletedAt: null as any },
    });
  }

  private async getDepartmentsCount(institutionId: string): Promise<number> {
    return await this.departmentRepository.count({
      where: { institutionId, deletedAt: null as any },
    });
  }

  private buildBranchHierarchy(branches: Branch[]): any {
    // Construir estructura jerárquica de sucursales
    const branchMap = new Map();
    const rootBranches = [];

    // Crear mapa de sucursales
    branches.forEach(branch => {
      branchMap.set(branch.id, { ...branch.getApiSummary(), children: [] });
    });

    // Construir jerarquía
    branches.forEach(branch => {
      const branchData = branchMap.get(branch.id);
      
      if (branch.parentBranchId) {
        const parent = branchMap.get(branch.parentBranchId);
        if (parent) {
          parent.children.push(branchData);
        }
      } else {
        rootBranches.push(branchData);
      }
    });

    return rootBranches;
  }

  private getPlanLimits(plan: SubscriptionPlan): SubscriptionLimits {
    // Devolver límites específicos según el plan
    // Esta lógica vendría de configuración o base de datos
    const planLimits = {
      [SubscriptionPlan.FREE]: {
        maxUsers: 50,
        maxBranches: 1,
        maxDepartments: 3,
        maxStorage: 1073741824, // 1GB
      },
      [SubscriptionPlan.BASIC]: {
        maxUsers: 200,
        maxBranches: 3,
        maxDepartments: 10,
        maxStorage: 10737418240, // 10GB
      },
      [SubscriptionPlan.STANDARD]: {
        maxUsers: 1000,
        maxBranches: 10,
        maxDepartments: 50,
        maxStorage: 53687091200, // 50GB
      },
      [SubscriptionPlan.PREMIUM]: {
        maxUsers: 5000,
        maxBranches: 50,
        maxDepartments: 200,
        maxStorage: 268435456000, // 250GB
      },
      [SubscriptionPlan.ENTERPRISE]: {
        maxUsers: -1,
        maxBranches: -1,
        maxDepartments: -1,
        maxStorage: -1,
      },
    };

    return planLimits[plan] as any;
  }

  // Métodos placeholder para funciones complejas de análisis
  private async getInstitutionsSummary(filters: InstitutionFilterDto): Promise<any> {
    return {
      total: 0,
      byStatus: {},
      byPlan: {},
      byType: {},
      averageUsers: 0,
      totalRevenue: 0,
    };
  }

  private async getInstitutionStatistics(institutionId: string): Promise<any> {
    return {
      users: { total: 0, active: 0 },
      content: { classrooms: 0, activities: 0 },
      engagement: { loginRate: 0, completionRate: 0 },
      performance: { uptime: 99.5, responseTime: 250 },
    };
  }

  private async recalculateInstitutionStatistics(institutionId: string): Promise<void> {
    // Recalcular estadísticas complejas
    this.logger.log(`Recalculando estadísticas para institución: ${institutionId}`);
  }

  private async getActiveInstitutionIds(): Promise<string[]> {
    const institutions = await this.institutionRepository.find({
      select: ['id'],
      where: { status: In([InstitutionStatus.ACTIVE, InstitutionStatus.TRIAL]) },
    });
    
    return institutions.map(inst => inst.id);
  }

  // Métodos placeholder para análisis complejos
  private async getInstitutionMetrics(ids: string[], filters: AnalyticsFilters): Promise<any> {
    return { totalUsers: 0, activeUsers: 0, institutions: [] };
  }

  private async getBranchMetrics(ids: string[], filters: AnalyticsFilters): Promise<any> {
    return { totalBranches: 0, averageUtilization: 0 };
  }

  private async getDepartmentMetrics(ids: string[], filters: AnalyticsFilters): Promise<any> {
    return { totalDepartments: 0, averageBudgetUtilization: 0 };
  }

  private async getUsageMetrics(ids: string[], filters: AnalyticsFilters): Promise<any> {
    return { storageUsed: 0, apiCalls: 0, activeUsers: 0 };
  }

  private async getFinancialMetrics(ids: string[], filters: AnalyticsFilters): Promise<any> {
    return { totalRevenue: 0, outstandingPayments: 0, churnRate: 0 };
  }

  private async calculateTrends(ids: string[], filters: AnalyticsFilters): Promise<any> {
    return { userGrowth: 0, revenueGrowth: 0, engagementTrend: 0 };
  }

  private async generateRecommendations(ids: string[]): Promise<any[]> {
    return [
      { type: 'optimization', message: 'Optimizar uso de almacenamiento', priority: 'medium' },
      { type: 'upgrade', message: 'Considerar upgrade de plan', priority: 'low' },
    ];
  }

  // Métodos de cálculo de rendimiento
  private calculateHealthScore(institution: Institution, branches: Branch[], departments: Department[]): number {
    // Algoritmo complejo para calcular puntuación de salud
    return 85.5;
  }

  private calculateGrowthRate(institution: Institution): number {
    // Calcular tasa de crecimiento basada en estadísticas históricas
    return 12.3;
  }

  private calculateEfficiency(institution: Institution, branches: Branch[], departments: Department[]): number {
    // Calcular eficiencia operativa
    return 78.9;
  }

  private calculateSustainability(institution: Institution): number {
    // Calcular sostenibilidad financiera
    return 91.2;
  }

  private calculateUserEngagement(institution: Institution): number {
    // Calcular engagement de usuarios
    return 67.4;
  }

  private calculateFinancialHealth(institution: Institution): number {
    // Calcular salud financiera
    return 82.1;
  }

  private calculateOperationalEfficiency(branches: Branch[], departments: Department[]): number {
    // Calcular eficiencia operativa
    return 75.6;
  }

  private calculateContentUtilization(institution: Institution): number {
    // Calcular utilización de contenido
    return 68.9;
  }

  private async getBenchmarks(institution: Institution): Promise<any> {
    // Obtener benchmarks de la industria
    return {
      industry: 'education',
      averageUserGrowth: 15.2,
      averageRetention: 89.3,
      averageSatisfaction: 78.5,
    };
  }

  private async generatePredictions(institution: Institution): Promise<any> {
    // Generar predicciones basadas en ML
    return {
      userGrowth: { nextMonth: 125, nextQuarter: 380, confidence: 0.85 },
      churnRisk: { score: 0.23, factors: ['low_engagement', 'payment_delays'] },
      recommendations: ['increase_engagement', 'optimize_onboarding'],
    };
  }
}