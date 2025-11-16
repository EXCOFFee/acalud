/**
 * 📝 DTOs PARA PERFILES DE USUARIO - SIGUIENDO PRINCIPIOS SOLID
 * 
 * Data Transfer Objects para operaciones de perfiles:
 * - Validación de entrada
 * - Transformación de datos
 * - Documentación de API
 * 
 * PRINCIPIOS APLICADOS:
 * - SRP: Cada DTO tiene una responsabilidad específica
 * - OCP: Extensibles mediante herencia
 * - LSP: Implementan contratos consistentes
 * - ISP: Interfaces específicas por operación
 * - DIP: Dependen de abstracciones de validación
 */

import { 
  IsString, 
  IsOptional, 
  IsEmail, 
  IsUrl, 
  IsDateString, 
  IsEnum, 
  IsBoolean, 
  IsObject, 
  IsArray, 
  IsNumber,
  MinLength, 
  MaxLength, 
  IsHexColor,
  ValidateNested,
  ArrayMaxSize 
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ThemeType, PrivacyLevel, Language } from '../entities/user-profile.entity';
import { PaginationDto } from '../../../common/dto';

/**
 * DTO para configuraciones de redes sociales
 */
export class SocialLinksDto {
  @ApiPropertyOptional({
    description: 'Usuario de Twitter (sin @)',
    example: 'usuario123',
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: 'Twitter debe ser una cadena de texto' })
  @MaxLength(50, { message: 'Twitter no puede exceder 50 caracteres' })
  twitter?: string;

  @ApiPropertyOptional({
    description: 'URL de perfil de LinkedIn',
    example: 'https://linkedin.com/in/usuario',
    maxLength: 200
  })
  @IsOptional()
  @IsUrl({}, { message: 'LinkedIn debe ser una URL válida' })
  @MaxLength(200, { message: 'LinkedIn no puede exceder 200 caracteres' })
  linkedin?: string;

  @ApiPropertyOptional({
    description: 'Usuario de GitHub',
    example: 'usuario123',
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: 'GitHub debe ser una cadena de texto' })
  @MaxLength(50, { message: 'GitHub no puede exceder 50 caracteres' })
  github?: string;

  @ApiPropertyOptional({
    description: 'Usuario de Instagram (sin @)',
    example: 'usuario123',
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: 'Instagram debe ser una cadena de texto' })
  @MaxLength(50, { message: 'Instagram no puede exceder 50 caracteres' })
  instagram?: string;

  @ApiPropertyOptional({
    description: 'Usuario de Facebook',
    example: 'usuario.123',
    maxLength: 50
  })
  @IsOptional()
  @IsString({ message: 'Facebook debe ser una cadena de texto' })
  @MaxLength(50, { message: 'Facebook no puede exceder 50 caracteres' })
  facebook?: string;
}

/**
 * DTO para configuraciones de fuente
 */
export class FontSettingsDto {
  @ApiProperty({
    description: 'Tamaño de fuente',
    enum: ['small', 'medium', 'large'],
    example: 'medium'
  })
  @IsEnum(['small', 'medium', 'large'], { message: 'Tamaño de fuente inválido' })
  size: 'small' | 'medium' | 'large';

  @ApiProperty({
    description: 'Familia de fuente',
    example: 'Inter',
    maxLength: 50
  })
  @IsString({ message: 'Familia de fuente debe ser texto' })
  @MaxLength(50, { message: 'Familia de fuente no puede exceder 50 caracteres' })
  family: string;
}

/**
 * DTO para configuraciones de privacidad
 */
export class PrivacySettingsDto {
  @ApiPropertyOptional({
    description: 'Mostrar email en el perfil',
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: 'showEmail debe ser booleano' })
  showEmail?: boolean;

  @ApiPropertyOptional({
    description: 'Mostrar fecha de nacimiento',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'showBirthDate debe ser booleano' })
  showBirthDate?: boolean;

  @ApiPropertyOptional({
    description: 'Mostrar ubicación',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'showLocation debe ser booleano' })
  showLocation?: boolean;

  @ApiPropertyOptional({
    description: 'Mostrar enlaces de redes sociales',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'showSocialLinks debe ser booleano' })
  showSocialLinks?: boolean;

  @ApiPropertyOptional({
    description: 'Mostrar estadísticas',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'showStats debe ser booleano' })
  showStats?: boolean;

  @ApiPropertyOptional({
    description: 'Permitir mensajes privados',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'allowMessages debe ser booleano' })
  allowMessages?: boolean;

  @ApiPropertyOptional({
    description: 'Permitir solicitudes de amistad',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'allowFriendRequests debe ser booleano' })
  allowFriendRequests?: boolean;
}

/**
 * DTO para configuraciones de notificaciones
 */
export class NotificationSettingsDto {
  @ApiPropertyOptional({
    description: 'Recibir notificaciones por email',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'email debe ser booleano' })
  email?: boolean;

  @ApiPropertyOptional({
    description: 'Recibir notificaciones push',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'push debe ser booleano' })
  push?: boolean;

  @ApiPropertyOptional({
    description: 'Recibir notificaciones en la app',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'in_app debe ser booleano' })
  in_app?: boolean;

  @ApiPropertyOptional({
    description: 'Notificar nuevos mensajes',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'newMessages debe ser booleano' })
  newMessages?: boolean;

  @ApiPropertyOptional({
    description: 'Notificar actualizaciones de aulas',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'classroomUpdates debe ser booleano' })
  classroomUpdates?: boolean;

  @ApiPropertyOptional({
    description: 'Recordatorios de actividades',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'activityReminders debe ser booleano' })
  activityReminders?: boolean;

  @ApiPropertyOptional({
    description: 'Notificar logros desbloqueados',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'achievementUnlocked debe ser booleano' })
  achievementUnlocked?: boolean;

  @ApiPropertyOptional({
    description: 'Notificar solicitudes de amistad',
    default: true
  })
  @IsOptional()
  @IsBoolean({ message: 'friendRequests debe ser booleano' })
  friendRequests?: boolean;

  @ApiPropertyOptional({
    description: 'Resumen semanal por email',
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: 'weeklyDigest debe ser booleano' })
  weeklyDigest?: boolean;
}

/**
 * DTO para configuraciones de accesibilidad
 */
export class AccessibilitySettingsDto {
  @ApiPropertyOptional({
    description: 'Activar alto contraste',
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: 'highContrast debe ser booleano' })
  highContrast?: boolean;

  @ApiPropertyOptional({
    description: 'Reducir animaciones',
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: 'reducedMotion debe ser booleano' })
  reducedMotion?: boolean;

  @ApiPropertyOptional({
    description: 'Optimizado para lectores de pantalla',
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: 'screenReaderOptimized debe ser booleano' })
  screenReaderOptimized?: boolean;

  @ApiPropertyOptional({
    description: 'Navegación mejorada por teclado',
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: 'keyboardNavigation debe ser booleano' })
  keyboardNavigation?: boolean;
}

/**
 * DTO para creación de perfil
 */
export class CreateProfileDto {
  @ApiPropertyOptional({
    description: 'Nombre para mostrar públicamente',
    example: 'Juan Matemático',
    maxLength: 100
  })
  @IsOptional()
  @IsString({ message: 'El nombre para mostrar debe ser texto' })
  @MinLength(2, { message: 'El nombre para mostrar debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre para mostrar no puede exceder 100 caracteres' })
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Biografía o descripción personal',
    example: 'Estudiante apasionado por las matemáticas y la programación',
    maxLength: 500
  })
  @IsOptional()
  @IsString({ message: 'La biografía debe ser texto' })
  @MaxLength(500, { message: 'La biografía no puede exceder 500 caracteres' })
  bio?: string;

  @ApiPropertyOptional({
    description: 'Fecha de nacimiento',
    example: '1995-05-15',
    type: 'string',
    format: 'date'
  })
  @IsOptional()
  @IsDateString({}, { message: 'Fecha de nacimiento inválida' })
  @Transform(({ value }) => value ? new Date(value) : undefined)
  birthDate?: Date;

  @ApiPropertyOptional({
    description: 'Ubicación del usuario',
    example: 'Buenos Aires, Argentina',
    maxLength: 100
  })
  @IsOptional()
  @IsString({ message: 'La ubicación debe ser texto' })
  @MaxLength(100, { message: 'La ubicación no puede exceder 100 caracteres' })
  location?: string;

  @ApiPropertyOptional({
    description: 'Sitio web personal',
    example: 'https://miportfolio.com',
    maxLength: 255
  })
  @IsOptional()
  @IsUrl({}, { message: 'El sitio web debe ser una URL válida' })
  @MaxLength(255, { message: 'El sitio web no puede exceder 255 caracteres' })
  website?: string;

  @ApiPropertyOptional({
    description: 'Tema visual preferido',
    enum: ThemeType,
    default: ThemeType.AUTO
  })
  @IsOptional()
  @IsEnum(ThemeType, { message: 'Tema inválido' })
  theme?: ThemeType;

  @ApiPropertyOptional({
    description: 'Idioma preferido',
    enum: Language,
    default: Language.ES
  })
  @IsOptional()
  @IsEnum(Language, { message: 'Idioma inválido' })
  language?: Language;

  @ApiPropertyOptional({
    description: 'Nivel de privacidad del perfil',
    enum: PrivacyLevel,
    default: PrivacyLevel.PUBLIC
  })
  @IsOptional()
  @IsEnum(PrivacyLevel, { message: 'Nivel de privacidad inválido' })
  privacyLevel?: PrivacyLevel;

  @ApiPropertyOptional({
    description: 'Enlaces a redes sociales',
    type: SocialLinksDto
  })
  @IsOptional()
  @IsObject({ message: 'Las redes sociales deben ser un objeto' })
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;
}

/**
 * DTO para actualización de perfil
 */
export class UpdateProfileDto extends CreateProfileDto {
  @ApiPropertyOptional({
    description: 'Color primario personalizado (hexadecimal)',
    example: '#3B82F6',
    pattern: '^#[0-9A-Fa-f]{6}$'
  })
  @IsOptional()
  @IsHexColor({ message: 'El color primario debe ser un código hexadecimal válido' })
  primaryColor?: string;

  @ApiPropertyOptional({
    description: 'Configuraciones de fuente',
    type: FontSettingsDto
  })
  @IsOptional()
  @IsObject({ message: 'Las configuraciones de fuente deben ser un objeto' })
  @ValidateNested()
  @Type(() => FontSettingsDto)
  fontSettings?: FontSettingsDto;

  @ApiPropertyOptional({
    description: 'Configuraciones detalladas de privacidad',
    type: PrivacySettingsDto
  })
  @IsOptional()
  @IsObject({ message: 'Las configuraciones de privacidad deben ser un objeto' })
  @ValidateNested()
  @Type(() => PrivacySettingsDto)
  privacySettings?: PrivacySettingsDto;

  @ApiPropertyOptional({
    description: 'Configuraciones de notificaciones',
    type: NotificationSettingsDto
  })
  @IsOptional()
  @IsObject({ message: 'Las configuraciones de notificaciones deben ser un objeto' })
  @ValidateNested()
  @Type(() => NotificationSettingsDto)
  notificationSettings?: NotificationSettingsDto;

  @ApiPropertyOptional({
    description: 'Configuraciones de accesibilidad',
    type: AccessibilitySettingsDto
  })
  @IsOptional()
  @IsObject({ message: 'Las configuraciones de accesibilidad deben ser un objeto' })
  @ValidateNested()
  @Type(() => AccessibilitySettingsDto)
  accessibilitySettings?: AccessibilitySettingsDto;

  @ApiPropertyOptional({
    description: 'Logros destacados a mostrar en el perfil (máximo 5)',
    type: [String],
    maxItems: 5
  })
  @IsOptional()
  @IsArray({ message: 'Los logros destacados deben ser un arreglo' })
  @IsString({ each: true, message: 'Cada logro debe ser una cadena de texto' })
  @ArrayMaxSize(5, { message: 'No puedes destacar más de 5 logros' })
  featuredAchievements?: string[];
}

/**
 * DTO para filtros de búsqueda de perfiles
 */
export class ProfileFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Campo por el cual ordenar',
    example: 'createdAt',
    default: 'createdAt'
  })
  @IsOptional()
  @IsString({ message: 'El campo de ordenamiento debe ser texto' })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Dirección del ordenamiento',
    enum: ['ASC', 'DESC'],
    default: 'DESC'
  })
  @IsOptional()
  @IsEnum(['ASC', 'DESC'], { message: 'La dirección debe ser ASC o DESC' })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @ApiPropertyOptional({
    description: 'Buscar por nombre para mostrar',
    example: 'Juan',
    maxLength: 100
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser texto' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  displayName?: string;

  @ApiPropertyOptional({
    description: 'Buscar por ubicación',
    example: 'Buenos Aires',
    maxLength: 100
  })
  @IsOptional()
  @IsString({ message: 'La ubicación debe ser texto' })
  @MaxLength(100, { message: 'La ubicación no puede exceder 100 caracteres' })
  location?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por usuarios verificados',
    type: Boolean
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'isVerified debe ser booleano' })
  isVerified?: boolean;

  @ApiPropertyOptional({
    description: 'Filtrar por tema visual',
    enum: ThemeType
  })
  @IsOptional()
  @IsEnum(ThemeType, { message: 'Tema inválido' })
  theme?: ThemeType;

  @ApiPropertyOptional({
    description: 'Filtrar por idioma',
    enum: Language
  })
  @IsOptional()
  @IsEnum(Language, { message: 'Idioma inválido' })
  language?: Language;

  @ApiPropertyOptional({
    description: 'Nivel mínimo del usuario',
    type: Number,
    minimum: 1
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsNumber({}, { message: 'El nivel mínimo debe ser un número' })
  minLevel?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por usuarios con avatar personalizado',
    type: Boolean
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'hasAvatar debe ser booleano' })
  hasAvatar?: boolean;

  /**
   * Calcula el offset para la consulta SQL
   */
  getOffset(): number {
    return (this.page - 1) * this.limit;
  }
}

/**
 * DTO para actualización de estadísticas
 */
export class UpdateStatsDto {
  @ApiPropertyOptional({
    description: 'Número de actividades completadas',
    type: Number,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: 'Las actividades completadas deben ser un número' })
  activitiesCompleted?: number;

  @ApiPropertyOptional({
    description: 'Número de aulas a las que se ha unido',
    type: Number,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: 'Las aulas unidas deben ser un número' })
  classroomsJoined?: number;

  @ApiPropertyOptional({
    description: 'Número de insignias obtenidas',
    type: Number,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: 'Las insignias obtenidas deben ser un número' })
  badgesEarned?: number;

  @ApiPropertyOptional({
    description: 'Puntos totales obtenidos',
    type: Number,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: 'Los puntos obtenidos deben ser un número' })
  pointsEarned?: number;

  @ApiPropertyOptional({
    description: 'Días consecutivos de actividad',
    type: Number,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: 'Los días de racha deben ser un número' })
  streakDays?: number;

  @ApiPropertyOptional({
    description: 'Tiempo total de estudio en minutos',
    type: Number,
    minimum: 0
  })
  @IsOptional()
  @IsNumber({}, { message: 'El tiempo de estudio debe ser un número' })
  totalStudyTime?: number;

  @ApiPropertyOptional({
    description: 'Puntuación promedio (0-100)',
    type: Number,
    minimum: 0,
    maximum: 100
  })
  @IsOptional()
  @IsNumber({}, { message: 'La puntuación promedio debe ser un número' })
  averageScore?: number;
}