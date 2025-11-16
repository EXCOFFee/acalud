/**
 * 🏛️ ENTIDAD INSTITUCIÓN - GESTIÓN MULTI-TENANT EDUCATIVA
 * 
 * Sistema completo de gestión institucional con soporte multi-tenant para
 * organizaciones educativas de cualquier tamaño y complejidad.
 * 
 * CARACTERÍSTICAS PRINCIPALES:
 * - Arquitectura multi-tenant robusta
 * - Gestión jerárquica de sucursales y departamentos
 * - Sistema de configuraciones institucionales
 * - Control de suscripciones y límites por plan
 * - Integración con todos los módulos del sistema
 * - Análisis y reportes institucionales
 * 
 * CASOS DE USO:
 * - Universidades con múltiples facultades
 * - Colegios con múltiples sedes
 * - Academias con franquicias
 * - Organizaciones educativas distribuidas
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
  OneToMany,
  Index,
  BeforeInsert,
  BeforeUpdate,
  AfterLoad,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional, IsBoolean, IsObject, IsArray, IsNumber, Min, Max } from 'class-validator';
import { randomBytes, randomUUID } from 'crypto';

// =============================================================================
// ENUMS Y TIPOS
// =============================================================================

export enum InstitutionType {
  UNIVERSITY = 'university',
  COLLEGE = 'college',
  SCHOOL = 'school',
  ACADEMY = 'academy',
  TRAINING_CENTER = 'training_center',
  CORPORATE = 'corporate',
  GOVERNMENT = 'government',
  NGO = 'ngo',
  OTHER = 'other',
}

export enum InstitutionStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  PENDING_ACTIVATION = 'pending_activation',
}

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  STANDARD = 'standard',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
  CUSTOM = 'custom',
}

export enum InstitutionSize {
  SMALL = 'small',          // < 100 usuarios
  MEDIUM = 'medium',        // 100-1000 usuarios
  LARGE = 'large',          // 1000-10000 usuarios
  ENTERPRISE = 'enterprise', // > 10000 usuarios
}

// Interfaces para configuraciones complejas
export interface InstitutionSettings {
  // Configuraciones académicas
  academic: {
    gradingSystem: 'numeric' | 'letter' | 'pass_fail' | 'custom';
    maxGrade: number;
    minPassingGrade: number;
    attendanceRequired: boolean;
    attendanceThreshold: number;
    allowLateSubmissions: boolean;
    lateSubmissionPenalty: number;
    defaultLanguage: string;
    supportedLanguages: string[];
    timeZone: string;
    academicYearStart: string; // MM-DD format
    academicYearEnd: string;
    gradingPeriods: Array<{
      name: string;
      startDate: string;
      endDate: string;
      weight: number;
    }>;
  };

  // Configuraciones de seguridad
  security: {
    passwordPolicy: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
      preventReuse: number;
      expirationDays: number;
    };
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    twoFactorRequired: boolean;
    ipWhitelist: string[];
    allowedDomains: string[];
    requireEmailVerification: boolean;
    ssoEnabled: boolean;
    ssoProvider?: string;
    ssoConfig?: any;
  };

  // Configuraciones de comunicación
  communication: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    pushNotifications: boolean;
    announcements: {
      enabled: boolean;
      requireApproval: boolean;
      allowStudentPosts: boolean;
    };
    messaging: {
      enabled: boolean;
      allowStudentToStudent: boolean;
      allowStudentToTeacher: boolean;
      moderationEnabled: boolean;
      fileAttachments: boolean;
      maxFileSize: number;
    };
  };

  // Configuraciones de gamificación
  gamification: {
    enabled: boolean;
    pointsSystem: {
      attendancePoints: number;
      assignmentPoints: number;
      participationPoints: number;
      perfectScoreBonus: number;
      streakMultiplier: number;
    };
    achievements: {
      enabled: boolean;
      customAchievements: boolean;
    };
    leaderboards: {
      enabled: boolean;
      publicVisibility: boolean;
      resetPeriod: 'never' | 'weekly' | 'monthly' | 'semester';
    };
    store: {
      enabled: boolean;
      allowPurchases: boolean;
      allowGifts: boolean;
    };
  };

  // Configuraciones de integraciones
  integrations: {
    lms: {
      enabled: boolean;
      provider?: string;
      config?: any;
    };
    sis: {
      enabled: boolean;
      provider?: string;
      config?: any;
    };
    analytics: {
      enabled: boolean;
      provider?: string;
      config?: any;
    };
    storage: {
      provider: 'local' | 'aws_s3' | 'google_cloud' | 'azure';
      config: any;
      maxFileSize: number;
      allowedTypes: string[];
    };
    backup: {
      enabled: boolean;
      frequency: 'daily' | 'weekly' | 'monthly';
      retention: number;
      provider?: string;
      config?: any;
    };
  };

  // Configuraciones de apariencia
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl?: string;
    faviconUrl?: string;
    customCss?: string;
    customJs?: string;
    showBranding: boolean;
  };

  // Configuraciones específicas por módulo
  modules: {
    activities: {
      enabled: boolean;
      allowStudentCreation: boolean;
      requireTeacherApproval: boolean;
      autoGrading: boolean;
      plagiarismDetection: boolean;
    };
    calendar: {
      enabled: boolean;
      allowStudentEvents: boolean;
      requireApproval: boolean;
      syncWithExternal: boolean;
      externalCalendarConfig?: any;
    };
    communications: {
      enabled: boolean;
      chatEnabled: boolean;
      videoCallsEnabled: boolean;
      fileSharing: boolean;
      channelsEnabled: boolean;
    };
    analytics: {
      enabled: boolean;
      studentAnalytics: boolean;
      teacherAnalytics: boolean;
      institutionAnalytics: boolean;
      exportEnabled: boolean;
      realTimeUpdates: boolean;
    };
    games: {
      enabled: boolean;
      allowStudentCreation: boolean;
      competitiveMode: boolean;
      rewards: boolean;
      analytics: boolean;
    };
    files: {
      enabled: boolean;
      maxStoragePerUser: number;
      versionControl: boolean;
      collaboration: boolean;
      publicSharing: boolean;
    };
  };
}

export interface SubscriptionLimits {
  maxUsers: number;
  maxStudents: number;
  maxTeachers: number;
  maxClassrooms: number;
  maxStorage: number; // in bytes
  maxFileSize: number; // in bytes
  maxAPICallsPerMonth: number;
  maxBranches: number;
  maxDepartments: number;
  features: {
    analytics: boolean;
    gamification: boolean;
    integrations: boolean;
    customBranding: boolean;
    advancedReporting: boolean;
    apiAccess: boolean;
    singleSignOn: boolean;
    prioritySupport: boolean;
    backupRetention: number; // in days
    customFields: boolean;
    bulkOperations: boolean;
    webhooks: boolean;
  };
}

export interface InstitutionStatistics {
  users: {
    total: number;
    active: number;
    students: number;
    teachers: number;
    admins: number;
    lastLoginStats: {
      today: number;
      thisWeek: number;
      thisMonth: number;
    };
  };
  content: {
    classrooms: number;
    activities: number;
    files: number;
    totalStorage: number;
    events: number;
    messages: number;
  };
  engagement: {
    averageLoginFrequency: number;
    averageSessionDuration: number;
    mostActiveHours: number[];
    peakUsageDays: string[];
    completionRates: {
      activities: number;
      assignments: number;
      courses: number;
    };
  };
  performance: {
    averageResponseTime: number;
    uptime: number;
    errorRate: number;
    apiUsage: {
      callsThisMonth: number;
      averageResponseTime: number;
      topEndpoints: Array<{ endpoint: string; calls: number }>;
    };
  };
  financial: {
    subscriptionRevenue: number;
    additionalServices: number;
    outstandingPayments: number;
    nextBillingDate: Date;
    paymentHistory: Array<{
      date: Date;
      amount: number;
      status: string;
      description: string;
    }>;
  };
}

// =============================================================================
// ENTIDAD PRINCIPAL
// =============================================================================

@Entity('institutions')
@Index(['code'], { unique: true })
@Index(['domain'], { unique: true })
@Index(['status', 'subscriptionPlan'])
@Index(['createdAt', 'status'])
export class Institution {
  @ApiProperty({ description: 'ID único de la institución' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // =============================================================================
  // INFORMACIÓN BÁSICA
  // =============================================================================

  @ApiProperty({ description: 'Código único identificador (slug)' })
  @Column({ unique: true, length: 50 })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Nombre completo de la institución' })
  @Column({ length: 200 })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Nombre corto o siglas' })
  @Column({ length: 50, nullable: true })
  @IsString()
  @IsOptional()
  shortName?: string;

  @ApiProperty({ description: 'Descripción de la institución' })
  @Column({ type: 'text', nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Tipo de institución', enum: InstitutionType })
  @Column({ type: 'enum', enum: InstitutionType })
  @IsEnum(InstitutionType)
  type: InstitutionType;

  @ApiProperty({ description: 'Tamaño de la institución', enum: InstitutionSize })
  @Column({ type: 'enum', enum: InstitutionSize, default: InstitutionSize.SMALL })
  @IsEnum(InstitutionSize)
  size: InstitutionSize;

  // =============================================================================
  // INFORMACIÓN DE CONTACTO
  // =============================================================================

  @ApiProperty({ description: 'Dominio personalizado de la institución' })
  @Column({ unique: true, nullable: true, length: 100 })
  @IsString()
  @IsOptional()
  domain?: string;

  @ApiProperty({ description: 'Email principal de contacto' })
  @Column({ length: 100 })
  @IsString()
  contactEmail: string;

  @ApiProperty({ description: 'Teléfono principal' })
  @Column({ length: 20, nullable: true })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiProperty({ description: 'Sitio web oficial' })
  @Column({ length: 200, nullable: true })
  @IsString()
  @IsOptional()
  website?: string;

  // =============================================================================
  // DIRECCIÓN FÍSICA
  // =============================================================================

  @ApiProperty({ description: 'Dirección completa' })
  @Column({ type: 'text', nullable: true })
  @IsString()
  @IsOptional()
  address?: string;

  @ApiProperty({ description: 'Ciudad' })
  @Column({ length: 100, nullable: true })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiProperty({ description: 'Estado/Provincia' })
  @Column({ length: 100, nullable: true })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiProperty({ description: 'Código postal' })
  @Column({ length: 20, nullable: true })
  @IsString()
  @IsOptional()
  postalCode?: string;

  @ApiProperty({ description: 'País' })
  @Column({ length: 100, nullable: true })
  @IsString()
  @IsOptional()
  country?: string;

  @ApiProperty({ description: 'Zona horaria' })
  @Column({ length: 50, default: 'UTC' })
  @IsString()
  timezone: string;

  // =============================================================================
  // ESTADO Y SUSCRIPCIÓN
  // =============================================================================

  @ApiProperty({ description: 'Estado actual de la institución', enum: InstitutionStatus })
  @Column({ type: 'enum', enum: InstitutionStatus, default: InstitutionStatus.TRIAL })
  @IsEnum(InstitutionStatus)
  @Index()
  status: InstitutionStatus;

  @ApiProperty({ description: 'Plan de suscripción', enum: SubscriptionPlan })
  @Column({ type: 'enum', enum: SubscriptionPlan, default: SubscriptionPlan.FREE })
  @IsEnum(SubscriptionPlan)
  @Index()
  subscriptionPlan: SubscriptionPlan;

  @ApiProperty({ description: 'Fecha de inicio de suscripción' })
  @Column({ type: 'timestamp', nullable: true })
  subscriptionStartDate?: Date;

  @ApiProperty({ description: 'Fecha de vencimiento de suscripción' })
  @Column({ type: 'timestamp', nullable: true })
  @Index()
  subscriptionEndDate?: Date;

  @ApiProperty({ description: 'Límites del plan de suscripción' })
  @Column({ type: 'json' })
  @IsObject()
  subscriptionLimits: SubscriptionLimits;

  @ApiProperty({ description: 'Si la institución está en período de prueba' })
  @Column({ default: true })
  @IsBoolean()
  isTrialActive: boolean;

  @ApiProperty({ description: 'Días restantes de prueba' })
  @Column({ default: 30 })
  @IsNumber()
  @Min(0)
  trialDaysRemaining: number;

  // =============================================================================
  // CONFIGURACIONES
  // =============================================================================

  @ApiProperty({ description: 'Configuraciones específicas de la institución' })
  @Column({ type: 'json' })
  @IsObject()
  settings: InstitutionSettings;

  @ApiProperty({ description: 'Si se permite el registro automático' })
  @Column({ default: false })
  @IsBoolean()
  allowSelfRegistration: boolean;

  @ApiProperty({ description: 'Si se requiere aprobación manual para nuevos usuarios' })
  @Column({ default: true })
  @IsBoolean()
  requireApproval: boolean;

  @ApiProperty({ description: 'Dominios de email permitidos para registro automático' })
  @Column({ type: 'json', default: '[]' })
  @IsArray()
  allowedEmailDomains: string[];

  @ApiProperty({ description: 'Roles disponibles en la institución' })
  @Column({ type: 'json' })
  @IsArray()
  availableRoles: Array<{
    id: string;
    name: string;
    description: string;
    permissions: string[];
    isDefault: boolean;
    isSystem: boolean;
  }>;

  // =============================================================================
  // ESTADÍSTICAS Y MÉTRICAS
  // =============================================================================

  @ApiProperty({ description: 'Estadísticas consolidadas de la institución' })
  @Column({ type: 'json' })
  @IsObject()
  statistics: InstitutionStatistics;

  @ApiProperty({ description: 'Fecha de la última actualización de estadísticas' })
  @Column({ type: 'timestamp', nullable: true })
  statisticsLastUpdated?: Date;

  @ApiProperty({ description: 'Número total de usuarios' })
  @Column({ default: 0 })
  @IsNumber()
  @Min(0)
  totalUsers: number;

  @ApiProperty({ description: 'Número de usuarios activos' })
  @Column({ default: 0 })
  @IsNumber()
  @Min(0)
  activeUsers: number;

  @ApiProperty({ description: 'Almacenamiento total utilizado en bytes' })
  @Column({ type: 'bigint', default: 0 })
  @IsNumber()
  @Min(0)
  totalStorageUsed: number;

  // =============================================================================
  // INFORMACIÓN DE LICENCIAS Y PAGOS
  // =============================================================================

  @ApiProperty({ description: 'Información de facturación' })
  @Column({ type: 'json', nullable: true })
  @IsObject()
  @IsOptional()
  billingInfo?: {
    companyName?: string;
    taxId?: string;
    billingAddress?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    paymentMethod?: {
      type: 'card' | 'bank_transfer' | 'check' | 'other';
      lastFour?: string;
      expiryDate?: string;
    };
    billingCycle: 'monthly' | 'quarterly' | 'yearly';
    nextBillingDate?: Date;
    lastPaymentDate?: Date;
    outstandingAmount?: number;
  };

  @ApiProperty({ description: 'Clave de API para integraciones' })
  @Column({ nullable: true, unique: true, length: 64 })
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiProperty({ description: 'Webhooks configurados' })
  @Column({ type: 'json', default: '[]' })
  @IsArray()
  webhooks: Array<{
    id: string;
    url: string;
    events: string[];
    isActive: boolean;
    secret?: string;
    createdAt: Date;
  }>;

  // =============================================================================
  // INFORMACIÓN ADICIONAL
  // =============================================================================

  @ApiProperty({ description: 'Metadatos adicionales flexibles' })
  @Column({ type: 'json', default: '{}' })
  @IsObject()
  metadata: Record<string, any>;

  @ApiProperty({ description: 'Tags para categorización' })
  @Column({ type: 'json', default: '[]' })
  @IsArray()
  tags: string[];

  @ApiProperty({ description: 'Notas internas administrativas' })
  @Column({ type: 'text', nullable: true })
  @IsString()
  @IsOptional()
  internalNotes?: string;

  // =============================================================================
  // CAMPOS DE AUDITORÍA
  // =============================================================================

  @ApiProperty({ description: 'ID del usuario que creó la institución' })
  @Column({ nullable: true })
  @IsString()
  @IsOptional()
  createdById?: string;

  @ApiProperty({ description: 'ID del último usuario que modificó la institución' })
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
  // RELACIONES
  // =============================================================================

  // Las relaciones se definirán en archivos separados para evitar dependencias circulares
  // @OneToMany(() => Branch, branch => branch.institution)
  // branches: Branch[];

  // @OneToMany(() => User, user => user.institution)
  // users: User[];

  // @OneToMany(() => Classroom, classroom => classroom.institution)
  // classrooms: Classroom[];

  // =============================================================================
  // HOOKS DE CICLO DE VIDA
  // =============================================================================

  @BeforeInsert()
  beforeInsert() {
    this.generateApiKey();
    this.initializeDefaultSettings();
    this.initializeDefaultLimits();
    this.initializeDefaultRoles();
    this.initializeStatistics();
  }

  @BeforeUpdate()
  beforeUpdate() {
    this.updateSize();
    this.validateSubscription();
  }

  @AfterLoad()
  afterLoad() {
    this.calculateTrialDaysRemaining();
  }

  // =============================================================================
  // MÉTODOS DE NEGOCIO
  // =============================================================================

  /**
   * 🔑 Generar nueva clave API
   */
  generateApiKey(): void {
    this.apiKey = randomBytes(32).toString('hex');
  }

  /**
   * ⚙️ Inicializar configuraciones por defecto
   */
  private initializeDefaultSettings(): void {
    if (!this.settings) {
      this.settings = {
        academic: {
          gradingSystem: 'numeric',
          maxGrade: 100,
          minPassingGrade: 60,
          attendanceRequired: true,
          attendanceThreshold: 80,
          allowLateSubmissions: true,
          lateSubmissionPenalty: 10,
          defaultLanguage: 'es',
          supportedLanguages: ['es', 'en'],
          timeZone: 'America/Mexico_City',
          academicYearStart: '08-01',
          academicYearEnd: '07-31',
          gradingPeriods: [
            { name: 'Primer Parcial', startDate: '08-01', endDate: '10-15', weight: 25 },
            { name: 'Segundo Parcial', startDate: '10-16', endDate: '12-15', weight: 25 },
            { name: 'Tercer Parcial', startDate: '01-08', endDate: '03-15', weight: 25 },
            { name: 'Cuarto Parcial', startDate: '03-16', endDate: '06-30', weight: 25 },
          ],
        },
        security: {
          passwordPolicy: {
            minLength: 8,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: false,
            preventReuse: 5,
            expirationDays: 90,
          },
          sessionTimeout: 480, // 8 horas
          maxLoginAttempts: 5,
          lockoutDuration: 15, // minutos
          twoFactorRequired: false,
          ipWhitelist: [],
          allowedDomains: [],
          requireEmailVerification: true,
          ssoEnabled: false,
        },
        communication: {
          emailNotifications: true,
          smsNotifications: false,
          pushNotifications: true,
          announcements: {
            enabled: true,
            requireApproval: true,
            allowStudentPosts: false,
          },
          messaging: {
            enabled: true,
            allowStudentToStudent: true,
            allowStudentToTeacher: true,
            moderationEnabled: true,
            fileAttachments: true,
            maxFileSize: 10485760, // 10MB
          },
        },
        gamification: {
          enabled: true,
          pointsSystem: {
            attendancePoints: 10,
            assignmentPoints: 50,
            participationPoints: 5,
            perfectScoreBonus: 25,
            streakMultiplier: 1.5,
          },
          achievements: {
            enabled: true,
            customAchievements: false,
          },
          leaderboards: {
            enabled: true,
            publicVisibility: true,
            resetPeriod: 'semester',
          },
          store: {
            enabled: true,
            allowPurchases: true,
            allowGifts: true,
          },
        },
        integrations: {
          lms: { enabled: false },
          sis: { enabled: false },
          analytics: { enabled: true },
          storage: {
            provider: 'local',
            config: {},
            maxFileSize: 52428800, // 50MB
            allowedTypes: ['pdf', 'docx', 'pptx', 'xlsx', 'jpg', 'png', 'mp4'],
          },
          backup: {
            enabled: true,
            frequency: 'daily',
            retention: 30,
          },
        },
        branding: {
          primaryColor: '#3B82F6',
          secondaryColor: '#1E40AF',
          showBranding: true,
        },
        modules: {
          activities: {
            enabled: true,
            allowStudentCreation: false,
            requireTeacherApproval: true,
            autoGrading: true,
            plagiarismDetection: false,
          },
          calendar: {
            enabled: true,
            allowStudentEvents: true,
            requireApproval: false,
            syncWithExternal: false,
          },
          communications: {
            enabled: true,
            chatEnabled: true,
            videoCallsEnabled: false,
            fileSharing: true,
            channelsEnabled: true,
          },
          analytics: {
            enabled: true,
            studentAnalytics: true,
            teacherAnalytics: true,
            institutionAnalytics: true,
            exportEnabled: true,
            realTimeUpdates: true,
          },
          games: {
            enabled: true,
            allowStudentCreation: false,
            competitiveMode: true,
            rewards: true,
            analytics: true,
          },
          files: {
            enabled: true,
            maxStoragePerUser: 104857600, // 100MB
            versionControl: true,
            collaboration: true,
            publicSharing: false,
          },
        },
      };
    }
  }

  /**
   * 📊 Inicializar límites por defecto según el plan
   */
  private initializeDefaultLimits(): void {
    if (!this.subscriptionLimits) {
      const planLimits = {
        [SubscriptionPlan.FREE]: {
          maxUsers: 50,
          maxStudents: 40,
          maxTeachers: 10,
          maxClassrooms: 5,
          maxStorage: 1073741824, // 1GB
          maxFileSize: 10485760, // 10MB
          maxAPICallsPerMonth: 1000,
          maxBranches: 1,
          maxDepartments: 3,
          features: {
            analytics: false,
            gamification: true,
            integrations: false,
            customBranding: false,
            advancedReporting: false,
            apiAccess: false,
            singleSignOn: false,
            prioritySupport: false,
            backupRetention: 7,
            customFields: false,
            bulkOperations: false,
            webhooks: false,
          },
        },
        [SubscriptionPlan.BASIC]: {
          maxUsers: 200,
          maxStudents: 150,
          maxTeachers: 50,
          maxClassrooms: 20,
          maxStorage: 10737418240, // 10GB
          maxFileSize: 52428800, // 50MB
          maxAPICallsPerMonth: 10000,
          maxBranches: 3,
          maxDepartments: 10,
          features: {
            analytics: true,
            gamification: true,
            integrations: true,
            customBranding: false,
            advancedReporting: false,
            apiAccess: true,
            singleSignOn: false,
            prioritySupport: false,
            backupRetention: 30,
            customFields: true,
            bulkOperations: false,
            webhooks: false,
          },
        },
        [SubscriptionPlan.STANDARD]: {
          maxUsers: 1000,
          maxStudents: 800,
          maxTeachers: 200,
          maxClassrooms: 100,
          maxStorage: 53687091200, // 50GB
          maxFileSize: 104857600, // 100MB
          maxAPICallsPerMonth: 50000,
          maxBranches: 10,
          maxDepartments: 50,
          features: {
            analytics: true,
            gamification: true,
            integrations: true,
            customBranding: true,
            advancedReporting: true,
            apiAccess: true,
            singleSignOn: true,
            prioritySupport: false,
            backupRetention: 90,
            customFields: true,
            bulkOperations: true,
            webhooks: true,
          },
        },
        [SubscriptionPlan.PREMIUM]: {
          maxUsers: 5000,
          maxStudents: 4000,
          maxTeachers: 1000,
          maxClassrooms: 500,
          maxStorage: 268435456000, // 250GB
          maxFileSize: 524288000, // 500MB
          maxAPICallsPerMonth: 250000,
          maxBranches: 50,
          maxDepartments: 200,
          features: {
            analytics: true,
            gamification: true,
            integrations: true,
            customBranding: true,
            advancedReporting: true,
            apiAccess: true,
            singleSignOn: true,
            prioritySupport: true,
            backupRetention: 365,
            customFields: true,
            bulkOperations: true,
            webhooks: true,
          },
        },
        [SubscriptionPlan.ENTERPRISE]: {
          maxUsers: -1, // Ilimitado
          maxStudents: -1,
          maxTeachers: -1,
          maxClassrooms: -1,
          maxStorage: -1,
          maxFileSize: 1073741824, // 1GB
          maxAPICallsPerMonth: -1,
          maxBranches: -1,
          maxDepartments: -1,
          features: {
            analytics: true,
            gamification: true,
            integrations: true,
            customBranding: true,
            advancedReporting: true,
            apiAccess: true,
            singleSignOn: true,
            prioritySupport: true,
            backupRetention: -1, // Ilimitado
            customFields: true,
            bulkOperations: true,
            webhooks: true,
          },
        },
      };

      this.subscriptionLimits = planLimits[this.subscriptionPlan] || planLimits[SubscriptionPlan.FREE];
    }
  }

  /**
   * 👥 Inicializar roles por defecto
   */
  private initializeDefaultRoles(): void {
    if (!this.availableRoles || this.availableRoles.length === 0) {
      this.availableRoles = [
        {
          id: 'super_admin',
          name: 'Super Administrador',
          description: 'Control total del sistema',
          permissions: ['*'],
          isDefault: false,
          isSystem: true,
        },
        {
          id: 'admin',
          name: 'Administrador',
          description: 'Gestión general de la institución',
          permissions: [
            'institution.manage',
            'users.manage',
            'classrooms.manage',
            'reports.view',
            'settings.manage',
          ],
          isDefault: false,
          isSystem: true,
        },
        {
          id: 'teacher',
          name: 'Profesor',
          description: 'Gestión de aulas y actividades educativas',
          permissions: [
            'classrooms.teach',
            'activities.manage',
            'students.grade',
            'reports.view_own',
            'communications.send',
          ],
          isDefault: true,
          isSystem: true,
        },
        {
          id: 'student',
          name: 'Estudiante',
          description: 'Acceso a contenido educativo y actividades',
          permissions: [
            'classrooms.join',
            'activities.participate',
            'files.download',
            'communications.receive',
            'profile.manage_own',
          ],
          isDefault: true,
          isSystem: true,
        },
        {
          id: 'parent',
          name: 'Padre/Tutor',
          description: 'Seguimiento del progreso de estudiantes',
          permissions: [
            'students.view_progress',
            'reports.view_student',
            'communications.receive',
            'events.view',
          ],
          isDefault: false,
          isSystem: true,
        },
      ];
    }
  }

  /**
   * 📈 Inicializar estadísticas
   */
  private initializeStatistics(): void {
    if (!this.statistics) {
      this.statistics = {
        users: {
          total: 0,
          active: 0,
          students: 0,
          teachers: 0,
          admins: 0,
          lastLoginStats: { today: 0, thisWeek: 0, thisMonth: 0 },
        },
        content: {
          classrooms: 0,
          activities: 0,
          files: 0,
          totalStorage: 0,
          events: 0,
          messages: 0,
        },
        engagement: {
          averageLoginFrequency: 0,
          averageSessionDuration: 0,
          mostActiveHours: [],
          peakUsageDays: [],
          completionRates: { activities: 0, assignments: 0, courses: 0 },
        },
        performance: {
          averageResponseTime: 0,
          uptime: 99.5,
          errorRate: 0,
          apiUsage: {
            callsThisMonth: 0,
            averageResponseTime: 0,
            topEndpoints: [],
          },
        },
        financial: {
          subscriptionRevenue: 0,
          additionalServices: 0,
          outstandingPayments: 0,
          nextBillingDate: new Date(),
          paymentHistory: [],
        },
      };
    }
  }

  /**
   * 📏 Actualizar tamaño de institución basado en número de usuarios
   */
  private updateSize(): void {
    if (this.totalUsers < 100) {
      this.size = InstitutionSize.SMALL;
    } else if (this.totalUsers < 1000) {
      this.size = InstitutionSize.MEDIUM;
    } else if (this.totalUsers < 10000) {
      this.size = InstitutionSize.LARGE;
    } else {
      this.size = InstitutionSize.ENTERPRISE;
    }
  }

  /**
   * ✅ Validar estado de suscripción
   */
  private validateSubscription(): void {
    const now = new Date();
    
    if (this.subscriptionEndDate && this.subscriptionEndDate < now) {
      if (this.status === InstitutionStatus.ACTIVE) {
        this.status = InstitutionStatus.EXPIRED;
      }
    }

    // Verificar límites del plan
    this.enforceSubscriptionLimits();
  }

  /**
   * 📅 Calcular días restantes de prueba
   */
  private calculateTrialDaysRemaining(): void {
    if (this.isTrialActive && this.createdAt) {
      const trialEnd = new Date(this.createdAt);
      trialEnd.setDate(trialEnd.getDate() + 30); // 30 días de prueba
      
      const now = new Date();
      const diffTime = trialEnd.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      this.trialDaysRemaining = Math.max(0, diffDays);
      
      if (this.trialDaysRemaining === 0) {
        this.isTrialActive = false;
        if (this.status === InstitutionStatus.TRIAL) {
          this.status = InstitutionStatus.EXPIRED;
        }
      }
    }
  }

  /**
   * 🔒 Aplicar límites de suscripción
   */
  private enforceSubscriptionLimits(): void {
    // Esta función se usaría para verificar que no se excedan los límites
    // En la práctica, se verificaría antes de crear nuevos recursos
  }

  // =============================================================================
  // MÉTODOS PÚBLICOS DE NEGOCIO
  // =============================================================================

  /**
   * ✅ Verificar si la institución está activa
   */
  isActive(): boolean {
    return this.status === InstitutionStatus.ACTIVE || 
           (this.status === InstitutionStatus.TRIAL && this.isTrialActive);
  }

  /**
   * 🔍 Verificar si una característica está habilitada
   */
  hasFeature(feature: keyof SubscriptionLimits['features']): boolean {
    return this.subscriptionLimits.features[feature] === true;
  }

  /**
   * 📊 Verificar si se puede agregar más contenido
   */
  canAddUsers(count: number = 1): boolean {
    if (this.subscriptionLimits.maxUsers === -1) return true;
    return (this.totalUsers + count) <= this.subscriptionLimits.maxUsers;
  }

  /**
   * 💾 Verificar espacio de almacenamiento
   */
  canAddStorage(bytes: number): boolean {
    if (this.subscriptionLimits.maxStorage === -1) return true;
    return (this.totalStorageUsed + bytes) <= this.subscriptionLimits.maxStorage;
  }

  /**
   * 🎨 Obtener configuración de marca personalizada
   */
  getBrandingConfig(): any {
    return {
      primaryColor: this.settings.branding.primaryColor,
      secondaryColor: this.settings.branding.secondaryColor,
      logoUrl: this.settings.branding.logoUrl,
      faviconUrl: this.settings.branding.faviconUrl,
      customCss: this.settings.branding.customCss,
      customJs: this.settings.branding.customJs,
      showBranding: this.settings.branding.showBranding,
    };
  }

  /**
   * 📧 Obtener configuración de notificaciones
   */
  getNotificationSettings(): any {
    return {
      email: this.settings.communication.emailNotifications,
      sms: this.settings.communication.smsNotifications,
      push: this.settings.communication.pushNotifications,
    };
  }

  /**
   * 🎮 Verificar si la gamificación está habilitada
   */
  isGamificationEnabled(): boolean {
    return this.settings.gamification.enabled;
  }

  /**
   * 🔐 Verificar validez de clave API
   */
  isValidApiKey(providedKey: string): boolean {
    return this.apiKey === providedKey;
  }

  /**
   * 📝 Agregar webhook
   */
  addWebhook(url: string, events: string[], secret?: string): void {
    const webhook = {
      id: randomUUID(),
      url,
      events,
      isActive: true,
      secret,
      createdAt: new Date(),
    };
    
    if (!this.webhooks) {
      this.webhooks = [];
    }
    
    this.webhooks.push(webhook);
  }

  /**
   * 🗑️ Eliminar webhook
   */
  removeWebhook(webhookId: string): boolean {
    if (!this.webhooks) return false;
    
    const initialLength = this.webhooks.length;
    this.webhooks = this.webhooks.filter(w => w.id !== webhookId);
    
    return this.webhooks.length < initialLength;
  }

  /**
   * 📊 Actualizar estadísticas de uso
   */
  updateUsageStatistics(updates: Partial<InstitutionStatistics>): void {
    this.statistics = { ...this.statistics, ...updates };
    this.statisticsLastUpdated = new Date();
  }

  /**
   * 🔄 Renovar suscripción
   */
  renewSubscription(plan: SubscriptionPlan, months: number = 12): void {
    this.subscriptionPlan = plan;
    this.subscriptionStartDate = new Date();
    
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + months);
    this.subscriptionEndDate = endDate;
    
    this.status = InstitutionStatus.ACTIVE;
    this.initializeDefaultLimits(); // Actualizar límites según el nuevo plan
  }

  /**
   * 📄 Obtener resumen para API
   */
  getApiSummary(): any {
    return {
      id: this.id,
      code: this.code,
      name: this.name,
      shortName: this.shortName,
      type: this.type,
      size: this.size,
      status: this.status,
      subscriptionPlan: this.subscriptionPlan,
      isTrialActive: this.isTrialActive,
      trialDaysRemaining: this.trialDaysRemaining,
      totalUsers: this.totalUsers,
      activeUsers: this.activeUsers,
      domain: this.domain,
      website: this.website,
      contactEmail: this.contactEmail,
      country: this.country,
      timezone: this.timezone,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}