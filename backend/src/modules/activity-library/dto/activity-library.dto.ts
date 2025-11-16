import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { 
  IsString, 
  IsEnum, 
  IsOptional, 
  IsInt, 
  IsArray, 
  Min, 
  Max, 
  Length,
  IsUUID,
  ArrayMaxSize,
  ValidateNested,
  IsBoolean
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ActivityCategory, DifficultyLevel, ActivityVisibility } from '../entities/activity-library.entity';

/**
 * DTO base para paginación de resultados
 * Implementa parámetros estándar de paginación
 * Sigue principios de Single Responsibility
 */
export class PaginationDto {
  @ApiPropertyOptional({ 
    description: 'Número de página (empezando desde 1)', 
    minimum: 1, 
    default: 1 
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10) || 1)
  page?: number = 1;

  @ApiPropertyOptional({ 
    description: 'Número de elementos por página', 
    minimum: 1, 
    maximum: 50, 
    default: 10 
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Transform(({ value }) => parseInt(value, 10) || 10)
  limit?: number = 10;

  /**
   * Calcula el offset para la consulta de base de datos
   * @returns Número de registros a saltar
   */
  getOffset(): number {
    return (this.page - 1) * this.limit;
  }
}

/**
 * DTO para crear una nueva entrada en la biblioteca de actividades
 * Implementa validaciones robustas para todos los campos requeridos
 * Sigue principios de Data Transfer Object con validación exhaustiva
 */
export class CreateActivityLibraryDto {
  @ApiProperty({ 
    description: 'ID de la actividad original que se va a compartir' 
  })
  @IsUUID(4, { message: 'El ID de la actividad debe ser un UUID válido' })
  originalActivityId: string;

  @ApiProperty({ 
    description: 'Título público de la actividad (puede ser diferente al original)',
    minLength: 5,
    maxLength: 200
  })
  @IsString({ message: 'El título debe ser una cadena de texto' })
  @Length(5, 200, { message: 'El título debe tener entre 5 y 200 caracteres' })
  @Transform(({ value }) => value?.trim())
  publicTitle: string;

  @ApiProperty({ 
    description: 'Descripción pública detallada de la actividad',
    minLength: 20,
    maxLength: 2000
  })
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @Length(20, 2000, { message: 'La descripción debe tener entre 20 y 2000 caracteres' })
  @Transform(({ value }) => value?.trim())
  publicDescription: string;

  @ApiProperty({ 
    description: 'Categoría de la actividad',
    enum: ActivityCategory
  })
  @IsEnum(ActivityCategory, { message: 'Categoría inválida' })
  category: ActivityCategory;

  @ApiProperty({ 
    description: 'Nivel de dificultad de la actividad',
    enum: DifficultyLevel
  })
  @IsEnum(DifficultyLevel, { message: 'Nivel de dificultad inválido' })
  difficultyLevel: DifficultyLevel;

  @ApiPropertyOptional({ 
    description: 'Edad mínima recomendada',
    minimum: 3,
    maximum: 99
  })
  @IsOptional()
  @IsInt({ message: 'La edad mínima debe ser un número entero' })
  @Min(3, { message: 'La edad mínima debe ser al menos 3 años' })
  @Max(99, { message: 'La edad mínima no puede ser mayor a 99 años' })
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  recommendedAgeMin?: number;

  @ApiPropertyOptional({ 
    description: 'Edad máxima recomendada',
    minimum: 3,
    maximum: 99
  })
  @IsOptional()
  @IsInt({ message: 'La edad máxima debe ser un número entero' })
  @Min(3, { message: 'La edad máxima debe ser al menos 3 años' })
  @Max(99, { message: 'La edad máxima no puede ser mayor a 99 años' })
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  recommendedAgeMax?: number;

  @ApiPropertyOptional({ 
    description: 'Duración estimada en minutos',
    minimum: 1,
    maximum: 480
  })
  @IsOptional()
  @IsInt({ message: 'La duración debe ser un número entero' })
  @Min(1, { message: 'La duración mínima es 1 minuto' })
  @Max(480, { message: 'La duración máxima es 8 horas (480 minutos)' })
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional({ 
    description: 'Número mínimo de estudiantes recomendado',
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @IsInt({ message: 'El número mínimo de estudiantes debe ser un entero' })
  @Min(1, { message: 'El mínimo debe ser al menos 1 estudiante' })
  @Max(100, { message: 'El mínimo no puede ser mayor a 100 estudiantes' })
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  recommendedStudentsMin?: number;

  @ApiPropertyOptional({ 
    description: 'Número máximo de estudiantes recomendado',
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @IsInt({ message: 'El número máximo de estudiantes debe ser un entero' })
  @Min(1, { message: 'El máximo debe ser al menos 1 estudiante' })
  @Max(100, { message: 'El máximo no puede ser mayor a 100 estudiantes' })
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  recommendedStudentsMax?: number;

  @ApiPropertyOptional({ 
    description: 'Materiales o recursos necesarios',
    maxLength: 20
  })
  @IsOptional()
  @IsArray({ message: 'Los materiales deben ser un array' })
  @ArrayMaxSize(20, { message: 'Máximo 20 materiales permitidos' })
  @IsString({ each: true, message: 'Cada material debe ser una cadena de texto' })
  @Length(2, 100, { each: true, message: 'Cada material debe tener entre 2 y 100 caracteres' })
  @Transform(({ value }) => value?.map((item: string) => item?.trim()).filter(Boolean))
  requiredMaterials?: string[];

  @ApiPropertyOptional({ 
    description: 'Objetivos de aprendizaje',
    maxLength: 10
  })
  @IsOptional()
  @IsArray({ message: 'Los objetivos deben ser un array' })
  @ArrayMaxSize(10, { message: 'Máximo 10 objetivos permitidos' })
  @IsString({ each: true, message: 'Cada objetivo debe ser una cadena de texto' })
  @Length(10, 200, { each: true, message: 'Cada objetivo debe tener entre 10 y 200 caracteres' })
  @Transform(({ value }) => value?.map((item: string) => item?.trim()).filter(Boolean))
  learningObjectives?: string[];

  @ApiPropertyOptional({ 
    description: 'Instrucciones específicas para el profesor',
    maxLength: 5000
  })
  @IsOptional()
  @IsString({ message: 'Las instrucciones deben ser una cadena de texto' })
  @Length(0, 5000, { message: 'Las instrucciones no pueden exceder 5000 caracteres' })
  @Transform(({ value }) => value?.trim())
  teacherInstructions?: string;

  @ApiPropertyOptional({ 
    description: 'Etiquetas para la actividad',
    maxLength: 10
  })
  @IsOptional()
  @IsArray({ message: 'Las etiquetas deben ser un array' })
  @ArrayMaxSize(10, { message: 'Máximo 10 etiquetas permitidas' })
  @IsString({ each: true, message: 'Cada etiqueta debe ser una cadena de texto' })
  @Length(2, 50, { each: true, message: 'Cada etiqueta debe tener entre 2 y 50 caracteres' })
  @Transform(({ value }) => value?.map((tag: string) => tag?.toLowerCase().trim()).filter(Boolean))
  tags?: string[];
}

/**
 * DTO para actualizar una entrada existente en la biblioteca
 * Todos los campos son opcionales para permitir actualizaciones parciales
 * Mantiene las mismas validaciones que el DTO de creación
 */
export class UpdateActivityLibraryDto {
  @ApiPropertyOptional({ 
    description: 'Nuevo título público de la actividad',
    minLength: 5,
    maxLength: 200
  })
  @IsOptional()
  @IsString({ message: 'El título debe ser una cadena de texto' })
  @Length(5, 200, { message: 'El título debe tener entre 5 y 200 caracteres' })
  @Transform(({ value }) => value?.trim())
  publicTitle?: string;

  @ApiPropertyOptional({ 
    description: 'Nueva descripción pública de la actividad',
    minLength: 20,
    maxLength: 2000
  })
  @IsOptional()
  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @Length(20, 2000, { message: 'La descripción debe tener entre 20 y 2000 caracteres' })
  @Transform(({ value }) => value?.trim())
  publicDescription?: string;

  @ApiPropertyOptional({ 
    description: 'Nueva categoría de la actividad',
    enum: ActivityCategory
  })
  @IsOptional()
  @IsEnum(ActivityCategory, { message: 'Categoría inválida' })
  category?: ActivityCategory;

  @ApiPropertyOptional({ 
    description: 'Nuevo nivel de dificultad',
    enum: DifficultyLevel
  })
  @IsOptional()
  @IsEnum(DifficultyLevel, { message: 'Nivel de dificultad inválido' })
  difficultyLevel?: DifficultyLevel;

  @ApiPropertyOptional({ 
    description: 'Nueva visibilidad de la actividad',
    enum: ActivityVisibility
  })
  @IsOptional()
  @IsEnum(ActivityVisibility, { message: 'Estado de visibilidad inválido' })
  visibility?: ActivityVisibility;

  @ApiPropertyOptional({ 
    description: 'Nueva edad mínima recomendada',
    minimum: 3,
    maximum: 99
  })
  @IsOptional()
  @IsInt({ message: 'La edad mínima debe ser un número entero' })
  @Min(3, { message: 'La edad mínima debe ser al menos 3 años' })
  @Max(99, { message: 'La edad mínima no puede ser mayor a 99 años' })
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  recommendedAgeMin?: number;

  @ApiPropertyOptional({ 
    description: 'Nueva edad máxima recomendada',
    minimum: 3,
    maximum: 99
  })
  @IsOptional()
  @IsInt({ message: 'La edad máxima debe ser un número entero' })
  @Min(3, { message: 'La edad máxima debe ser al menos 3 años' })
  @Max(99, { message: 'La edad máxima no puede ser mayor a 99 años' })
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  recommendedAgeMax?: number;

  @ApiPropertyOptional({ 
    description: 'Nueva duración estimada en minutos',
    minimum: 1,
    maximum: 480
  })
  @IsOptional()
  @IsInt({ message: 'La duración debe ser un número entero' })
  @Min(1, { message: 'La duración mínima es 1 minuto' })
  @Max(480, { message: 'La duración máxima es 8 horas (480 minutos)' })
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  estimatedDurationMinutes?: number;

  @ApiPropertyOptional({ 
    description: 'Nuevo número mínimo de estudiantes',
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @IsInt({ message: 'El número mínimo de estudiantes debe ser un entero' })
  @Min(1, { message: 'El mínimo debe ser al menos 1 estudiante' })
  @Max(100, { message: 'El mínimo no puede ser mayor a 100 estudiantes' })
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  recommendedStudentsMin?: number;

  @ApiPropertyOptional({ 
    description: 'Nuevo número máximo de estudiantes',
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @IsInt({ message: 'El número máximo de estudiantes debe ser un entero' })
  @Min(1, { message: 'El máximo debe ser al menos 1 estudiante' })
  @Max(100, { message: 'El máximo no puede ser mayor a 100 estudiantes' })
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  recommendedStudentsMax?: number;

  @ApiPropertyOptional({ 
    description: 'Nuevos materiales requeridos',
    maxLength: 20
  })
  @IsOptional()
  @IsArray({ message: 'Los materiales deben ser un array' })
  @ArrayMaxSize(20, { message: 'Máximo 20 materiales permitidos' })
  @IsString({ each: true, message: 'Cada material debe ser una cadena de texto' })
  @Length(2, 100, { each: true, message: 'Cada material debe tener entre 2 y 100 caracteres' })
  @Transform(({ value }) => value?.map((item: string) => item?.trim()).filter(Boolean))
  requiredMaterials?: string[];

  @ApiPropertyOptional({ 
    description: 'Nuevos objetivos de aprendizaje',
    maxLength: 10
  })
  @IsOptional()
  @IsArray({ message: 'Los objetivos deben ser un array' })
  @ArrayMaxSize(10, { message: 'Máximo 10 objetivos permitidos' })
  @IsString({ each: true, message: 'Cada objetivo debe ser una cadena de texto' })
  @Length(10, 200, { each: true, message: 'Cada objetivo debe tener entre 10 y 200 caracteres' })
  @Transform(({ value }) => value?.map((item: string) => item?.trim()).filter(Boolean))
  learningObjectives?: string[];

  @ApiPropertyOptional({ 
    description: 'Nuevas instrucciones para el profesor',
    maxLength: 5000
  })
  @IsOptional()
  @IsString({ message: 'Las instrucciones deben ser una cadena de texto' })
  @Length(0, 5000, { message: 'Las instrucciones no pueden exceder 5000 caracteres' })
  @Transform(({ value }) => value?.trim())
  teacherInstructions?: string;

  @ApiPropertyOptional({ 
    description: 'Nuevas etiquetas para la actividad',
    maxLength: 10
  })
  @IsOptional()
  @IsArray({ message: 'Las etiquetas deben ser un array' })
  @ArrayMaxSize(10, { message: 'Máximo 10 etiquetas permitidas' })
  @IsString({ each: true, message: 'Cada etiqueta debe ser una cadena de texto' })
  @Length(2, 50, { each: true, message: 'Cada etiqueta debe tener entre 2 y 50 caracteres' })
  @Transform(({ value }) => value?.map((tag: string) => tag?.toLowerCase().trim()).filter(Boolean))
  tags?: string[];
}

/**
 * DTO para filtrar y buscar actividades en la biblioteca
 * Implementa múltiples criterios de búsqueda y filtrado
 * Extiende PaginationDto para incluir paginación
 */
export class ActivityLibraryFilterDto extends PaginationDto {
  @ApiPropertyOptional({ 
    description: 'Término de búsqueda en título y descripción',
    minLength: 2,
    maxLength: 100
  })
  @IsOptional()
  @IsString({ message: 'El término de búsqueda debe ser una cadena de texto' })
  @Length(2, 100, { message: 'El término debe tener entre 2 y 100 caracteres' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  search?: string;

  @ApiPropertyOptional({ 
    description: 'Filtrar por categoría',
    enum: ActivityCategory
  })
  @IsOptional()
  @IsEnum(ActivityCategory, { message: 'Categoría inválida' })
  category?: ActivityCategory;

  @ApiPropertyOptional({ 
    description: 'Filtrar por nivel de dificultad',
    enum: DifficultyLevel
  })
  @IsOptional()
  @IsEnum(DifficultyLevel, { message: 'Nivel de dificultad inválido' })
  difficultyLevel?: DifficultyLevel;

  @ApiPropertyOptional({ 
    description: 'Filtrar por visibilidad',
    enum: ActivityVisibility
  })
  @IsOptional()
  @IsEnum(ActivityVisibility, { message: 'Estado de visibilidad inválido' })
  visibility?: ActivityVisibility;

  @ApiPropertyOptional({ 
    description: 'Edad mínima del rango objetivo',
    minimum: 3,
    maximum: 99
  })
  @IsOptional()
  @IsInt({ message: 'La edad debe ser un número entero' })
  @Min(3, { message: 'La edad mínima debe ser al menos 3 años' })
  @Max(99, { message: 'La edad no puede ser mayor a 99 años' })
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  targetAge?: number;

  @ApiPropertyOptional({ 
    description: 'Duración máxima deseada en minutos',
    minimum: 1,
    maximum: 480
  })
  @IsOptional()
  @IsInt({ message: 'La duración debe ser un número entero' })
  @Min(1, { message: 'La duración mínima es 1 minuto' })
  @Max(480, { message: 'La duración máxima es 8 horas (480 minutos)' })
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  maxDuration?: number;

  @ApiPropertyOptional({ 
    description: 'Puntuación mínima promedio',
    minimum: 1,
    maximum: 5
  })
  @IsOptional()
  @IsInt({ message: 'La puntuación debe ser un número entero' })
  @Min(1, { message: 'La puntuación mínima es 1' })
  @Max(5, { message: 'La puntuación máxima es 5' })
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  minRating?: number;

  @ApiPropertyOptional({ 
    description: 'Etiquetas a filtrar (separadas por coma)' 
  })
  @IsOptional()
  @IsString({ message: 'Las etiquetas deben ser una cadena de texto' })
  @Transform(({ value }) => {
    if (!value) return undefined;
    return value.split(',').map((tag: string) => tag.trim().toLowerCase()).filter(Boolean);
  })
  tags?: string[];

  @ApiPropertyOptional({ 
    description: 'Filtrar por autor (ID del usuario)',
    format: 'uuid'
  })
  @IsOptional()
  @IsUUID(4, { message: 'El ID del autor debe ser un UUID válido' })
  authorId?: string;

  @ApiPropertyOptional({ 
    description: 'Solo actividades destacadas',
    default: false
  })
  @IsOptional()
  @IsBoolean({ message: 'El campo destacadas debe ser booleano' })
  @Transform(({ value }) => value === 'true' || value === true)
  onlyFeatured?: boolean;

  @ApiPropertyOptional({ 
    description: 'Campo por el cual ordenar',
    enum: ['createdAt', 'averageRating', 'totalRatings', 'totalCopies', 'totalViews', 'publicTitle'],
    default: 'createdAt'
  })
  @IsOptional()
  @IsString({ message: 'El campo de ordenamiento debe ser una cadena' })
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({ 
    description: 'Orden de clasificación',
    enum: ['ASC', 'DESC'],
    default: 'DESC'
  })
  @IsOptional()
  @IsString({ message: 'El orden debe ser una cadena' })
  @Transform(({ value }) => value?.toUpperCase())
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  /**
   * Valida que el rango de edades sea coherente
   * @returns true si es válido o no se especificaron edades
   */
  isValidAgeRange(): boolean {
    // Esta validación se haría en el servicio ya que aquí solo tenemos targetAge
    return true;
  }
}

/**
 * DTO para crear una valoración de actividad
 * Implementa validaciones estrictas para puntuaciones y comentarios
 */
export class CreateActivityRatingDto {
  @ApiProperty({ 
    description: 'ID de la actividad de biblioteca a valorar' 
  })
  @IsUUID(4, { message: 'El ID de la actividad debe ser un UUID válido' })
  libraryActivityId: string;

  @ApiProperty({ 
    description: 'Puntuación de 1 a 5 estrellas',
    minimum: 1,
    maximum: 5
  })
  @IsInt({ message: 'La puntuación debe ser un número entero' })
  @Min(1, { message: 'La puntuación mínima es 1 estrella' })
  @Max(5, { message: 'La puntuación máxima es 5 estrellas' })
  @Transform(({ value }) => parseInt(value, 10))
  rating: number;

  @ApiPropertyOptional({ 
    description: 'Comentario opcional sobre la actividad',
    minLength: 5,
    maxLength: 1000
  })
  @IsOptional()
  @IsString({ message: 'El comentario debe ser una cadena de texto' })
  @Length(5, 1000, { message: 'El comentario debe tener entre 5 y 1000 caracteres' })
  @Transform(({ value }) => value?.trim())
  comment?: string;
}

/**
 * DTO para actualizar una valoración existente
 * Permite modificar puntuación y comentario
 */
export class UpdateActivityRatingDto {
  @ApiPropertyOptional({ 
    description: 'Nueva puntuación de 1 a 5 estrellas',
    minimum: 1,
    maximum: 5
  })
  @IsOptional()
  @IsInt({ message: 'La puntuación debe ser un número entero' })
  @Min(1, { message: 'La puntuación mínima es 1 estrella' })
  @Max(5, { message: 'La puntuación máxima es 5 estrellas' })
  @Transform(({ value }) => value ? parseInt(value, 10) : undefined)
  rating?: number;

  @ApiPropertyOptional({ 
    description: 'Nuevo comentario (dejar vacío para eliminar)',
    maxLength: 1000
  })
  @IsOptional()
  @IsString({ message: 'El comentario debe ser una cadena de texto' })
  @Length(0, 1000, { message: 'El comentario no puede exceder 1000 caracteres' })
  @Transform(({ value }) => value?.trim())
  comment?: string;
}

/**
 * DTO para crear o actualizar etiquetas de actividad
 * Gestiona el sistema flexible de tags
 */
export class ActivityTagDto {
  @ApiProperty({ 
    description: 'Nombre de la etiqueta',
    minLength: 2,
    maxLength: 50
  })
  @IsString({ message: 'El nombre de la etiqueta debe ser una cadena' })
  @Length(2, 50, { message: 'La etiqueta debe tener entre 2 y 50 caracteres' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  tagName: string;

  @ApiPropertyOptional({ 
    description: 'Color de la etiqueta en formato hexadecimal',
    pattern: '^#[0-9a-fA-F]{6}$',
    default: '#007bff'
  })
  @IsOptional()
  @IsString({ message: 'El color debe ser una cadena de texto' })
  @Transform(({ value }) => {
    if (!value) return '#007bff';
    const color = value.toLowerCase();
    return color.startsWith('#') ? color : '#' + color;
  })
  color?: string = '#007bff';
}

/**
 * DTO para gestionar múltiples etiquetas de una actividad
 * Permite operaciones batch sobre tags
 */
export class ManageActivityTagsDto {
  @ApiProperty({ 
    description: 'ID de la actividad de biblioteca' 
  })
  @IsUUID(4, { message: 'El ID de la actividad debe ser un UUID válido' })
  libraryActivityId: string;

  @ApiProperty({ 
    description: 'Lista de etiquetas a agregar/actualizar',
    type: [ActivityTagDto],
    maxLength: 10
  })
  @IsArray({ message: 'Las etiquetas deben ser un array' })
  @ArrayMaxSize(10, { message: 'Máximo 10 etiquetas permitidas' })
  @ValidateNested({ each: true })
  @Type(() => ActivityTagDto)
  tags: ActivityTagDto[];
}

/**
 * DTO para respuestas de operaciones sobre la biblioteca
 * Estandariza las respuestas de la API
 */
export class ActivityLibraryResponseDto {
  @ApiProperty({ description: 'Indica si la operación fue exitosa' })
  success: boolean;

  @ApiProperty({ description: 'Mensaje descriptivo del resultado' })
  message: string;

  @ApiPropertyOptional({ description: 'Datos adicionales de la respuesta' })
  data?: unknown;

  @ApiPropertyOptional({ description: 'Detalles del error si aplica' })
  error?: string;

  @ApiPropertyOptional({ description: 'Código de error específico' })
  errorCode?: string;
}

/**
 * DTO para estadísticas de la biblioteca
 * Proporciona métricas útiles para análisis
 */
export class LibraryStatsDto {
  @ApiProperty({ description: 'Total de actividades públicas' })
  totalPublicActivities: number;

  @ApiProperty({ description: 'Total de actividades por categoría' })
  activitiesByCategory: Record<ActivityCategory, number>;

  @ApiProperty({ description: 'Total de actividades por dificultad' })
  activitiesByDifficulty: Record<DifficultyLevel, number>;

  @ApiProperty({ description: 'Top 5 actividades más valoradas' })
  topRatedActivities: Array<Record<string, unknown>>;

  @ApiProperty({ description: 'Top 5 actividades más copiadas' })
  mostCopiedActivities: Array<Record<string, unknown>>;

  @ApiProperty({ description: 'Usuarios más activos en compartir' })
  topContributors: Array<Record<string, unknown>>;
}