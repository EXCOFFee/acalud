import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  Matches,
  IsBoolean,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { UserRole } from '../user.entity';

/**
 * DTO para la actualización de datos de usuario
 * Todos los campos son opcionales para permitir actualizaciones parciales
 */
export class UpdateUserDto {
  @ApiProperty({
    description: 'Email único del usuario',
    example: 'nuevo@ejemplo.com',
    required: false,
  })
  @IsOptional()
  @IsEmail({}, { message: 'Debe ser un email válido' })
  email?: string;

  @ApiProperty({
    description: 'Nueva contraseña del usuario (mínimo 8 caracteres)',
    example: 'NuevaContraseña123!',
    minLength: 8,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'La contraseña debe ser un texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(100, { message: 'La contraseña no puede exceder 100 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message: 'La contraseña debe contener al menos una letra minúscula, una mayúscula, un número y un carácter especial',
    },
  )
  password?: string;

  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan Carlos',
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un texto' })
  @MaxLength(50, { message: 'El nombre no puede exceder 50 caracteres' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, {
    message: 'El nombre solo puede contener letras y espacios',
  })
  firstName?: string;

  @ApiProperty({
    description: 'Apellido del usuario',
    example: 'Pérez García',
    maxLength: 50,
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El apellido debe ser un texto' })
  @MaxLength(50, { message: 'El apellido no puede exceder 50 caracteres' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, {
    message: 'El apellido solo puede contener letras y espacios',
  })
  lastName?: string;

  @ApiProperty({
    description: 'Rol del usuario en el sistema',
    enum: UserRole,
    example: UserRole.TEACHER,
    required: false,
  })
  @IsOptional()
  @IsEnum(UserRole, {
    message: 'El rol debe ser student, teacher o admin',
  })
  role?: UserRole;

  @ApiProperty({
    description: 'URL del avatar del usuario',
    example: 'https://ejemplo.com/nuevo-avatar.jpg',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El avatar debe ser un texto' })
  @MaxLength(500, { message: 'La URL del avatar no puede exceder 500 caracteres' })
  avatar?: string;

  @ApiProperty({
    description: 'Fecha de nacimiento del usuario',
    example: '1995-05-15',
    required: false,
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'La fecha de nacimiento debe tener el formato YYYY-MM-DD',
  })
  dateOfBirth?: string;

  @ApiProperty({
    description: 'Biografía corta del usuario',
    example: 'Profesor de matemáticas con 10 años de experiencia',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'La biografía debe ser un texto' })
  @MaxLength(500, { message: 'La biografía no puede exceder 500 caracteres' })
  bio?: string;

  @ApiProperty({
    description: 'Estado activo del usuario',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser verdadero o falso' })
  isActive?: boolean;

  @ApiProperty({
    description: 'Nivel actual del usuario (solo para administradores)',
    example: 5,
    minimum: 1,
    maximum: 100,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'El nivel debe ser un número' })
  @Min(1, { message: 'El nivel mínimo es 1' })
  @Max(100, { message: 'El nivel máximo es 100' })
  level?: number;

  @ApiProperty({
    description: 'Experiencia total del usuario (solo para administradores)',
    example: 2500,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'La experiencia debe ser un número' })
  @Min(0, { message: 'La experiencia no puede ser negativa' })
  experience?: number;

  @ApiProperty({
    description: 'Monedas del usuario (solo para administradores)',
    example: 150,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber({}, { message: 'Las monedas deben ser un número' })
  @Min(0, { message: 'Las monedas no pueden ser negativas' })
  coins?: number;
}
