/**
 * 🏢 ENTIDAD SUCURSAL - GESTIÓN DE SEDES Y CAMPUS INSTITUCIONALES
 * 
 * Sistema de gestión de sucursales, sedes, campus o filiales dentro de una institución.
 * Permite organización geográfica y administrativa de la estructura institucional.
 * 
 * CARACTERÍSTICAS PRINCIPALES:
 * - Organización jerárquica de sucursales
 * - Gestión independiente por ubicación
 * - Configuraciones específicas por sede
 * - Control de recursos y límites
 * - Estadísticas y análisis por sucursal
 * - Integración con todos los módulos
 * 
 * CASOS DE USO:
 * - Universidad con múltiples campus
 * - Colegio con varias sedes
 * - Academia con franquicias
 * - Organización con oficinas regionales
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
import { IsEnum, IsString, IsOptional, IsBoolean, IsObject, IsArray, IsNumber, Min } from 'class-validator';
import { Institution } from './institution.entity';

// =============================================================================
// ENUMS Y TIPOS
// =============================================================================

export enum BranchType {
  MAIN_CAMPUS = 'main_campus',
  BRANCH_CAMPUS = 'branch_campus',
  SATELLITE = 'satellite',
  ONLINE = 'online',
  HYBRID = 'hybrid',
  TEMPORARY = 'temporary',
  PARTNER = 'partner',
}

export enum BranchStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  UNDER_CONSTRUCTION = 'under_construction',
  MAINTENANCE = 'maintenance',
  TEMPORARILY_CLOSED = 'temporarily_closed',
  PERMANENTLY_CLOSED = 'permanently_closed',
}

export enum BranchSize {
  SMALL = 'small',      // < 200 usuarios
  MEDIUM = 'medium',    // 200-1000 usuarios
  LARGE = 'large',      // 1000-5000 usuarios
  VERY_LARGE = 'very_large', // > 5000 usuarios
}

// Interfaces para configuraciones complejas
export interface BranchSettings {
  // Configuraciones operativas
  operations: {
    operatingHours: {
      monday: { open: string; close: string; closed?: boolean };
      tuesday: { open: string; close: string; closed?: boolean };
      wednesday: { open: string; close: string; closed?: boolean };
      thursday: { open: string; close: string; closed?: boolean };
      friday: { open: string; close: string; closed?: boolean };
      saturday: { open: string; close: string; closed?: boolean };
      sunday: { open: string; close: string; closed?: boolean };
    };
    holidays: Array<{
      name: string;
      date: string;
      recurring: boolean;
      description?: string;
    }>;
    capacity: {
      maxStudents: number;
      maxTeachers: number;
      maxClassrooms: number;
      maxConcurrentSessions: number;
    };
    facilities: Array<{
      id: string;
      name: string;
      type: 'classroom' | 'lab' | 'library' | 'auditorium' | 'gym' | 'cafeteria' | 'office' | 'other';
      capacity: number;
      equipment: string[];
      bookable: boolean;
      description?: string;
    }>;
  };

  // Configuraciones académicas específicas
  academic: {
    offeredPrograms: Array<{
      id: string;
      name: string;
      level: 'elementary' | 'middle' | 'high' | 'undergraduate' | 'graduate' | 'doctorate' | 'certificate';
      duration: number; // in months
      credits?: number;
      isActive: boolean;
    }>;
    gradeOverrides: {
      useInstitutionDefaults: boolean;
      customGradingSystem?: 'numeric' | 'letter' | 'pass_fail' | 'custom';
      customMaxGrade?: number;
      customMinPassingGrade?: number;
    };
    attendanceRules: {
      useInstitutionDefaults: boolean;
      customThreshold?: number;
      stricterRequirements?: boolean;
    };
  };

  // Configuraciones de recursos
  resources: {
    library: {
      hasPhysicalLibrary: boolean;
      digitalAccess: boolean;
      studyRooms: number;
      operatingHours?: {
        monday: string;
        tuesday: string;
        wednesday: string;
        thursday: string;
        friday: string;
        saturday: string;
        sunday: string;
      };
    };
    technology: {
      wifiAvailable: boolean;
      computerLabs: number;
      computersPerLab: number;
      projectors: number;
      smartBoards: number;
      tablets: number;
      printers: number;
      scanners: number;
    };
    transportation: {
      busService: boolean;
      parkingSpaces: number;
      bikeRacks: number;
      accessibleParking: number;
    };
  };

  // Configuraciones de servicios
  services: {
    cafeteria: {
      available: boolean;
      capacity?: number;
      mealPlans?: boolean;
      specialDiets?: string[];
    };
    medical: {
      nurseOffice: boolean;
      firstAid: boolean;
      emergencyProtocols: boolean;
      medicationStorage: boolean;
    };
    counseling: {
      academicCounseling: boolean;
      personalCounseling: boolean;
      careerGuidance: boolean;
      specialNeeds: boolean;
    };
    security: {
      securityGuards: boolean;
      cameras: boolean;
      accessControl: boolean;
      emergencyAlarms: boolean;
      visitorsPolicy: 'open' | 'restricted' | 'appointment_only';
    };
  };

  // Configuraciones locales
  localization: {
    primaryLanguage: string;
    supportedLanguages: string[];
    currency: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    weekStartsOn: 'sunday' | 'monday';
    culturalConsiderations?: string[];
  };
}

export interface BranchStatistics {
  // Estadísticas de usuarios
  users: {
    total: number;
    active: number;
    students: number;
    teachers: number;
    staff: number;
    administrators: number;
    enrollment: {
      current: number;
      capacity: number;
      utilizationRate: number;
    };
  };

  // Estadísticas académicas
  academic: {
    activePrograms: number;
    classrooms: number;
    activeSessions: number;
    averageClassSize: number;
    completionRates: {
      assignments: number;
      courses: number;
      programs: number;
    };
    gradeDistribution: {
      excellent: number;
      good: number;
      satisfactory: number;
      needsImprovement: number;
      failing: number;
    };
  };

  // Estadísticas operativas
  operations: {
    utilization: {
      classrooms: number;
      facilities: number;
      technology: number;
    };
    maintenance: {
      openTickets: number;
      avgResolutionTime: number; // in hours
      preventiveScheduled: number;
    };
    events: {
      scheduledToday: number;
      thisWeek: number;
      thisMonth: number;
    };
  };

  // Estadísticas financieras
  financial: {
    budget: {
      allocated: number;
      spent: number;
      remaining: number;
      utilizationRate: number;
    };
    revenue: {
      tuition: number;
      fees: number;
      services: number;
      other: number;
    };
    expenses: {
      salaries: number;
      utilities: number;
      maintenance: number;
      supplies: number;
      other: number;
    };
  };

  // Estadísticas de rendimiento
  performance: {
    attendance: {
      students: number;
      teachers: number;
      staff: number;
    };
    satisfaction: {
      students: number;
      teachers: number;
      parents: number;
    };
    safety: {
      incidents: number;
      emergencyDrills: number;
      safetyScore: number;
    };
  };
}

// =============================================================================
// ENTIDAD PRINCIPAL
// =============================================================================

@Entity('branches')
@Index(['institutionId', 'code'], { unique: true })
@Index(['status', 'type'])
@Index(['createdAt', 'status'])
export class Branch {
  @ApiProperty({ description: 'ID único de la sucursal' })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // =============================================================================
  // RELACIONES
  // =============================================================================

  @ApiProperty({ description: 'ID de la institución padre' })
  @Column()
  @Index()
  institutionId: string;

  @ManyToOne(() => Institution, { nullable: false })
  @JoinColumn({ name: 'institutionId' })
  institution: Institution;

  // Auto-referencia para sucursales padre
  @ApiProperty({ description: 'ID de sucursal padre (para jerarquía)' })
  @Column({ nullable: true })
  @Index()
  parentBranchId?: string;

  @ManyToOne(() => Branch, branch => branch.childBranches, { nullable: true })
  @JoinColumn({ name: 'parentBranchId' })
  parentBranch?: Branch;

  @OneToMany(() => Branch, branch => branch.parentBranch)
  childBranches: Branch[];

  // =============================================================================
  // INFORMACIÓN BÁSICA
  // =============================================================================

  @ApiProperty({ description: 'Código único de la sucursal' })
  @Column({ length: 50 })
  @IsString()
  @Index()
  code: string;

  @ApiProperty({ description: 'Nombre de la sucursal' })
  @Column({ length: 200 })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Nombre corto de la sucursal' })
  @Column({ length: 50, nullable: true })
  @IsString()
  @IsOptional()
  shortName?: string;

  @ApiProperty({ description: 'Descripción de la sucursal' })
  @Column({ type: 'text', nullable: true })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Tipo de sucursal', enum: BranchType })
  @Column({ type: 'enum', enum: BranchType })
  @IsEnum(BranchType)
  type: BranchType;

  @ApiProperty({ description: 'Estado de la sucursal', enum: BranchStatus })
  @Column({ type: 'enum', enum: BranchStatus, default: BranchStatus.ACTIVE })
  @IsEnum(BranchStatus)
  @Index()
  status: BranchStatus;

  @ApiProperty({ description: 'Tamaño de la sucursal', enum: BranchSize })
  @Column({ type: 'enum', enum: BranchSize, default: BranchSize.SMALL })
  @IsEnum(BranchSize)
  size: BranchSize;

  // =============================================================================
  // INFORMACIÓN DE CONTACTO Y UBICACIÓN
  // =============================================================================

  @ApiProperty({ description: 'Email principal de la sucursal' })
  @Column({ length: 100, nullable: true })
  @IsString()
  @IsOptional()
  contactEmail?: string;

  @ApiProperty({ description: 'Teléfono principal' })
  @Column({ length: 20, nullable: true })
  @IsString()
  @IsOptional()
  contactPhone?: string;

  @ApiProperty({ description: 'Sitio web específico de la sucursal' })
  @Column({ length: 200, nullable: true })
  @IsString()
  @IsOptional()
  website?: string;

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

  @ApiProperty({ description: 'Zona horaria específica' })
  @Column({ length: 50, nullable: true })
  @IsString()
  @IsOptional()
  timezone?: string;

  @ApiProperty({ description: 'Coordenadas GPS - Latitud' })
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  @IsNumber()
  @IsOptional()
  latitude?: number;

  @ApiProperty({ description: 'Coordenadas GPS - Longitud' })
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  @IsNumber()
  @IsOptional()
  longitude?: number;

  // =============================================================================
  // CONFIGURACIONES Y LÍMITES
  // =============================================================================

  @ApiProperty({ description: 'Configuraciones específicas de la sucursal' })
  @Column({ type: 'json' })
  @IsObject()
  settings: BranchSettings;

  @ApiProperty({ description: 'Si usa las configuraciones de la institución padre' })
  @Column({ default: true })
  @IsBoolean()
  useInstitutionDefaults: boolean;

  @ApiProperty({ description: 'Límites específicos de la sucursal' })
  @Column({ type: 'json', nullable: true })
  @IsObject()
  @IsOptional()
  customLimits?: {
    maxUsers: number;
    maxStudents: number;
    maxTeachers: number;
    maxClassrooms: number;
    maxStorage: number;
    customFeatures?: string[];
  };

  // =============================================================================
  // ADMINISTRACIÓN Y PERSONAL
  // =============================================================================

  @ApiProperty({ description: 'ID del director/administrador principal' })
  @Column({ nullable: true })
  @IsString()
  @IsOptional()
  directorId?: string;

  @ApiProperty({ description: 'ID del coordinador académico' })
  @Column({ nullable: true })
  @IsString()
  @IsOptional()
  academicCoordinatorId?: string;

  @ApiProperty({ description: 'IDs del personal administrativo' })
  @Column({ type: 'json', default: '[]' })
  @IsArray()
  administrativeStaff: string[];

  @ApiProperty({ description: 'IDs de los profesores asignados' })
  @Column({ type: 'json', default: '[]' })
  @IsArray()
  assignedTeachers: string[];

  // =============================================================================
  // ESTADÍSTICAS Y MÉTRICAS
  // =============================================================================

  @ApiProperty({ description: 'Estadísticas consolidadas de la sucursal' })
  @Column({ type: 'json' })
  @IsObject()
  statistics: BranchStatistics;

  @ApiProperty({ description: 'Fecha de última actualización de estadísticas' })
  @Column({ type: 'timestamp', nullable: true })
  statisticsLastUpdated?: Date;

  @ApiProperty({ description: 'Número total de usuarios en la sucursal' })
  @Column({ default: 0 })
  @IsNumber()
  @Min(0)
  totalUsers: number;

  @ApiProperty({ description: 'Número de estudiantes activos' })
  @Column({ default: 0 })
  @IsNumber()
  @Min(0)
  activeStudents: number;

  @ApiProperty({ description: 'Número de profesores activos' })
  @Column({ default: 0 })
  @IsNumber()
  @Min(0)
  activeTeachers: number;

  @ApiProperty({ description: 'Número de aulas activas' })
  @Column({ default: 0 })
  @IsNumber()
  @Min(0)
  activeClassrooms: number;

  @ApiProperty({ description: 'Almacenamiento utilizado en bytes' })
  @Column({ type: 'bigint', default: 0 })
  @IsNumber()
  @Min(0)
  storageUsed: number;

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

  @ApiProperty({ description: 'Si la sucursal es visible públicamente' })
  @Column({ default: true })
  @IsBoolean()
  isPublic: boolean;

  @ApiProperty({ description: 'Si está destacada en listados' })
  @Column({ default: false })
  @IsBoolean()
  isFeatured: boolean;

  @ApiProperty({ description: 'Orden de visualización' })
  @Column({ default: 0 })
  @IsNumber()
  displayOrder: number;

  // =============================================================================
  // CAMPOS DE AUDITORÍA
  // =============================================================================

  @ApiProperty({ description: 'ID del usuario que creó la sucursal' })
  @Column({ nullable: true })
  @IsString()
  @IsOptional()
  createdById?: string;

  @ApiProperty({ description: 'ID del último usuario que modificó la sucursal' })
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
    this.initializeStatistics();
  }

  @BeforeUpdate()
  beforeUpdate() {
    this.updateSize();
    this.validateLimits();
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
          operatingHours: {
            monday: { open: '08:00', close: '17:00' },
            tuesday: { open: '08:00', close: '17:00' },
            wednesday: { open: '08:00', close: '17:00' },
            thursday: { open: '08:00', close: '17:00' },
            friday: { open: '08:00', close: '17:00' },
            saturday: { open: '09:00', close: '13:00' },
            sunday: { closed: true, open: '00:00', close: '00:00' },
          },
          holidays: [],
          capacity: {
            maxStudents: 500,
            maxTeachers: 50,
            maxClassrooms: 20,
            maxConcurrentSessions: 30,
          },
          facilities: [],
        },
        academic: {
          offeredPrograms: [],
          gradeOverrides: {
            useInstitutionDefaults: true,
          },
          attendanceRules: {
            useInstitutionDefaults: true,
          },
        },
        resources: {
          library: {
            hasPhysicalLibrary: true,
            digitalAccess: true,
            studyRooms: 5,
          },
          technology: {
            wifiAvailable: true,
            computerLabs: 2,
            computersPerLab: 20,
            projectors: 10,
            smartBoards: 5,
            tablets: 30,
            printers: 3,
            scanners: 2,
          },
          transportation: {
            busService: false,
            parkingSpaces: 50,
            bikeRacks: 10,
            accessibleParking: 3,
          },
        },
        services: {
          cafeteria: {
            available: true,
            capacity: 100,
            mealPlans: false,
            specialDiets: [],
          },
          medical: {
            nurseOffice: true,
            firstAid: true,
            emergencyProtocols: true,
            medicationStorage: false,
          },
          counseling: {
            academicCounseling: true,
            personalCounseling: false,
            careerGuidance: true,
            specialNeeds: false,
          },
          security: {
            securityGuards: false,
            cameras: true,
            accessControl: true,
            emergencyAlarms: true,
            visitorsPolicy: 'restricted',
          },
        },
        localization: {
          primaryLanguage: 'es',
          supportedLanguages: ['es', 'en'],
          currency: 'MXN',
          dateFormat: 'DD/MM/YYYY',
          timeFormat: '24h',
          weekStartsOn: 'monday',
        },
      };
    }
  }

  /**
   * 📊 Inicializar estadísticas
   */
  private initializeStatistics(): void {
    if (!this.statistics) {
      this.statistics = {
        users: {
          total: 0,
          active: 0,
          students: 0,
          teachers: 0,
          staff: 0,
          administrators: 0,
          enrollment: {
            current: 0,
            capacity: this.settings?.operations?.capacity?.maxStudents || 500,
            utilizationRate: 0,
          },
        },
        academic: {
          activePrograms: 0,
          classrooms: 0,
          activeSessions: 0,
          averageClassSize: 0,
          completionRates: {
            assignments: 0,
            courses: 0,
            programs: 0,
          },
          gradeDistribution: {
            excellent: 0,
            good: 0,
            satisfactory: 0,
            needsImprovement: 0,
            failing: 0,
          },
        },
        operations: {
          utilization: {
            classrooms: 0,
            facilities: 0,
            technology: 0,
          },
          maintenance: {
            openTickets: 0,
            avgResolutionTime: 24,
            preventiveScheduled: 0,
          },
          events: {
            scheduledToday: 0,
            thisWeek: 0,
            thisMonth: 0,
          },
        },
        financial: {
          budget: {
            allocated: 0,
            spent: 0,
            remaining: 0,
            utilizationRate: 0,
          },
          revenue: {
            tuition: 0,
            fees: 0,
            services: 0,
            other: 0,
          },
          expenses: {
            salaries: 0,
            utilities: 0,
            maintenance: 0,
            supplies: 0,
            other: 0,
          },
        },
        performance: {
          attendance: {
            students: 0,
            teachers: 0,
            staff: 0,
          },
          satisfaction: {
            students: 0,
            teachers: 0,
            parents: 0,
          },
          safety: {
            incidents: 0,
            emergencyDrills: 0,
            safetyScore: 100,
          },
        },
      };
    }
  }

  /**
   * 📏 Actualizar tamaño basado en número de usuarios
   */
  private updateSize(): void {
    if (this.totalUsers < 200) {
      this.size = BranchSize.SMALL;
    } else if (this.totalUsers < 1000) {
      this.size = BranchSize.MEDIUM;
    } else if (this.totalUsers < 5000) {
      this.size = BranchSize.LARGE;
    } else {
      this.size = BranchSize.VERY_LARGE;
    }
  }

  /**
   * ✅ Validar límites personalizados
   */
  private validateLimits(): void {
    if (this.customLimits) {
      // Verificar que no se excedan los límites establecidos
      if (this.totalUsers > this.customLimits.maxUsers) {
        console.warn(`Sucursal ${this.code} excede el límite de usuarios: ${this.totalUsers}/${this.customLimits.maxUsers}`);
      }
      
      if (this.activeStudents > this.customLimits.maxStudents) {
        console.warn(`Sucursal ${this.code} excede el límite de estudiantes: ${this.activeStudents}/${this.customLimits.maxStudents}`);
      }
    }
  }

  // =============================================================================
  // MÉTODOS PÚBLICOS DE NEGOCIO
  // =============================================================================

  /**
   * ✅ Verificar si la sucursal está operativa
   */
  isOperational(): boolean {
    return this.status === BranchStatus.ACTIVE;
  }

  /**
   * 🕒 Verificar si está abierta en el horario actual
   */
  isCurrentlyOpen(): boolean {
    if (!this.isOperational()) return false;

    const now = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = dayNames[now.getDay()];
    const currentTime = now.toTimeString().substring(0, 5); // HH:MM format

    const daySchedule = this.settings.operations.operatingHours[currentDay as keyof typeof this.settings.operations.operatingHours];
    
    if (daySchedule?.closed) return false;
    
    return currentTime >= daySchedule.open && currentTime <= daySchedule.close;
  }

  /**
   * 📊 Verificar capacidad disponible
   */
  hasCapacityFor(type: 'students' | 'teachers' | 'classrooms', count: number = 1): boolean {
    const capacity = this.settings.operations.capacity;
    
    switch (type) {
      case 'students':
        return (this.activeStudents + count) <= capacity.maxStudents;
      case 'teachers':
        return (this.activeTeachers + count) <= capacity.maxTeachers;
      case 'classrooms':
        return (this.activeClassrooms + count) <= capacity.maxClassrooms;
      default:
        return false;
    }
  }

  /**
   * 🏢 Obtener información de instalaciones
   */
  getFacilities(type?: string): any[] {
    const facilities = this.settings.operations.facilities;
    
    if (type) {
      return facilities.filter(f => f.type === type);
    }
    
    return facilities;
  }

  /**
   * 🎓 Obtener programas académicos activos
   */
  getActivePrograms(): any[] {
    return this.settings.academic.offeredPrograms.filter(p => p.isActive);
  }

  /**
   * 📍 Obtener coordenadas GPS
   */
  getCoordinates(): { latitude: number; longitude: number } | null {
    if (this.latitude && this.longitude) {
      return {
        latitude: this.latitude,
        longitude: this.longitude,
      };
    }
    return null;
  }

  /**
   * 🏗️ Agregar nueva instalación
   */
  addFacility(facility: {
    name: string;
    type: 'classroom' | 'lab' | 'library' | 'auditorium' | 'gym' | 'cafeteria' | 'office' | 'other';
    capacity: number;
    equipment?: string[];
    bookable?: boolean;
    description?: string;
  }): void {
    const newFacility = {
      id: Date.now().toString(), // En producción usar UUID
      ...facility,
      equipment: facility.equipment || [],
      bookable: facility.bookable || false,
    };
    
    this.settings.operations.facilities.push(newFacility);
  }

  /**
   * 🗑️ Eliminar instalación
   */
  removeFacility(facilityId: string): boolean {
    const initialLength = this.settings.operations.facilities.length;
    this.settings.operations.facilities = this.settings.operations.facilities.filter(f => f.id !== facilityId);
    return this.settings.operations.facilities.length < initialLength;
  }

  /**
   * 📚 Agregar programa académico
   */
  addAcademicProgram(program: {
    name: string;
    level: 'elementary' | 'middle' | 'high' | 'undergraduate' | 'graduate' | 'doctorate' | 'certificate';
    duration: number;
    credits?: number;
  }): void {
    const newProgram = {
      id: Date.now().toString(), // En producción usar UUID
      ...program,
      isActive: true,
    };
    
    this.settings.academic.offeredPrograms.push(newProgram);
  }

  /**
   * 📊 Actualizar estadísticas de la sucursal
   */
  updateStatistics(updates: Partial<BranchStatistics>): void {
    this.statistics = { ...this.statistics, ...updates };
    this.statisticsLastUpdated = new Date();
    
    // Actualizar contadores principales
    if (updates.users) {
      this.totalUsers = updates.users.total || this.totalUsers;
      this.activeStudents = updates.users.students || this.activeStudents;
      this.activeTeachers = updates.users.teachers || this.activeTeachers;
    }
  }

  /**
   * 🎯 Calcular tasa de utilización
   */
  getUtilizationRate(): number {
    const capacity = this.settings.operations.capacity;
    const current = this.activeStudents;
    return capacity.maxStudents > 0 ? (current / capacity.maxStudents) * 100 : 0;
  }

  /**
   * 💰 Calcular eficiencia financiera
   */
  getFinancialEfficiency(): number {
    const stats = this.statistics.financial;
    const totalRevenue = stats.revenue.tuition + stats.revenue.fees + stats.revenue.services + stats.revenue.other;
    const totalExpenses = stats.expenses.salaries + stats.expenses.utilities + stats.expenses.maintenance + stats.expenses.supplies + stats.expenses.other;
    
    return totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;
  }

  /**
   * 📈 Obtener resumen de rendimiento
   */
  getPerformanceSummary(): any {
    return {
      utilization: this.getUtilizationRate(),
      financialEfficiency: this.getFinancialEfficiency(),
      attendance: this.statistics.performance.attendance,
      satisfaction: this.statistics.performance.satisfaction,
      safetyScore: this.statistics.performance.safety.safetyScore,
      academicPerformance: {
        completionRates: this.statistics.academic.completionRates,
        gradeDistribution: this.statistics.academic.gradeDistribution,
      },
    };
  }

  /**
   * 📄 Obtener resumen para API
   */
  getApiSummary(): any {
    return {
      id: this.id,
      institutionId: this.institutionId,
      code: this.code,
      name: this.name,
      shortName: this.shortName,
      type: this.type,
      status: this.status,
      size: this.size,
      address: this.address,
      city: this.city,
      state: this.state,
      country: this.country,
      contactEmail: this.contactEmail,
      contactPhone: this.contactPhone,
      coordinates: this.getCoordinates(),
      totalUsers: this.totalUsers,
      activeStudents: this.activeStudents,
      activeTeachers: this.activeTeachers,
      activeClassrooms: this.activeClassrooms,
      utilizationRate: this.getUtilizationRate(),
      isOperational: this.isOperational(),
      isCurrentlyOpen: this.isCurrentlyOpen(),
      facilities: this.getFacilities().length,
      programs: this.getActivePrograms().length,
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
      settings: {
        operatingHours: this.settings.operations.operatingHours,
        capacity: this.settings.operations.capacity,
        facilities: this.getFacilities(),
        programs: this.getActivePrograms(),
      },
    };
  }
}