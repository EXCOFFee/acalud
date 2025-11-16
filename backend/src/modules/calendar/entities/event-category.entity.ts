/**
 * 🏷️ ENTIDAD EVENT CATEGORY - CATEGORIZACIÓN DE EVENTOS
 * 
 * Sistema de categorías para organizar y clasificar eventos del calendario.
 * Permite jerarquías, colores personalizados y configuraciones específicas.
 * 
 * FUNCIONALIDADES:
 * - Categorías jerárquicas (padre-hijo)
 * - Colores e iconos personalizados
 * - Configuraciones por categoría
 * - Permisos y visibilidad
 * - Estadísticas de uso
 * 
 * CASOS DE USO:
 * - "Clases de Matemáticas" (color azul, icono 📐)
 * - "Exámenes Finales" (color rojo, alta prioridad)
 * - "Reuniones Académicas" (color verde, para profesores)
 * - "Eventos Sociales" (color púrpura, público)
 * 
 * @author Sistema de Gestión Académica
 * @version 1.0.0
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Tree,
  TreeParent,
  TreeChildren,
} from 'typeorm';
// Nota: Import se habilitará cuando la entidad esté disponible
// import { User } from '../../users/entities/user.entity';
import { Event } from './event.entity';

/**
 * 🎨 Enumeraciones para tipado fuerte
 */
export enum CategoryVisibility {
  PUBLIC = 'public',      // Visible para todos
  PRIVATE = 'private',    // Solo para el creador
  RESTRICTED = 'restricted', // Solo para roles específicos
  CLASSROOM = 'classroom', // Solo para miembros del aula
}

export enum CategoryStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

/**
 * 🏷️ Entidad EventCategory con estructura jerárquica
 */
@Entity('event_categories')
@Tree('nested-set') // Para consultas jerárquicas eficientes
@Index(['name', 'createdBy'])
@Index(['status', 'visibility'])
export class EventCategory {
  /**
   * 🆔 Identificador único de la categoría
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 📝 Información básica de la categoría
   */
  @Column({ length: 100 })
  @Index()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  shortCode?: string; // Código corto para identificación rápida

  /**
   * 🎨 Configuración visual
   */
  @Column({ type: 'varchar', length: 7, default: '#6B7280' })
  color: string; // Color en formato hex

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon?: string; // Emoji o nombre de icono

  @Column({ type: 'varchar', length: 100, nullable: true })
  iconUrl?: string; // URL de icono personalizado

  /**
   * 📊 Estado y visibilidad
   */
  @Column({
    type: 'enum',
    enum: CategoryStatus,
    default: CategoryStatus.ACTIVE,
  })
  status: CategoryStatus;

  @Column({
    type: 'enum',
    enum: CategoryVisibility,
    default: CategoryVisibility.PUBLIC,
  })
  visibility: CategoryVisibility;

  /**
   * ⚙️ Configuraciones de la categoría
   */
  @Column({ type: 'json', nullable: true })
  settings?: {
    defaultDuration?: number; // Duración por defecto en minutos
    allowRecurrence?: boolean;
    requireApproval?: boolean;
    autoReminders?: boolean;
    reminderMinutes?: number[];
    maxEventsPerDay?: number;
    allowedRoles?: string[];
    notificationSettings?: {
      email?: boolean;
      inApp?: boolean;
      sms?: boolean;
      push?: boolean;
    };
  };

  /**
   * 📈 Estadísticas de uso
   */
  @Column({ type: 'int', default: 0 })
  eventCount: number; // Contador de eventos en esta categoría

  @Column({ type: 'timestamp', nullable: true })
  lastUsedAt?: Date;

  /**
   * 🔗 Relaciones jerárquicas
   */
  
  // Categoría padre (para jerarquías)
  @TreeParent()
  parent?: EventCategory;

  // Categorías hijas
  @TreeChildren()
  children?: EventCategory[];

  /**
   * 🔗 Relaciones con otras entidades
   */

  // Creador de la categoría
  @Column({ type: 'uuid' })
  @Index()
  createdBy: string;

  // Usuario que realizó la última actualización
  @Column({ type: 'uuid', nullable: true })
  updatedBy?: string;

  // Nota: Relación con User se habilitará cuando esté disponible
  // @ManyToOne(() => User, { eager: false })
  // @JoinColumn({ name: 'createdBy' })
  // creator: User;

  // Eventos que pertenecen a esta categoría
  @OneToMany(() => Event, event => event.category, { eager: false })
  events: Event[];

  /**
   * 🏷️ Metadatos adicionales
   */
  @Column({ type: 'json', nullable: true })
  metadata?: {
    tags?: string[];
    customFields?: Record<string, unknown>;
    integrations?: Record<string, unknown>;
    permissions?: {
      canView?: string[];
      canCreate?: string[];
      canEdit?: string[];
      canDelete?: string[];
    };
  };

  /**
   * 🕒 Timestamps automáticos
   */
  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * 🧮 Propiedades calculadas
   */

  /**
   * Obtiene el path completo de la categoría (incluyendo padres)
   */
  get fullPath(): string {
    const buildPath = (category: EventCategory, path: string[] = []): string[] => {
      path.unshift(category.name);
      if (category.parent) {
        return buildPath(category.parent, path);
      }
      return path;
    };
    
    return buildPath(this).join(' > ');
  }

  /**
   * Verifica si la categoría está activa
   */
  get isActive(): boolean {
    return this.status === CategoryStatus.ACTIVE;
  }

  /**
   * Verifica si la categoría es visible públicamente
   */
  get isPublic(): boolean {
    return this.visibility === CategoryVisibility.PUBLIC;
  }

  /**
   * Obtiene el nivel de jerarquía (0 = raíz)
   */
  get hierarchyLevel(): number {
    let level = 0;
    let current = this.parent;
    while (current) {
      level++;
      current = current.parent;
    }
    return level;
  }

  /**
   * 🔧 Métodos de utilidad
   */

  /**
   * Verifica si el usuario tiene permiso para usar esta categoría
   */
  canBeUsedBy(userId: string, userRole: string): boolean {
    // El creador siempre puede usar la categoría
    if (this.createdBy === userId) {
      return true;
    }

    // Verificar por visibilidad
    if (this.visibility === CategoryVisibility.PRIVATE) {
      return false;
    }

    if (this.visibility === CategoryVisibility.PUBLIC) {
      return this.isActive;
    }

    // Verificar permisos específicos
    if (this.metadata?.permissions?.canCreate) {
      return this.metadata.permissions.canCreate.includes(userRole) ||
             this.metadata.permissions.canCreate.includes(userId);
    }

    // Si tiene configuración de roles permitidos
    if (this.settings?.allowedRoles) {
      return this.settings.allowedRoles.includes(userRole);
    }

    return this.isActive;
  }

  /**
   * Actualiza el contador de eventos
   */
  updateEventCount(increment: number = 1): void {
    this.eventCount = Math.max(0, this.eventCount + increment);
    this.lastUsedAt = new Date();
  }

  /**
   * Obtiene la configuración por defecto para eventos de esta categoría
   */
  getDefaultEventSettings(): Partial<Event> {
    const settings = this.settings || {};
    
    return {
      // Duración por defecto (si está configurada)
      ...(settings.defaultDuration && {
        endDate: new Date(Date.now() + settings.defaultDuration * 60 * 1000)
      }),
      
      // Configuración de notificaciones
      notificationSettings: {
        email: settings.notificationSettings?.email ?? true,
        inApp: settings.notificationSettings?.inApp ?? true,
        sms: settings.notificationSettings?.sms ?? false,
        push: settings.notificationSettings?.push ?? true,
        reminderMinutes: settings.reminderMinutes || [15, 60], // 15 min y 1 hora antes
      },
      
      // Metadatos visuales
      metadata: {
        color: this.color,
        icon: this.icon,
        tags: [this.name],
      },
    };
  }

  /**
   * Obtiene todas las categorías hijas (recursivamente)
   */
  getAllDescendants(): EventCategory[] {
    const descendants: EventCategory[] = [];
    
    const collectDescendants = (category: EventCategory) => {
      if (category.children) {
        for (const child of category.children) {
          descendants.push(child);
          collectDescendants(child);
        }
      }
    };
    
    collectDescendants(this);
    return descendants;
  }

  /**
   * Verifica si esta categoría es ancestro de otra
   */
  isAncestorOf(category: EventCategory): boolean {
    let current = category.parent;
    while (current) {
      if (current.id === this.id) {
        return true;
      }
      current = current.parent;
    }
    return false;
  }

  /**
   * Genera código corto automático si no existe
   */
  generateShortCode(): string {
    if (this.shortCode) {
      return this.shortCode;
    }

    // Tomar las primeras letras de cada palabra
    const words = this.name.split(' ');
    let code = '';
    
    for (const word of words) {
      if (word.length > 0) {
        code += word.charAt(0).toUpperCase();
      }
      if (code.length >= 4) break;
    }
    
    // Si es muy corto, agregar más caracteres
    if (code.length < 2 && this.name.length >= 2) {
      code = this.name.substring(0, 3).toUpperCase();
    }
    
    return code || 'CAT';
  }

  /**
   * Convierte la categoría a formato de exportación
   */
  toExportFormat(): object {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      shortCode: this.shortCode,
      color: this.color,
      icon: this.icon,
      fullPath: this.fullPath,
      hierarchyLevel: this.hierarchyLevel,
      status: this.status,
      visibility: this.visibility,
      eventCount: this.eventCount,
      settings: this.settings,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}