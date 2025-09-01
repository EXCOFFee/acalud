import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  MaxLength,
  IsOptional,
  IsHexColor,
  IsObject,
  Matches,
  MinLength,
  IsEnum,
  ValidateNested,
  IsBoolean,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { IsSafeName, IsSafeHtml } from '../../../common/validators/custom.validators';

/**
 * Configuraciones válidas para un aula
 */
class ClassroomSettings {
  @ApiProperty({ description: 'Permitir entregas tardías', default: false })
  @IsOptional()
  @IsBoolean({ message: 'allowLateSubmissions debe ser true o false' })
  allowLateSubmissions?: boolean;

  @ApiProperty({ description: 'Máximo número de intentos por actividad', default: 3 })
  @IsOptional()
  @IsInt({ message: 'maxAttempts debe ser un número entero' })
  @Min(1, { message: 'maxAttempts debe ser al menos 1' })
  @Max(10, { message: 'maxAttempts no puede ser mayor a 10' })
  maxAttempts?: number;

  @ApiProperty({ description: 'Mostrar tabla de clasificación', default: true })
  @IsOptional()
  @IsBoolean({ message: 'showLeaderboard debe ser true o false' })
  showLeaderboard?: boolean;

  @ApiProperty({ description: 'Habilitar notificaciones', default: true })
  @IsOptional()
  @IsBoolean({ message: 'enableNotifications debe ser true o false' })
  enableNotifications?: boolean;

  @ApiProperty({ description: 'Máximo número de estudiantes', default: 50 })
  @IsOptional()
  @IsInt({ message: 'maxStudents debe ser un número entero' })
  @Min(1, { message: 'maxStudents debe ser al menos 1' })
  @Max(100, { message: 'maxStudents no puede ser mayor a 100' })
  maxStudents?: number;

  @ApiProperty({ description: 'Requerir aprobación para unirse', default: false })
  @IsOptional()
  @IsBoolean({ message: 'requireApproval debe ser true o false' })
  requireApproval?: boolean;
}

/**
 * Materias válidas del sistema
 */
export enum ValidSubjects {
  MATEMATICAS = 'Matemáticas',
  CIENCIAS = 'Ciencias',
  HISTORIA = 'Historia',
  GEOGRAFIA = 'Geografía',
  LENGUA = 'Lengua',
  INGLES = 'Inglés',
  EDUCACION_FISICA = 'Educación Física',
  ARTE = 'Arte',
  MUSICA = 'Música',
  TECNOLOGIA = 'Tecnología',
  OTRO = 'Otro',
}

/**
 * Grados válidos del sistema
 */
export enum ValidGrades {
  PRIMERO_PRIMARIA = '1° Primaria',
  SEGUNDO_PRIMARIA = '2° Primaria',
  TERCERO_PRIMARIA = '3° Primaria',
  CUARTO_PRIMARIA = '4° Primaria',
  QUINTO_PRIMARIA = '5° Primaria',
  SEXTO_PRIMARIA = '6° Primaria',
  PRIMERO_SECUNDARIA = '1° Secundaria',
  SEGUNDO_SECUNDARIA = '2° Secundaria',
  TERCERO_SECUNDARIA = '3° Secundaria',
  CUARTO_SECUNDARIA = '4° Secundaria',
  QUINTO_SECUNDARIA = '5° Secundaria',
  OTRO = 'Otro',
}

/**
 * DTO mejorado para la creación de una nueva aula
 * Implementa validaciones robustas siguiendo principios SOLID
 */
export class CreateClassroomDto {
  @ApiProperty({
    description: 'Nombre del aula (sin caracteres especiales peligrosos)',
    example: 'Matemáticas Avanzadas - Grupo A',
    minLength: 3,
    maxLength: 100,
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto válida' })
  @IsNotEmpty({ message: 'El nombre del aula es obligatorio' })
  @MinLength(3, { message: 'El nombre debe tener al menos 3 caracteres' })
  @MaxLength(100, { message: 'El nombre no puede exceder 100 caracteres' })
  @IsSafeName({ message: 'El nombre contiene caracteres no permitidos' })
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({
    description: 'Descripción detallada del aula (HTML básico permitido)',
    example: 'Curso de matemáticas para estudiantes de bachillerato con enfoque en álgebra y geometría. Incluye ejercicios prácticos y evaluaciones continuas.',
    maxLength: 1000,
  })
  @IsString({ message: 'La descripción debe ser una cadena de texto válida' })
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  @MaxLength(1000, { message: 'La descripción no puede exceder 1000 caracteres' })
  @IsSafeHtml({ message: 'La descripción contiene HTML no permitido' })
  @Transform(({ value }) => value?.trim())
  description: string;

  @ApiProperty({
    description: 'Materia o asignatura del aula',
    enum: ValidSubjects,
    example: ValidSubjects.MATEMATICAS,
  })
  @IsEnum(ValidSubjects, { 
    message: `La materia debe ser una de las siguientes: ${Object.values(ValidSubjects).join(', ')}` 
  })
  subject: ValidSubjects;

  @ApiProperty({
    description: 'Grado o curso del aula',
    enum: ValidGrades,
    example: ValidGrades.CUARTO_SECUNDARIA,
  })
  @IsEnum(ValidGrades, { 
    message: `El grado debe ser uno de los siguientes: ${Object.values(ValidGrades).join(', ')}` 
  })
  grade: ValidGrades;

  @ApiProperty({
    description: 'Color del aula para identificación visual (formato hexadecimal)',
    example: '#6366f1',
    required: false,
    pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
  })
  @IsOptional()
  @IsString({ message: 'El color debe ser una cadena de texto' })
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, { 
    message: 'El color debe ser un código hexadecimal válido (ej: #6366f1 o #333)' 
  })
  color?: string;

  @ApiProperty({
    description: 'URL de la imagen de portada del aula (solo HTTPS)',
    example: 'https://images.unsplash.com/photo-mathematics-classroom',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La imagen de portada debe ser una URL válida' })
  @MaxLength(500, { message: 'La URL de la imagen no puede exceder 500 caracteres' })
  @Matches(/^https:\/\//, { message: 'La URL de la imagen debe usar protocolo HTTPS' })
  @Matches(/\.(jpg|jpeg|png|webp)$/i, { 
    message: 'La imagen debe ser de formato JPG, PNG o WebP' 
  })
  coverImage?: string;

  @ApiProperty({
    description: 'Configuraciones específicas del aula',
    type: ClassroomSettings,
    required: false,
  })
  @IsOptional()
  @ValidateNested({ message: 'Las configuraciones deben ser válidas' })
  @Type(() => ClassroomSettings)
  settings?: ClassroomSettings;

  @ApiProperty({
    description: 'Palabras clave para facilitar búsquedas (máximo 10)',
    example: ['álgebra', 'geometría', 'bachillerato', 'matemáticas'],
    required: false,
    maxItems: 10,
  })
  @IsOptional()
  @IsString({ each: true, message: 'Cada etiqueta debe ser una cadena de texto' })
  @MaxLength(30, { each: true, message: 'Cada etiqueta no puede exceder 30 caracteres' })
  @Transform(({ value }) => value?.slice(0, 10).map((tag: string) => tag.trim().toLowerCase()))
  tags?: string[];

  @ApiProperty({
    description: 'Nivel de dificultad del aula',
    enum: ['básico', 'intermedio', 'avanzado'],
    example: 'intermedio',
    required: false,
  })
  @IsOptional()
  @IsEnum(['básico', 'intermedio', 'avanzado'], { 
    message: 'El nivel debe ser: básico, intermedio o avanzado' 
  })
  level?: 'básico' | 'intermedio' | 'avanzado';

  @ApiProperty({
    description: 'Zona horaria del aula',
    example: 'America/Bogota',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La zona horaria debe ser una cadena de texto' })
  @Matches(/^[A-Za-z_]+\/[A-Za-z_]+$/, { 
    message: 'Formato de zona horaria inválido (ej: America/Bogota)' 
  })
  timezone?: string;

  @ApiProperty({
    description: 'Idioma principal del aula',
    enum: ['es', 'en', 'fr', 'pt'],
    example: 'es',
    required: false,
  })
  @IsOptional()
  @IsEnum(['es', 'en', 'fr', 'pt'], { 
    message: 'El idioma debe ser: es (español), en (inglés), fr (francés) o pt (portugués)' 
  })
  language?: 'es' | 'en' | 'fr' | 'pt';
}
