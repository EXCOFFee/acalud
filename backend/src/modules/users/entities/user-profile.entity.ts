/**
 * 👤 ENTIDAD DE PERFIL DE USUARIO - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Representa el perfil personalizable de un usuario:
 * - Información personal extendida
 * - Avatar y personalización visual
 * - Configuraciones de privacidad
 * - Preferencias del sistema
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Responsabilidad única de gestionar perfiles de usuario
 * - OCP: Extensible para nuevos campos de perfil
 * - LSP: Implementa correctamente la interfaz de entidad de TypeORM
 * - ISP: No fuerza dependencias innecesarias
 * - DIP: Depende de abstracciones (decoradores de TypeORM)
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../user.entity';

/**
 * Tipos de tema visual disponibles
 */
export enum ThemeType {
  LIGHT = 'light',           // Tema claro
  DARK = 'dark',            // Tema oscuro
  AUTO = 'auto',            // Automático según sistema
  BLUE = 'blue',            // Tema azul
  GREEN = 'green',          // Tema verde
  PURPLE = 'purple',        // Tema morado
}

/**
 * Niveles de privacidad del perfil
 */
export enum PrivacyLevel {
  PUBLIC = 'public',         // Perfil completamente público
  FRIENDS = 'friends',       // Solo visible para amigos/compañeros
  PRIVATE = 'private',       // Solo visible para el usuario
}

/**
 * Idiomas soportados por la plataforma
 */
export enum Language {
  ES = 'es',                // Español
  EN = 'en',                // Inglés
  FR = 'fr',                // Francés
  PT = 'pt',                // Portugués
}

/**
 * Tipos de notificaciones disponibles
 */
export enum NotificationType {
  EMAIL = 'email',           // Notificaciones por email
  PUSH = 'push',            // Notificaciones push
  IN_APP = 'in_app',        // Notificaciones en la app
}

/**
 * Entidad UserProfile - Almacena información extendida del perfil de usuario
 * 
 * @description Esta entidad maneja toda la información personalizable del usuario,
 * incluyendo configuraciones de privacidad, preferencias visuales, y datos personales
 * extendidos.
 * 
 * @example
 * ```typescript
 * const profile = new UserProfile();
 * profile.displayName = 'Juan Pérez';
 * profile.bio = 'Estudiante de matemáticas';
 * profile.theme = ThemeType.DARK;
 * profile.language = Language.ES;
 * await profileRepository.save(profile);
 * ```
 */
@Entity('user_profiles')
@Index(['userId'], { unique: true })
@Index(['displayName'])
@Index(['isPublic'])
export class UserProfile {
  /**
   * ID único del perfil
   */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Relación uno a uno con el usuario
   * 
   * @description Cada usuario tiene exactamente un perfil
   */
  @OneToOne(() => User, user => user.profile, { 
    onDelete: 'CASCADE',
    eager: true 
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * ID del usuario (para consultas optimizadas)
   */
  @Column({ name: 'user_id' })
  userId: string;

  // =============================================================================
  // INFORMACIÓN PERSONAL
  // =============================================================================

  /**
   * Nombre para mostrar públicamente
   * 
   * @description Puede ser diferente al nombre real del usuario
   * @maxLength 100
   * @example "JuanMat2023"
   */
  @Column({ length: 100, nullable: true })
  displayName?: string;

  /**
   * Biografía o descripción personal
   * 
   * @description Texto libre que describe al usuario
   * @maxLength 500
   * @example "Estudiante de ingeniería, me encantan las matemáticas y la programación"
   */
  @Column({ type: 'text', nullable: true })
  bio?: string;

  /**
   * Fecha de nacimiento
   * 
   * @description Usada para cálculos de edad y contenido apropiado
   * @privacy Solo visible según configuración de privacidad
   */
  @Column({ type: 'date', nullable: true })
  birthDate?: Date;

  /**
   * Ubicación del usuario
   * 
   * @description Ciudad, país o región
   * @maxLength 100
   * @example "Buenos Aires, Argentina"
   */
  @Column({ length: 100, nullable: true })
  location?: string;

  /**
   * Sitio web personal o portfolio
   * 
   * @description URL del sitio web personal del usuario
   * @maxLength 255
   * @example "https://miportfolio.com"
   */
  @Column({ length: 255, nullable: true })
  website?: string;

  /**
   * Redes sociales del usuario
   * 
   * @description JSON con enlaces a redes sociales
   * @example { "twitter": "@usuario", "linkedin": "linkedin.com/in/usuario" }
   */
  @Column({ type: 'json', nullable: true })
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    github?: string;
    instagram?: string;
    facebook?: string;
  };

  // =============================================================================
  // PERSONALIZACIÓN VISUAL
  // =============================================================================

  /**
   * URL del avatar del usuario
   * 
   * @description Ruta al archivo de imagen del avatar
   * @maxLength 500
   * @example "/uploads/avatars/user-123.jpg"
   */
  @Column({ length: 500, nullable: true })
  avatarUrl?: string;

  /**
   * URL de la imagen de portada del perfil
   * 
   * @description Banner o imagen de fondo del perfil
   * @maxLength 500
   * @example "/uploads/covers/user-123-cover.jpg"
   */
  @Column({ length: 500, nullable: true })
  coverImageUrl?: string;

  /**
   * Tema visual preferido
   * 
   * @description Determina el esquema de colores de la interfaz
   * @default ThemeType.AUTO
   */
  @Column({
    type: 'enum',
    enum: ThemeType,
    default: ThemeType.AUTO,
  })
  theme: ThemeType;

  /**
   * Color primario personalizado
   * 
   * @description Color hexadecimal para personalización adicional
   * @maxLength 7
   * @example "#3B82F6"
   */
  @Column({ length: 7, nullable: true })
  primaryColor?: string;

  /**
   * Configuración de fuente
   * 
   * @description Tamaño y tipo de fuente preferida
   * @example { "size": "medium", "family": "Inter" }
   */
  @Column({ type: 'json', nullable: true })
  fontSettings?: {
    size: 'small' | 'medium' | 'large';
    family: string;
  };

  // =============================================================================
  // CONFIGURACIONES DE PRIVACIDAD
  // =============================================================================

  /**
   * Indica si el perfil es público
   * 
   * @description Controla la visibilidad general del perfil
   * @default true
   */
  @Column({ default: true })
  isPublic: boolean;

  /**
   * Nivel de privacidad del perfil
   * 
   * @description Controla qué información es visible y para quién
   * @default PrivacyLevel.PUBLIC
   */
  @Column({
    type: 'enum',
    enum: PrivacyLevel,
    default: PrivacyLevel.PUBLIC,
  })
  privacyLevel: PrivacyLevel;

  /**
   * Configuraciones detalladas de privacidad
   * 
   * @description Controla la visibilidad de campos específicos
   * @example { "email": false, "birthDate": true, "location": true }
   */
  @Column({ type: 'json', default: {} })
  privacySettings: {
    showEmail?: boolean;
    showBirthDate?: boolean;
    showLocation?: boolean;
    showSocialLinks?: boolean;
    showStats?: boolean;
    allowMessages?: boolean;
    allowFriendRequests?: boolean;
  };

  // =============================================================================
  // PREFERENCIAS DEL SISTEMA
  // =============================================================================

  /**
   * Idioma preferido de la interfaz
   * 
   * @description Determina el idioma de la aplicación
   * @default Language.ES
   */
  @Column({
    type: 'enum',
    enum: Language,
    default: Language.ES,
  })
  language: Language;

  /**
   * Zona horaria del usuario
   * 
   * @description Usada para mostrar fechas y horarios correctos
   * @maxLength 50
   * @example "America/Argentina/Buenos_Aires"
   */
  @Column({ length: 50, nullable: true })
  timezone?: string;

  /**
   * Configuraciones de notificaciones
   * 
   * @description Controla qué notificaciones recibe y cómo
   * @example { "email": true, "push": false, "in_app": true }
   */
  @Column({ type: 'json', default: {} })
  notificationSettings: {
    [key in NotificationType]?: boolean;
  } & {
    newMessages?: boolean;
    classroomUpdates?: boolean;
    activityReminders?: boolean;
    achievementUnlocked?: boolean;
    friendRequests?: boolean;
    weeklyDigest?: boolean;
  };

  /**
   * Configuraciones de accesibilidad
   * 
   * @description Ajustes para mejorar la accesibilidad
   * @example { "highContrast": true, "fontSize": "large", "screenReader": false }
   */
  @Column({ type: 'json', nullable: true })
  accessibilitySettings?: {
    highContrast?: boolean;
    reducedMotion?: boolean;
    screenReaderOptimized?: boolean;
    keyboardNavigation?: boolean;
  };

  // =============================================================================
  // ESTADÍSTICAS Y LOGROS
  // =============================================================================

  /**
   * Estadísticas del perfil
   * 
   * @description Métricas y contadores del usuario
   * @example { "activitiesCompleted": 150, "badgesEarned": 25, "streakDays": 7 }
   */
  @Column({ type: 'json', default: {} })
  stats: {
    activitiesCompleted?: number;
    classroomsJoined?: number;
    badgesEarned?: number;
    pointsEarned?: number;
    streakDays?: number;
    totalStudyTime?: number; // en minutos
    averageScore?: number;
    favoritesCount?: number;
    followersCount?: number;
    followingCount?: number;
  };

  /**
   * Logros destacados del usuario
   * 
   * @description IDs de los logros que el usuario quiere mostrar
   * @example ["first_activity", "math_expert", "consistent_learner"]
   */
  @Column({ type: 'json', default: [] })
  featuredAchievements: string[];

  /**
   * Insignias personalizadas
   * 
   * @description Insignias especiales otorgadas por administradores
   * @example ["verified", "early_adopter", "contributor"]
   */
  @Column({ type: 'json', default: [] })
  customBadges: string[];

  // =============================================================================
  // METADATOS
  // =============================================================================

  /**
   * Fecha de última actualización del perfil
   * 
   * @description Usada para cacheo y sincronización
   */
  @Column({ type: 'timestamp', nullable: true })
  lastProfileUpdate?: Date;

  /**
   * Número de veces que se ha visto el perfil
   * 
   * @description Contador de visitas al perfil
   * @default 0
   */
  @Column({ default: 0 })
  profileViews: number;

  /**
   * Indica si el perfil está verificado
   * 
   * @description Marca de verificación para usuarios destacados
   * @default false
   */
  @Column({ default: false })
  isVerified: boolean;

  /**
   * Fecha de creación del registro
   */
  @CreateDateColumn()
  createdAt: Date;

  /**
   * Fecha de última actualización del registro
   */
  @UpdateDateColumn()
  updatedAt: Date;

  // =============================================================================
  // MÉTODOS DE NEGOCIO
  // =============================================================================

  /**
   * Calcula la edad del usuario basada en su fecha de nacimiento
   * 
   * @returns Edad en años o null si no hay fecha de nacimiento
   * 
   * @example
   * ```typescript
   * const age = profile.getAge();
   * console.log(`Usuario tiene ${age} años`);
   * ```
   */
  getAge(): number | null {
    if (!this.birthDate) {
      return null;
    }

    const today = new Date();
    const birth = new Date(this.birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return age;
  }

  /**
   * Verifica si el perfil está completo
   * 
   * @returns true si el perfil tiene la información básica completa
   * 
   * @example
   * ```typescript
   * if (profile.isComplete()) {
   *   // Mostrar insignia de perfil completo
   * }
   * ```
   */
  isComplete(): boolean {
    const requiredFields = [
      this.displayName,
      this.bio,
      this.avatarUrl,
    ];

    return requiredFields.every(field => field !== null && field !== undefined && field.trim().length > 0);
  }

  /**
   * Obtiene la configuración de privacidad para un campo específico
   * 
   * @param field Campo a verificar
   * @returns true si el campo es visible según la configuración
   * 
   * @example
   * ```typescript
   * if (profile.isFieldVisible('email')) {
   *   // Mostrar email en el perfil
   * }
   * ```
   */
  isFieldVisible(field: keyof UserProfile['privacySettings']): boolean {
    if (this.privacyLevel === PrivacyLevel.PRIVATE) {
      return false;
    }

    return this.privacySettings[field] !== false;
  }

  /**
   * Actualiza las estadísticas del perfil
   * 
   * @param updates Objeto con las estadísticas a actualizar
   * 
   * @example
   * ```typescript
   * profile.updateStats({
   *   activitiesCompleted: profile.stats.activitiesCompleted + 1,
   *   pointsEarned: profile.stats.pointsEarned + 100
   * });
   * ```
   */
  updateStats(updates: Partial<UserProfile['stats']>): void {
    this.stats = {
      ...this.stats,
      ...updates
    };
    this.lastProfileUpdate = new Date();
  }

  /**
   * Incrementa el contador de vistas del perfil
   * 
   * @example
   * ```typescript
   * profile.incrementViews();
   * await profileRepository.save(profile);
   * ```
   */
  incrementViews(): void {
    this.profileViews += 1;
  }

  /**
   * Obtiene el nombre a mostrar del usuario
   * 
   * @returns Nombre para mostrar o nombre real como fallback
   * 
   * @example
   * ```typescript
   * const displayName = profile.getDisplayName();
   * console.log(`Hola, ${displayName}!`);
   * ```
   */
  getDisplayName(): string {
    return this.displayName || this.user?.name || 'Usuario';
  }

  /**
   * Verifica si el usuario tiene configurado un avatar personalizado
   * 
   * @returns true si tiene avatar personalizado
   */
  hasCustomAvatar(): boolean {
    return !!(this.avatarUrl && !this.avatarUrl.includes('default'));
  }

  /**
   * Obtiene la URL del avatar o un avatar por defecto
   * 
   * @returns URL del avatar
   */
  getAvatarUrl(): string {
    return this.avatarUrl || `/api/avatars/default?name=${encodeURIComponent(this.getDisplayName())}`;
  }

  /**
   * Verifica si el perfil puede ser visto por otro usuario
   * 
   * @param viewerUserId ID del usuario que quiere ver el perfil
   * @returns true si el perfil es visible para el usuario
   */
  canBeViewedBy(viewerUserId?: string): boolean {
    // El propio usuario siempre puede ver su perfil
    if (viewerUserId === this.userId) {
      return true;
    }

    // Verificar nivel de privacidad
    switch (this.privacyLevel) {
      case PrivacyLevel.PUBLIC:
        return this.isPublic;
      
      case PrivacyLevel.FRIENDS:
        // TODO: Implementar lógica de amistad cuando esté disponible
        return false;
      
      case PrivacyLevel.PRIVATE:
        return false;
      
      default:
        return false;
    }
  }
}