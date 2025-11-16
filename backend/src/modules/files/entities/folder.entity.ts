/**
 * 📁 ENTIDAD FOLDER - ORGANIZACIÓN JERÁRQUICA DE ARCHIVOS
 * 
 * Entidad para la gestión de carpetas y organización jerárquica de archivos.
 * Permite crear estructuras de directorios para organizar recursos educativos.
 * 
 * FUNCIONALIDADES:
 * - Estructura jerárquica de carpetas
 * - Herencia de permisos desde carpetas padre
 * - Organización por contexto educativo
 * - Breadcrumbs automáticos
 * - Estadísticas de contenido
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
  Index,
  Tree,
  TreeParent,
  TreeChildren,
} from 'typeorm';
import { AccessLevel } from './access-level.enum';

export { AccessLevel } from './access-level.enum';

interface FolderFile {
  size?: number;
  fileType?: string;
  filename?: string;
  displayName?: string;
  description?: string;
  searchableContent?: string;
}

/**
 * 📋 Enumeraciones para tipado fuerte
 */
export enum FolderType {
  ROOT = 'root',                 // Carpeta raíz
  CLASSROOM = 'classroom',       // Carpeta de aula
  SUBJECT = 'subject',           // Carpeta de materia
  LESSON = 'lesson',             // Carpeta de lección
  ASSIGNMENT = 'assignment',     // Carpeta de tarea
  RESOURCE = 'resource',         // Carpeta de recursos
  TEMPLATE = 'template',         // Carpeta de plantillas
  ARCHIVE = 'archive',           // Carpeta de archivo
  PERSONAL = 'personal',         // Carpeta personal
  SHARED = 'shared',             // Carpeta compartida
}

export enum FolderStatus {
  ACTIVE = 'active',             // Carpeta activa
  ARCHIVED = 'archived',         // Carpeta archivada
  DELETED = 'deleted',           // Carpeta eliminada (soft delete)
  LOCKED = 'locked',             // Carpeta bloqueada
}

export enum FolderVisibility {
  HIDDEN = 'hidden',             // No aparece en listados
  PRIVATE = 'private',           // Solo visible para el propietario
  SHARED = 'shared',             // Visible para usuarios con permisos
  PUBLIC = 'public',             // Visible en listados públicos
}

export enum FolderPurpose {
  GENERAL = 'general',           // Uso general
  COURSE_MATERIAL = 'course_material', // Material del curso
  ASSIGNMENTS = 'assignments',   // Tareas y trabajos
  RESOURCES = 'resources',       // Recursos educativos
  TEMPLATES = 'templates',       // Plantillas
  ARCHIVE = 'archive',           // Archivo histórico
}

/**
 * 🔒 Configuración de permisos de carpeta
 */
export interface FolderPermissions {
  inheritFromParent: boolean;    // Heredar permisos del padre
  canRead: string[];             // IDs de usuarios que pueden leer
  canWrite: string[];            // IDs de usuarios que pueden escribir
  canDelete: string[];           // IDs de usuarios que pueden eliminar
  canShare: string[];            // IDs de usuarios que pueden compartir
  canCreateSubfolders: string[]; // IDs de usuarios que pueden crear subcarpetas
  users?: {                      // Permisos por usuario específico
    [userId: string]: string[];
  };
  rolePermissions: {             // Permisos por rol
    [role: string]: {
      read: boolean;
      write: boolean;
      delete: boolean;
      share: boolean;
      createSubfolders: boolean;
    };
  };
}

/**
 * 📊 Estadísticas de la carpeta
 */
export interface FolderStatistics {
  totalFiles: number;            // Total de archivos
  totalSubfolders: number;       // Total de subcarpetas
  totalSize: number;             // Tamaño total en bytes
  fileTypes: {                   // Distribución por tipo de archivo
    [type: string]: number;
  };
  lastActivity: Date;            // Última actividad
  popularityScore: number;       // Puntuación de popularidad
}

/**
 * 📁 Entidad Folder
 * 
 * Representa una carpeta en el sistema de archivos con organización jerárquica.
 */
@Entity('folders')
@Tree('materialized-path')
@Index(['ownerId', 'status'])
@Index(['classroomId', 'status'])
@Index(['institutionId', 'status'])
@Index(['parentId', 'status'])
@Index(['folderType', 'status'])
@Index(['name']) // Para búsquedas por nombre
export class Folder {
  /**
   * 🔑 Identificador único de la carpeta
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * 🏷️ Nombre de la carpeta
   */
  @Column({ type: 'varchar', length: 255 })
  name: string;

  /**
   * 📝 Descripción de la carpeta
   */
  @Column({ type: 'text', nullable: true })
  description: string;

  /**
   * 📂 Tipo de carpeta
   */
  @Column({
    type: 'enum',
    enum: FolderType,
    default: FolderType.RESOURCE,
  })
  @Index()
  folderType: FolderType;

  /**
   * 📊 Estado de la carpeta
   */
  @Column({
    type: 'enum',
    enum: FolderStatus,
    default: FolderStatus.ACTIVE,
  })
  status: FolderStatus;

  /**
   * 🔒 Nivel de acceso
   */
  @Column({
    type: 'enum',
    enum: AccessLevel,
    default: AccessLevel.PRIVATE,
  })
  accessLevel: AccessLevel;

  /**
   * 👤 ID del propietario de la carpeta
   */
  @Column({ type: 'uuid' })
  @Index()
  ownerId: string;

  /**
   * 🏫 ID del aula asociada (opcional)
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  classroomId: string;

  /**
   * 🏛️ ID de la institución
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  institutionId: string;

  /**
   * 📁 ID de la carpeta padre
   */
  @Column({ type: 'uuid', nullable: true })
  @Index()
  parentId: string;

  /**
   * 🛤️ Ruta completa de la carpeta (breadcrumb)
   */
  @Column({ type: 'text', nullable: true })
  fullPath: string;

  /**
   * 📊 Nivel de profundidad en la jerarquía
   */
  @Column({ type: 'integer', default: 0 })
  depth: number;

  /**
   * 🔢 Orden dentro de la carpeta padre
   */
  @Column({ type: 'integer', default: 0 })
  sortOrder: number;

  /**
   * 👤 ID del usuario creador (alias para ownerId)
   */
  get createdById(): string {
    return this.ownerId;
  }

  set createdById(value: string) {
    this.ownerId = value;
  }

  /**
   * 👁️ Visibilidad de la carpeta
   */
  @Column({
    type: 'enum',
    enum: FolderVisibility,
    default: FolderVisibility.PRIVATE,
  })
  visibility: FolderVisibility;

  /**
   * 🎯 Propósito de la carpeta
   */
  @Column({
    type: 'enum',
    enum: FolderPurpose,
    default: FolderPurpose.GENERAL,
  })
  purpose: FolderPurpose;

  /**
   * ✅ Si la carpeta está activa (alias para status === ACTIVE)
   */
  get isActive(): boolean {
    return this.status === FolderStatus.ACTIVE;
  }

  /**
   * 🔒 Configuración de permisos detallados
   */
  @Column({
    type: 'jsonb',
    default: {
      inheritFromParent: true,
      canRead: [],
      canWrite: [],
      canDelete: [],
      canShare: [],
      canCreateSubfolders: [],
      rolePermissions: {},
    },
  })
  permissions: FolderPermissions;

  /**
   * 📈 Estadísticas de la carpeta
   */
  @Column({
    type: 'jsonb',
    default: {
      totalFiles: 0,
      totalSubfolders: 0,
      totalSize: 0,
      fileTypes: {},
      lastActivity: null,
      popularityScore: 0,
    },
  })
  statistics: FolderStatistics;

  /**
   * 🏷️ Etiquetas para categorización
   */
  @Column({
    type: 'jsonb',
    default: [],
  })
  tags: string[];

  /**
   * 📋 Metadata adicional
   */
  @Column({
    type: 'jsonb',
    default: {},
  })
  metadata: any;

  /**
   * 🎨 Color de la carpeta (hex)
   */
  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string;

  /**
   * 🖼️ Icono personalizado
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  icon: string;

  /**
   * ⭐ Carpeta favorita/destacada
   */
  @Column({ type: 'boolean', default: false })
  isFavorite: boolean;

  /**
   * 📌 Carpeta fijada (aparece primero)
   */
  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  /**
   * 🌍 Carpeta pública
   */
  @Column({ type: 'boolean', default: false })
  isPublic: boolean;

  /**
   * 🔒 Carpeta protegida (no se puede eliminar)
   */
  @Column({ type: 'boolean', default: false })
  isProtected: boolean;

  /**
   * 📱 Sincronizada con dispositivos móviles
   */
  @Column({ type: 'boolean', default: false })
  isSynced: boolean;

  /**
   * ⏰ Fecha de creación
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * 🔄 Fecha de última actualización
   */
  @UpdateDateColumn()
  updatedAt: Date;

  // =============================================================================
  // RELACIONES JERÁRQUICAS
  // =============================================================================

  /**
   * 📁 Carpeta padre
   */
  @TreeParent()
  parent: Folder;

  /**
   * 📂 Carpetas hijas
   */
  @TreeChildren()
  children: Folder[];

  // =============================================================================
  // RELACIONES CON OTRAS ENTIDADES
  // =============================================================================

  /**
   * 📄 Archivos contenidos en esta carpeta
   */
  files?: FolderFile[];

  /**
   * 💬 Comentarios sobre la carpeta
   */
  comments?: any[];

  /**
   * 📊 Logs de acceso a la carpeta
   */
  accessLogs?: any[];

  // =============================================================================
  // MÉTODOS DE NEGOCIO
  // =============================================================================

  /**
   * 🔒 Verificar si un usuario puede acceder a la carpeta
   */
  canUserAccess(userId: string, userRole: string): boolean {
    // El propietario siempre puede acceder
    if (this.ownerId === userId) {
      return true;
    }

    // Verificar estado de la carpeta
    if (this.status !== FolderStatus.ACTIVE) {
      return false;
    }

    // Verificar nivel de acceso
    switch (this.accessLevel) {
      case AccessLevel.PUBLIC:
        return true;

      case AccessLevel.INSTITUTION:
        // TODO: Verificar membresía institucional
        return true;

      case AccessLevel.CLASSROOM:
        // TODO: Verificar membresía del aula
        return this.classroomId !== null;

      case AccessLevel.PRIVATE:
        return this.permissions.canRead.includes(userId);
    }

    // Verificar permisos por rol
    const rolePermission = this.permissions.rolePermissions[userRole];
    if (rolePermission && rolePermission.read) {
      return true;
    }

    return false;
  }

  /**
   * ✏️ Verificar si un usuario puede editar la carpeta
   */
  canUserEdit(userId: string, userRole: string): boolean {
    // El propietario siempre puede editar
    if (this.ownerId === userId) {
      return true;
    }

    // Carpetas protegidas solo pueden ser editadas por admins
    if (this.isProtected && userRole !== 'admin') {
      return false;
    }

    // Admins pueden editar cualquier carpeta
    if (userRole === 'admin') {
      return true;
    }

    // Verificar permisos específicos
    if (this.permissions.canWrite.includes(userId)) {
      return true;
    }

    // Verificar permisos por rol
    const rolePermission = this.permissions.rolePermissions[userRole];
    return rolePermission ? rolePermission.write : false;
  }

  /**
   * 🗑️ Verificar si un usuario puede eliminar la carpeta
   */
  canUserDelete(userId: string, userRole: string): boolean {
    // Carpetas protegidas no se pueden eliminar
    if (this.isProtected) {
      return false;
    }

    // Carpetas raíz no se pueden eliminar
    if (this.folderType === FolderType.ROOT) {
      return false;
    }

    // El propietario siempre puede eliminar
    if (this.ownerId === userId) {
      return true;
    }

    // Admins pueden eliminar cualquier carpeta no protegida
    if (userRole === 'admin') {
      return true;
    }

    // Verificar permisos específicos
    if (this.permissions.canDelete.includes(userId)) {
      return true;
    }

    // Verificar permisos por rol
    const rolePermission = this.permissions.rolePermissions[userRole];
    return rolePermission ? rolePermission.delete : false;
  }

  /**
   * 📊 Actualizar estadísticas de la carpeta
   */
  async updateStatistics(): Promise<void> {
    // Resetear estadísticas
    this.statistics.totalFiles = 0;
    this.statistics.totalSubfolders = 0;
    this.statistics.totalSize = 0;
    this.statistics.fileTypes = {};

    // Contar archivos directos
    if (this.files) {
      this.statistics.totalFiles = this.files.length;
      this.statistics.totalSize = this.files.reduce((sum, file) => sum + file.size, 0);

      // Contar tipos de archivos
      this.files.forEach(file => {
        const type = file.fileType;
        this.statistics.fileTypes[type] = (this.statistics.fileTypes[type] || 0) + 1;
      });
    }

    // Contar subcarpetas
    if (this.children) {
      this.statistics.totalSubfolders = this.children.length;

      // Sumar estadísticas de subcarpetas recursivamente
      for (const child of this.children) {
        await child.updateStatistics();
        this.statistics.totalFiles += child.statistics.totalFiles;
        this.statistics.totalSize += child.statistics.totalSize;
        this.statistics.totalSubfolders += child.statistics.totalSubfolders;

        // Agregar tipos de archivos de subcarpetas
        Object.entries(child.statistics.fileTypes).forEach(([type, count]) => {
          this.statistics.fileTypes[type] = (this.statistics.fileTypes[type] || 0) + count;
        });
      }
    }

    this.statistics.lastActivity = new Date();
  }

  /**
   * �️ Construir ruta completa (breadcrumb)
   */
  buildFullPath(): string {
    if (!this.parent) {
      return this.name;
    }

    return `${this.parent.buildFullPath()}/${this.name}`;
  }

  /**
   * �🔍 Buscar archivos en la carpeta y subcarpetas
   */
  searchFiles(query: string, options: {
    recursive?: boolean;
    fileTypes?: string[];
    maxResults?: number;
  } = {}): FolderFile[] {
    const results: FolderFile[] = [];
    const { recursive = true, fileTypes, maxResults = 100 } = options;

    // Buscar en archivos directos
    if (this.files) {
      for (const file of this.files) {
        if (results.length >= maxResults) break;

        const matchesQuery = 
          file.filename.toLowerCase().includes(query.toLowerCase()) ||
          file.displayName.toLowerCase().includes(query.toLowerCase()) ||
          (file.description && file.description.toLowerCase().includes(query.toLowerCase())) ||
          (file.searchableContent && file.searchableContent.toLowerCase().includes(query.toLowerCase()));

        const matchesType = !fileTypes || fileTypes.includes(file.fileType);

        if (matchesQuery && matchesType) {
          results.push(file);
        }
      }
    }

    // Buscar recursivamente en subcarpetas
    if (recursive && this.children && results.length < maxResults) {
      for (const child of this.children) {
        const childResults = child.searchFiles(query, {
          recursive: true,
          fileTypes,
          maxResults: maxResults - results.length,
        });
        results.push(...childResults);
        
        if (results.length >= maxResults) break;
      }
    }

    return results;
  }

  /**
   * 📈 Calcular puntuación de popularidad
   */
  calculatePopularityScore(): number {
    const fileCountWeight = 0.3;
    const sizeWeight = 0.2;
    const activityWeight = 0.5;

    const fileScore = this.statistics.totalFiles * fileCountWeight;
    const sizeScore = Math.log(this.statistics.totalSize + 1) * sizeWeight;
    
    // Calcular puntuación de actividad basada en última actividad
    const daysSinceActivity = this.statistics.lastActivity
      ? (Date.now() - this.statistics.lastActivity.getTime()) / (1000 * 60 * 60 * 24)
      : 365;
    const activityScore = Math.max(0, (365 - daysSinceActivity) / 365) * activityWeight;

    this.statistics.popularityScore = fileScore + sizeScore + activityScore;
    return this.statistics.popularityScore;
  }

  /**
   * 🎨 Obtener icono de la carpeta
   */
  getIcon(): string {
    if (this.icon) {
      return this.icon;
    }

    switch (this.folderType) {
      case FolderType.ROOT:
        return '🏠';
      case FolderType.CLASSROOM:
        return '🎓';
      case FolderType.SUBJECT:
        return '📚';
      case FolderType.LESSON:
        return '📖';
      case FolderType.ASSIGNMENT:
        return '📝';
      case FolderType.RESOURCE:
        return '📁';
      case FolderType.TEMPLATE:
        return '📋';
      case FolderType.ARCHIVE:
        return '🗄️';
      case FolderType.PERSONAL:
        return '👤';
      case FolderType.SHARED:
        return '👥';
      default:
        return '📁';
    }
  }

  /**
   * 🏷️ Obtener nombre de tipo legible
   */
  getTypeLabel(): string {
    switch (this.folderType) {
      case FolderType.ROOT:
        return 'Carpeta Raíz';
      case FolderType.CLASSROOM:
        return 'Carpeta de Aula';
      case FolderType.SUBJECT:
        return 'Carpeta de Materia';
      case FolderType.LESSON:
        return 'Carpeta de Lección';
      case FolderType.ASSIGNMENT:
        return 'Carpeta de Tarea';
      case FolderType.RESOURCE:
        return 'Carpeta de Recursos';
      case FolderType.TEMPLATE:
        return 'Carpeta de Plantillas';
      case FolderType.ARCHIVE:
        return 'Carpeta de Archivo';
      case FolderType.PERSONAL:
        return 'Carpeta Personal';
      case FolderType.SHARED:
        return 'Carpeta Compartida';
      default:
        return 'Carpeta';
    }
  }

  /**
   * 📏 Obtener tamaño total formateado
   */
  getFormattedSize(): string {
    const bytes = this.statistics.totalSize;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    if (bytes === 0) return '0 Bytes';
    
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * ✨ Serialización para API
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      folderType: this.folderType,
      typeLabel: this.getTypeLabel(),
      status: this.status,
      accessLevel: this.accessLevel,
      ownerId: this.ownerId,
      classroomId: this.classroomId,
      institutionId: this.institutionId,
      parentId: this.parentId,
      fullPath: this.fullPath || this.buildFullPath(),
      depth: this.depth,
      sortOrder: this.sortOrder,
      permissions: this.permissions,
      statistics: {
        ...this.statistics,
        formattedSize: this.getFormattedSize(),
      },
      tags: this.tags,
      metadata: this.metadata,
      color: this.color,
      icon: this.getIcon(),
      isFavorite: this.isFavorite,
      isPinned: this.isPinned,
      isPublic: this.isPublic,
      isProtected: this.isProtected,
      isSynced: this.isSynced,
      popularityScore: this.calculatePopularityScore(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * 📍 Obtener ruta completa de la carpeta
   */
  getFullPath(): string {
    return this.fullPath || this.buildFullPath();
  }

  /**
   * 📊 Obtener profundidad de la carpeta
   */
  getDepth(): number {
    return this.depth;
  }

  /**
   * 📈 Calcular estadísticas (alias para updateStatistics)
   */
  async calculateStatistics(): Promise<void> {
    return this.updateStatistics();
  }
}