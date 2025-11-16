/**
 * 🏛️ ENTIDAD DEPARTAMENTO - GESTIÓN ORGANIZACIONAL EDUCATIVA
 * 
 * Sistema de gestión de departamentos académicos y administrativos dentro de 
 * instituciones educativas. Permite organización funcional por áreas de conocimiento,
 * especialidades académicas y divisiones administrativas.
 * 
 * CARACTERÍSTICAS PRINCIPALES:
 * - Organización por áreas académicas y administrativas
 * - Gestión de personal especializado por departamento
 * - Presupuestos y recursos específicos
 * - Objetivos y métricas departamentales
 * - Colaboración interdepartamental
 * - Análisis de rendimiento por área
 * 
 * CASOS DE USO:
 * - Facultades universitarias (Ingeniería, Medicina, Derecho)
 * - Departamentos de colegios (Primaria, Secundaria, Bachillerato)
 * - Áreas administrativas (Finanzas, RRHH, IT, Biblioteca)
 * - Centros de investigación y desarrollo
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, IsBoolean, IsObject, IsArray, IsNumber, Min, Max } from 'class-validator';
import { Institution } from './institution.entity';
import { Branch } from './branch.entity';

// =============================================================================
// ENUMS Y TIPOS
// =============================================================================

export enum DepartmentType {
  ACADEMIC = 'academic',
  ADMINISTRATIVE = 'administrative',
  RESEARCH = 'research',
  SUPPORT = 'support',
  TECHNICAL = 'technical',
  STUDENT_SERVICES = 'student_services',
  LIBRARY = 'library',
  IT = 'it',
  FINANCE = 'finance',
  HR = 'hr',
  MARKETING = 'marketing',
  MAINTENANCE = 'maintenance',
  SECURITY = 'security',
  OTHER = 'other',
}

export enum DepartmentStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  UNDER_REVIEW = 'under_review',
  RESTRUCTURING = 'restructuring',
  MERGING = 'merging',
  DISSOLVING = 'dissolving',
}

export enum DepartmentLevel {
  FACULTY = 'faculty',          // Nivel superior (Facultad)
  SCHOOL = 'school',            // Escuela o Instituto
  DEPARTMENT = 'department',    // Departamento
  DIVISION = 'division',        // División
  UNIT = 'unit',               // Unidad
  SECTION = 'section',         // Sección
  OFFICE = 'office',           // Oficina
}

export enum BudgetStatus {
  APPROVED = 'approved',
  PENDING = 'pending',
  REJECTED = 'rejected',
  UNDER_REVIEW = 'under_review',
  EXHAUSTED = 'exhausted',
  FROZEN = 'frozen',
}

// Interfaces para configuraciones complejas
export interface DepartmentSettings {
  // Configuraciones académicas (para departamentos académicos)
  academic?: {
    subjects: Array<{
      id: string;
      name: string;
      code: string;
      credits: number;
      level: string;
      isCore: boolean;
      prerequisites: string[];
    }>;
    researchAreas: Array<{
      id: string;
      name: string;
      description: string;
      isActive: boolean;
      leadResearcher?: string;
    }>;
    degrees: Array<{
      id: string;
      name: string;
      type: 'undergraduate' | 'graduate' | 'doctorate';
      duration: number;
      totalCredits: number;
      isActive: boolean;
    }>;
    accreditations: Array<{
      body: string;
      certificate: string;
      validUntil: Date;
      status: 'active' | 'expired' | 'pending';
    }>;
  };

  // Configuraciones operativas
  operations: {
    workingHours: {
      monday: { start: string; end: string; closed?: boolean };
      tuesday: { start: string; end: string; closed?: boolean };
      wednesday: { start: string; end: string; closed?: boolean };
      thursday: { start: string; end: string; closed?: boolean };
      friday: { start: string; end: string; closed?: boolean };
      saturday: { start: string; end: string; closed?: boolean };
      sunday: { start: string; end: string; closed?: boolean };
    };
    meetingSchedule: {
      regular: Array<{
        type: 'weekly' | 'biweekly' | 'monthly';
        day: string;
        time: string;
        duration: number; // minutes
        location?: string;
      }>;
      special: Array<{
        name: string;
        date: Date;
        time: string;
        duration: number;
        location?: string;
        mandatory: boolean;
      }>;
    };
    communicationChannels: {
      email: string;
      phone?: string;
      chat?: string;
      forum?: string;
      announcements: boolean;
    };
  };

  // Configuraciones de recursos
  resources: {
    facilities: Array<{
      id: string;
      name: string;
      type: 'office' | 'classroom' | 'lab' | 'conference_room' | 'storage' | 'other';
      capacity?: number;
      equipment: string[];
      bookable: boolean;
      location: string;
    }>;
    equipment: Array<{
      id: string;
      name: string;
      type: string;
      model?: string;
      serialNumber?: string;
      purchaseDate?: Date;
      warrantyUntil?: Date;
      status: 'active' | 'maintenance' | 'broken' | 'retired';
      assignedTo?: string;
    }>;
    software: Array<{
      name: string;
      version: string;
      licenses: number;
      expirationDate?: Date;
      vendor: string;
      usedLicenses: number;
    }>;
  };

  // Configuraciones de personal
  staffing: {
    positions: Array<{
      id: string;
      title: string;
      type: 'full_time' | 'part_time' | 'contract' | 'volunteer';
      level: 'entry' | 'mid' | 'senior' | 'lead' | 'director';
      responsibilities: string[];
      qualifications: string[];
      isOpen: boolean;
      salary?: {
        min: number;
        max: number;
        currency: string;
      };
    }>;
    hierarchy: Array<{
      position: string;
      reportsTo?: string;
      manages: string[];
    }>;
    workload: {
      maxHoursPerWeek: number;
      overtimePolicy: string;
      flexibleSchedule: boolean;
      remoteWork: boolean;
    };
  };

  // Configuraciones de calidad y procesos
  quality: {
    kpis: Array<{
      name: string;
      description: string;
      target: number;
      unit: string;
      frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
      current?: number;
    }>;
    processes: Array<{
      name: string;
      description: string;
      steps: Array<{
        order: number;
        description: string;
        responsible: string;
        estimatedTime: number; // minutes
      }>;
      frequency: string;
      lastReview?: Date;
    }>;
    certifications: Array<{
      name: string;
      body: string;
      validUntil: Date;
      scope: string;
    }>;
  };
}

export interface DepartmentBudget {
  // Presupuesto anual
  annual: {
    year: number;
    totalAllocated: number;
    totalSpent: number;
    totalCommitted: number;
    status: BudgetStatus;
    approvedBy?: string;
    approvedDate?: Date;
  };

  // Categorías de gastos
  categories: Array<{
    name: string;
    allocated: number;
    spent: number;
    committed: number;
    percentage: number;
    subcategories?: Array<{
      name: string;
      allocated: number;
      spent: number;
    }>;
  }>;

  // Proyecciones y análisis
  projections: {
    quarterlyBreakdown: Array<{
      quarter: number;
      planned: number;
      actual?: number;
      variance?: number;
    }>;
    riskAssessment: {
      overbudgetRisk: 'low' | 'medium' | 'high';
      seasonalFactors: string[];
      contingencyFund: number;
    };
  };

  // Historial de cambios
  revisions: Array<{
    date: Date;
    reason: string;
    changedBy: string;
    changes: Array<{
      category: string;
      oldAmount: number;
      newAmount: number;
      justification: string;
    }>;
  }>;
}

export interface DepartmentStatistics {
  // Estadísticas de personal
  personnel: {
    total: number;
    active: number;
    fullTime: number;
    partTime: number;
    contract: number;
    volunteers: number;
    byLevel: {
      entry: number;
      mid: number;
      senior: number;
      lead: number;
      director: number;
    };
    turnoverRate: number;
    satisfactionScore?: number;
  };

  // Estadísticas académicas (para departamentos académicos)
  academic?: {
    students: {
      enrolled: number;
      active: number;
      graduated: number;
      dropout: number;
      retention: number;
    };
    courses: {
      offered: number;
      active: number;
      completed: number;
      averageEnrollment: number;
    };
    research: {
      activeProjects: number;
      publications: number;
      grants: number;
      totalFunding: number;
    };
    performance: {
      averageGrade: number;
      passRate: number;
      satisfactionScore: number;
      employmentRate?: number;
    };
  };

  // Estadísticas operativas
  operations: {
    meetings: {
      scheduled: number;
      completed: number;
      attendance: number;
      averageDuration: number;
    };
    projects: {
      active: number;
      completed: number;
      overdue: number;
      onTime: number;
      budget: {
        total: number;
        spent: number;
        remaining: number;
      };
    };
    efficiency: {
      taskCompletionRate: number;
      responseTime: number; // hours
      customerSatisfaction?: number;
      processCompliance: number;
    };
  };

  // Estadísticas financieras
  financial: {
    budget: {
      utilization: number;
      variance: number;
      forecast: number;
    };
    revenue?: {
      total: number;
      bySource: Record<string, number>;
      growth: number;
    };
    costPerOutput: {
      perStudent?: number;
      perProject?: number;
      perService?: number;
    };
    roi?: number;
  };

  // Estadísticas de recursos
  resources: {
    facilities: {
      total: number;
      occupied: number;
      utilization: number;
      maintenance: number;
    };
    equipment: {
      total: number;
      active: number;
      maintenance: number;
      depreciation: number;
    };
    software: {
      licenses: number;
      usage: number;
      compliance: number;
    };
  };
}

// =============================================================================
// ENTIDAD PRINCIPAL
// =============================================================================

@Entity('departments')
@Index(['institutionId', 'code'], { unique: true })
@Index(['branchId', 'code'])
@Index(['status', 'type'])
@Index(['level', 'type'])
export class Department {
  @ApiProperty({ description: 'ID único del departamento' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // =============================================================================
  // RELACIONES
  // =============================================================================

  @ApiProperty({ description: 'ID de la institución' })
  @Column()
  @Index()
  institutionId: string;

  @ManyToOne(() => Institution, { nullable: false })
  @JoinColumn({ name: 'institutionId' })
  institution: Institution;

  @ApiProperty({ description: 'ID de la sucursal (opcional)' })
  @Column({ nullable: true })
  @Index()
  branchId?: string;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branchId' })
  branch?: Branch;

  // Auto-referencia para departamentos padre
  @ApiProperty({ description: 'ID del departamento padre' })
  @Column({ nullable: true })
  @Index()
  parentDepartmentId?: string;

  @ManyToOne(() => Department, department => department.childDepartments, { nullable: true })
  @JoinColumn({ name: 'parentDepartmentId' })
  parentDepartment?: Department;

  @OneToMany(() => Department, department => department.parentDepartment)
  childDepartments: Department[];

  // =============================================================================
  // INFORMACIÓN BÁSICA
  // =============================================================================

  @ApiProperty({ description: 'Código único del departamento' })
  @Column({ length: 50 })
  @IsString()
  @Index()
  code: string;

  @ApiProperty({ description: 'Nombre completo del departamento' })
  @Column({ length: 200 })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Nombre corto o siglas' })
  @Column({ length: 50, nullable: true })
  @IsString()
  @IsOptional()
  shortName?: string;

  @ApiProperty({ description: 'Descripción del departamento' })
  @Column({ type: 'text', nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Tipo de departamento', enum: DepartmentType })
  @Column({ type: 'enum', enum: DepartmentType })
  @IsEnum(DepartmentType)
  @Index()
  type: DepartmentType;

  @ApiProperty({ description: 'Nivel jerárquico', enum: DepartmentLevel })
  @Column({ type: 'enum', enum: DepartmentLevel, default: DepartmentLevel.DEPARTMENT })
  @IsEnum(DepartmentLevel)
  @Index()
  level: DepartmentLevel;

  @ApiProperty({ description: 'Estado del departamento', enum: DepartmentStatus })
  @Column({ type: 'enum', enum: DepartmentStatus, default: DepartmentStatus.ACTIVE })
  @IsEnum(DepartmentStatus)
  @Index()
  status: DepartmentStatus;

  // =============================================================================
  // INFORMACIÓN DE CONTACTO
  // =============================================================================

  @ApiProperty({ description: 'Email principal del departamento' })
  @Column({ length: 100, nullable: true })
  @IsString()
  @IsOptional()
  contactEmail?: string;

  @ApiProperty({ description: 'Teléfono principal' })
  @Column({ length: 20, nullable: true })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiProperty({ description: 'Extensión telefónica interna' })
  @Column({ length: 10, nullable: true })
  @IsString()
  @IsOptional()
  extension?: string;

  @ApiProperty({ description: 'Ubicación física del departamento' })
  @Column({ length: 200, nullable: true })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ description: 'Número de oficina o edificio' })
  @Column({ length: 50, nullable: true })
  @IsString()
  @IsOptional()
  officeNumber?: string;

  // =============================================================================
  // PERSONAL Y LIDERAZGO
  // =============================================================================

  @ApiProperty({ description: 'ID del jefe/director del departamento' })
  @Column({ nullable: true })
  @IsString()
  @IsOptional()
  headId?: string;

  @ApiProperty({ description: 'ID del subdirector o coordinador' })
  @Column({ nullable: true })
  @IsString()
  @IsOptional()
  coordinatorId?: string;

  @ApiProperty({ description: 'ID del asistente administrativo' })
  @Column({ nullable: true })
  @IsString()
  @IsOptional()
  assistantId?: string;

  @ApiProperty({ description: 'IDs del personal asignado al departamento' })
  @Column({ type: 'json', default: '[]' })
  @IsArray()
  staffIds: string[];

  @ApiProperty({ description: 'Número total de personal' })
  @Column({ default: 0 })
  @IsNumber()
  @Min(0)
  totalStaff: number;

  @ApiProperty({ description: 'Número de personal activo' })
  @Column({ default: 0 })
  @IsNumber()
  @Min(0)
  activeStaff: number;

  // =============================================================================
  // PRESUPUESTO Y FINANZAS
  // =============================================================================

  @ApiProperty({ description: 'Presupuesto detallado del departamento' })
  @Column({ type: 'json' })
  @IsObject()
  budget: DepartmentBudget;

  @ApiProperty({ description: 'Presupuesto anual asignado' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  @IsNumber()
  @Min(0)
  annualBudget: number;

  @ApiProperty({ description: 'Presupuesto gastado en el año actual' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  @IsNumber()
  @Min(0)
  spentBudget: number;

  @ApiProperty({ description: 'Presupuesto comprometido (reservado)' })
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  @IsNumber()
  @Min(0)
  committedBudget: number;

  @ApiProperty({ description: 'Moneda utilizada para el presupuesto' })
  @Column({ length: 3, default: 'USD' })
  @IsString()
  currency: string;

  // =============================================================================
  // CONFIGURACIONES Y OBJETIVOS
  // =============================================================================

  @ApiProperty({ description: 'Configuraciones específicas del departamento' })
  @Column({ type: 'json' })
  @IsObject()
  settings: DepartmentSettings;

  @ApiProperty({ description: 'Misión del departamento' })
  @Column({ type: 'text', nullable: true })
  @IsString()
  @IsOptional()
  mission?: string;

  @ApiProperty({ description: 'Visión del departamento' })
  @Column({ type: 'text', nullable: true })
  @IsString()
  @IsOptional()
  vision?: string;

  @ApiProperty({ description: 'Valores fundamentales' })
  @Column({ type: 'json', default: '[]' })
  @IsArray()
  values: string[];

  @ApiProperty({ description: 'Objetivos estratégicos del año' })
  @Column({ type: 'json', default: '[]' })
  @IsArray()
  objectives: Array<{
    id: string;
    title: string;
    description: string;
    targetDate: Date;
    status: 'planning' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
    progress: number; // 0-100
    responsible: string;
    kpis: Array<{
      name: string;
      target: number;
      current: number;
      unit: string;
    }>;
  }>;

  // =============================================================================
  // ESTADÍSTICAS Y MÉTRICAS
  // =============================================================================

  @ApiProperty({ description: 'Estadísticas consolidadas del departamento' })
  @Column({ type: 'json' })
  @IsObject()
  statistics: DepartmentStatistics;

  @ApiProperty({ description: 'Fecha de última actualización de estadísticas' })
  @Column({ type: 'timestamp', nullable: true })
  statisticsLastUpdated?: Date;

  @ApiProperty({ description: 'Puntuación de rendimiento general (0-100)' })
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  performanceScore: number;

  @ApiProperty({ description: 'Puntuación de satisfacción del personal (0-100)' })
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  staffSatisfactionScore?: number;

  @ApiProperty({ description: 'Tasa de eficiencia en procesos (0-100)' })
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  @IsNumber()
  @Min(0)
  @Max(100)
  efficiencyRate: number;

  // =============================================================================
  // INFORMACIÓN ADICIONAL
  // =============================================================================

  @ApiProperty({ description: 'Metadatos adicionales flexibles' })
  @Column({ type: 'json', default: '{}' })
  @IsObject()
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Tags para categorización y búsqueda' })
  @Column({ type: 'json', default: '[]' })
  @IsArray()
  tags: string[];

  @ApiProperty({ description: 'Color distintivo del departamento (hex)' })
  @Column({ length: 7, nullable: true })
  @IsString()
  @IsOptional()
  color?: string;

  @ApiProperty({ description: 'Icono representativo del departamento' })
  @Column({ length: 50, nullable: true })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiProperty({ description: 'Si el departamento es visible públicamente' })
  @Column({ default: true })
  @IsBoolean()
  isPublic: boolean;

  @ApiProperty({ description: 'Si requiere autorización especial para acceso' })
  @Column({ default: false })
  @IsBoolean()
  requiresAuthorization: boolean;

  @ApiProperty({ description: 'Orden de visualización en listados' })
  @Column({ default: 0 })
  @IsNumber()
  displayOrder: number;

  // =============================================================================
  // CAMPOS DE AUDITORÍA
  // =============================================================================

  @ApiProperty({ description: 'ID del usuario que creó el departamento' })
  @Column({ nullable: true })
  @IsString()
  @IsOptional()
  createdById?: string;

  @ApiProperty({ description: 'ID del último usuario que modificó el departamento' })
  @Column({ nullable: true })
  @IsString()
  @IsOptional()
  lastModifiedById?: string;

  @ApiProperty({ description: 'Fecha de creación' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ description: 'Fecha de última actualización' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ description: 'Fecha de eliminación (soft delete)' })
  @Column({ type: 'timestamp', nullable: true })
  deletedAt?: Date;

  // =============================================================================
  // HOOKS DE CICLO DE VIDA
  // =============================================================================

  @BeforeInsert()
  beforeInsert() {
    this.initializeDefaultSettings();
    this.initializeDefaultBudget();
    this.initializeStatistics();
  }

  @BeforeUpdate()
  beforeUpdate() {
    this.updatePerformanceMetrics();
    this.validateBudget();
  }

  // =============================================================================
  // MÉTODOS PRIVADOS DE INICIALIZACIÓN
  // =============================================================================

  /**
   * ⚙️ Inicializar configuraciones por defecto
   */
  private initializeDefaultSettings(): void {
    if (!this.settings) {
      this.settings = {
        operations: {
          workingHours: {
            monday: { start: '08:00', end: '17:00' },
            tuesday: { start: '08:00', end: '17:00' },
            wednesday: { start: '08:00', end: '17:00' },
            thursday: { start: '08:00', end: '17:00' },
            friday: { start: '08:00', end: '17:00' },
            saturday: { start: '09:00', end: '13:00' },
            sunday: { closed: true, start: '00:00', end: '00:00' },
          },
          meetingSchedule: {
            regular: [],
            special: [],
          },
          communicationChannels: {
            email: this.contactEmail || '',
            announcements: true,
          },
        },
        resources: {
          facilities: [],
          equipment: [],
          software: [],
        },
        staffing: {
          positions: [],
          hierarchy: [],
          workload: {
            maxHoursPerWeek: 40,
            overtimePolicy: 'pre-approved',
            flexibleSchedule: false,
            remoteWork: false,
          },
        },
        quality: {
          kpis: [],
          processes: [],
          certifications: [],
        },
      };

      // Configuraciones específicas por tipo de departamento
      if (this.type === DepartmentType.ACADEMIC) {
        this.settings.academic = {
          subjects: [],
          researchAreas: [],
          degrees: [],
          accreditations: [],
        };
      }
    }
  }

  /**
   * 💰 Inicializar presupuesto por defecto
   */
  private initializeDefaultBudget(): void {
    if (!this.budget) {
      const currentYear = new Date().getFullYear();
      
      this.budget = {
        annual: {
          year: currentYear,
          totalAllocated: this.annualBudget || 0,
          totalSpent: 0,
          totalCommitted: 0,
          status: BudgetStatus.PENDING,
        },
        categories: [
          { name: 'Personal', allocated: 0, spent: 0, committed: 0, percentage: 70 },
          { name: 'Equipamiento', allocated: 0, spent: 0, committed: 0, percentage: 15 },
          { name: 'Suministros', allocated: 0, spent: 0, committed: 0, percentage: 10 },
          { name: 'Servicios', allocated: 0, spent: 0, committed: 0, percentage: 5 },
        ],
        projections: {
          quarterlyBreakdown: [
            { quarter: 1, planned: 0 },
            { quarter: 2, planned: 0 },
            { quarter: 3, planned: 0 },
            { quarter: 4, planned: 0 },
          ],
          riskAssessment: {
            overbudgetRisk: 'low',
            seasonalFactors: [],
            contingencyFund: 0,
          },
        },
        revisions: [],
      };
    }
  }

  /**
   * 📊 Inicializar estadísticas
   */
  private initializeStatistics(): void {
    if (!this.statistics) {
      this.statistics = {
        personnel: {
          total: 0,
          active: 0,
          fullTime: 0,
          partTime: 0,
          contract: 0,
          volunteers: 0,
          byLevel: {
            entry: 0,
            mid: 0,
            senior: 0,
            lead: 0,
            director: 0,
          },
          turnoverRate: 0,
        },
        operations: {
          meetings: {
            scheduled: 0,
            completed: 0,
            attendance: 0,
            averageDuration: 60,
          },
          projects: {
            active: 0,
            completed: 0,
            overdue: 0,
            onTime: 0,
            budget: {
              total: 0,
              spent: 0,
              remaining: 0,
            },
          },
          efficiency: {
            taskCompletionRate: 0,
            responseTime: 24,
            processCompliance: 0,
          },
        },
        financial: {
          budget: {
            utilization: 0,
            variance: 0,
            forecast: 0,
          },
          costPerOutput: {},
        },
        resources: {
          facilities: {
            total: 0,
            occupied: 0,
            utilization: 0,
            maintenance: 0,
          },
          equipment: {
            total: 0,
            active: 0,
            maintenance: 0,
            depreciation: 0,
          },
          software: {
            licenses: 0,
            usage: 0,
            compliance: 100,
          },
        },
      };

      // Estadísticas específicas para departamentos académicos
      if (this.type === DepartmentType.ACADEMIC) {
        this.statistics.academic = {
          students: {
            enrolled: 0,
            active: 0,
            graduated: 0,
            dropout: 0,
            retention: 0,
          },
          courses: {
            offered: 0,
            active: 0,
            completed: 0,
            averageEnrollment: 0,
          },
          research: {
            activeProjects: 0,
            publications: 0,
            grants: 0,
            totalFunding: 0,
          },
          performance: {
            averageGrade: 0,
            passRate: 0,
            satisfactionScore: 0,
          },
        };
      }
    }
  }

  /**
   * 📈 Actualizar métricas de rendimiento
   */
  private updatePerformanceMetrics(): void {
    // Calcular puntuación de rendimiento basada en múltiples factores
    let score = 0;
    let factors = 0;

    // Factor: Utilización del presupuesto (peso: 20%)
    if (this.annualBudget > 0) {
      const budgetUtilization = (this.spentBudget / this.annualBudget) * 100;
      const optimalRange = budgetUtilization >= 80 && budgetUtilization <= 95;
      score += optimalRange ? 20 : (budgetUtilization > 95 ? 10 : budgetUtilization * 0.2);
      factors += 20;
    }

    // Factor: Eficiencia operativa (peso: 30%)
    score += this.efficiencyRate * 0.3;
    factors += 30;

    // Factor: Satisfacción del personal (peso: 25%)
    if (this.staffSatisfactionScore) {
      score += this.staffSatisfactionScore * 0.25;
      factors += 25;
    }

    // Factor: Cumplimiento de objetivos (peso: 25%)
    const completedObjectives = this.objectives.filter(obj => obj.status === 'completed').length;
    const totalObjectives = this.objectives.length;
    if (totalObjectives > 0) {
      const objectiveScore = (completedObjectives / totalObjectives) * 100;
      score += objectiveScore * 0.25;
      factors += 25;
    }

    this.performanceScore = factors > 0 ? Math.round(score * 100 / factors) : 0;
  }

  /**
   * ✅ Validar presupuesto
   */
  private validateBudget(): void {
    // Verificar que el gasto no exceda el presupuesto
    if (this.spentBudget > this.annualBudget) {
      console.warn(`Departamento ${this.code} excede el presupuesto: ${this.spentBudget}/${this.annualBudget}`);
    }

    // Actualizar estado del presupuesto
    const utilizationRate = this.annualBudget > 0 ? (this.spentBudget / this.annualBudget) * 100 : 0;
    
    if (utilizationRate >= 100) {
      this.budget.annual.status = BudgetStatus.EXHAUSTED;
    } else if (utilizationRate >= 95) {
      this.budget.annual.status = BudgetStatus.APPROVED; // Casi agotado pero aún válido
    }
  }

  // =============================================================================
  // MÉTODOS PÚBLICOS DE NEGOCIO
  // =============================================================================

  /**
   * ✅ Verificar si el departamento está activo
   */
  isActive(): boolean {
    return this.status === DepartmentStatus.ACTIVE;
  }

  /**
   * 👥 Verificar si puede agregar más personal
   */
  canAddStaff(count: number = 1): boolean {
    // Verificar límites basados en presupuesto y configuraciones
    const maxStaff = this.settings.staffing.positions.length;
    return maxStaff === 0 || (this.totalStaff + count) <= maxStaff;
  }

  /**
   * 💰 Verificar disponibilidad presupuestaria
   */
  canSpend(amount: number, category?: string): boolean {
    const available = this.annualBudget - this.spentBudget - this.committedBudget;
    
    if (!category) {
      return available >= amount;
    }

    // Verificar por categoría específica
    const categoryBudget = this.budget.categories.find(c => c.name === category);
    if (categoryBudget) {
      const categoryAvailable = categoryBudget.allocated - categoryBudget.spent - categoryBudget.committed;
      return categoryAvailable >= amount;
    }

    return available >= amount;
  }

  /**
   * 📊 Obtener utilización presupuestaria
   */
  getBudgetUtilization(): number {
    return this.annualBudget > 0 ? (this.spentBudget / this.annualBudget) * 100 : 0;
  }

  /**
   * 🎯 Agregar nuevo objetivo
   */
  addObjective(objective: {
    title: string;
    description: string;
    targetDate: Date;
    responsible: string;
    kpis?: Array<{ name: string; target: number; unit: string }>;
  }): void {
    const newObjective = {
      id: Date.now().toString(), // En producción usar UUID
      ...objective,
      status: 'planning' as const,
      progress: 0,
      kpis: objective.kpis?.map(kpi => ({ ...kpi, current: 0 })) || [],
    };

    this.objectives.push(newObjective);
  }

  /**
   * ✏️ Actualizar progreso de objetivo
   */
  updateObjectiveProgress(objectiveId: string, progress: number, status?: string): boolean {
    const objective = this.objectives.find(obj => obj.id === objectiveId);
    if (objective) {
      objective.progress = Math.max(0, Math.min(100, progress));
      if (status) {
        objective.status = status as any;
      }
      return true;
    }
    return false;
  }

  /**
   * 🏗️ Agregar instalación
   */
  addFacility(facility: {
    name: string;
    type: 'office' | 'classroom' | 'lab' | 'conference_room' | 'storage' | 'other';
    capacity?: number;
    equipment?: string[];
    location: string;
  }): void {
    const newFacility = {
      id: Date.now().toString(), // En producción usar UUID
      ...facility,
      equipment: facility.equipment || [],
      bookable: facility.type === 'conference_room' || facility.type === 'classroom',
    };

    this.settings.resources.facilities.push(newFacility);
  }

  /**
   * 🖥️ Agregar equipamiento
   */
  addEquipment(equipment: {
    name: string;
    type: string;
    model?: string;
    serialNumber?: string;
    purchaseDate?: Date;
    assignedTo?: string;
  }): void {
    const newEquipment = {
      id: Date.now().toString(), // En producción usar UUID
      ...equipment,
      status: 'active' as const,
    };

    this.settings.resources.equipment.push(newEquipment);
  }

  /**
   * 📋 Agregar proceso de calidad
   */
  addQualityProcess(process: {
    name: string;
    description: string;
    steps: Array<{
      description: string;
      responsible: string;
      estimatedTime: number;
    }>;
    frequency: string;
  }): void {
    const newProcess = {
      ...process,
      steps: process.steps.map((step, index) => ({
        order: index + 1,
        ...step,
      })),
    };

    this.settings.quality.processes.push(newProcess);
  }

  /**
   * 📊 Actualizar estadísticas del departamento
   */
  updateStatistics(updates: Partial<DepartmentStatistics>): void {
    this.statistics = { ...this.statistics, ...updates };
    this.statisticsLastUpdated = new Date();
  }

  /**
   * 💸 Registrar gasto
   */
  recordExpense(amount: number, category: string, description: string): boolean {
    if (!this.canSpend(amount, category)) {
      return false;
    }

    this.spentBudget += amount;
    this.budget.annual.totalSpent += amount;

    // Actualizar categoría específica
    const categoryBudget = this.budget.categories.find(c => c.name === category);
    if (categoryBudget) {
      categoryBudget.spent += amount;
    }

    return true;
  }

  /**
   * 🔒 Comprometer presupuesto
   */
  commitBudget(amount: number, category: string, description: string): boolean {
    if (!this.canSpend(amount, category)) {
      return false;
    }

    this.committedBudget += amount;
    this.budget.annual.totalCommitted += amount;

    // Actualizar categoría específica
    const categoryBudget = this.budget.categories.find(c => c.name === category);
    if (categoryBudget) {
      categoryBudget.committed += amount;
    }

    return true;
  }

  /**
   * 📈 Obtener resumen de rendimiento
   */
  getPerformanceSummary(): any {
    return {
      overallScore: this.performanceScore,
      budgetUtilization: this.getBudgetUtilization(),
      staffSatisfaction: this.staffSatisfactionScore,
      efficiency: this.efficiencyRate,
      objectivesProgress: {
        total: this.objectives.length,
        completed: this.objectives.filter(obj => obj.status === 'completed').length,
        inProgress: this.objectives.filter(obj => obj.status === 'in_progress').length,
        delayed: this.objectives.filter(obj => obj.status === 'delayed').length,
      },
      keyMetrics: this.settings.quality.kpis.map(kpi => ({
        name: kpi.name,
        current: kpi.current || 0,
        target: kpi.target,
        achievement: kpi.current && kpi.target ? (kpi.current / kpi.target) * 100 : 0,
      })),
    };
  }

  /**
   * 📄 Obtener resumen para API
   */
  getApiSummary(): any {
    return {
      id: this.id,
      institutionId: this.institutionId,
      branchId: this.branchId,
      code: this.code,
      name: this.name,
      shortName: this.shortName,
      type: this.type,
      level: this.level,
      status: this.status,
      contactEmail: this.contactEmail,
      contactPhone: this.contactPhone,
      location: this.location,
      headId: this.headId,
      totalStaff: this.totalStaff,
      activeStaff: this.activeStaff,
      annualBudget: this.annualBudget,
      budgetUtilization: this.getBudgetUtilization(),
      performanceScore: this.performanceScore,
      isActive: this.isActive(),
      facilities: this.settings.resources.facilities.length,
      equipment: this.settings.resources.equipment.length,
      objectives: {
        total: this.objectives.length,
        completed: this.objectives.filter(obj => obj.status === 'completed').length,
      },
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * 📊 Obtener resumen detallado para dashboard
   */
  getDashboardSummary(): any {
    return {
      ...this.getApiSummary(),
      statistics: this.statistics,
      performance: this.getPerformanceSummary(),
      budget: {
        annual: this.budget.annual,
        categories: this.budget.categories,
        utilization: this.getBudgetUtilization(),
      },
      objectives: this.objectives,
      facilities: this.settings.resources.facilities,
      equipment: this.settings.resources.equipment,
      kpis: this.settings.quality.kpis,
    };
  }
}