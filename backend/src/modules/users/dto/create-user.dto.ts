import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  Matches,
} from 'class-validator';
import { UserRole } from '../user.entity';

/**
 * DTO para la creación de un nuevo usuario
 * Define la estructura y validaciones para los datos de entrada
 */
export class CreateUserDto {
  @ApiProperty({
    description: 'Email único del usuario',
    example: 'usuario@ejemplo.com',
  })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  @IsNotEmpty({ message: 'El email es obligatorio' })
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario (mínimo 8 caracteres)',
    example: 'MiContraseña123!',
    minLength: 8,
  })
  @IsString({ message: 'La contraseña debe ser un texto' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(100, { message: 'La contraseña no puede exceder 100 caracteres' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message: 'La contraseña debe contener al menos una letra minúscula, una mayúscula, un número y un carácter especial',
    },
  )
  password: string;

  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan',
    maxLength: 50,
  })
  @IsString({ message: 'El nombre debe ser un texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(50, { message: 'El nombre no puede exceder 50 caracteres' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, {
    message: 'El nombre solo puede contener letras y espacios',
  })
  firstName: string;

  @ApiProperty({
    description: 'Apellido del usuario',
    example: 'Pérez',
    maxLength: 50,
  })
  @IsString({ message: 'El apellido debe ser un texto' })
  @IsNotEmpty({ message: 'El apellido es obligatorio' })
  @MaxLength(50, { message: 'El apellido no puede exceder 50 caracteres' })
  @Matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, {
    message: 'El apellido solo puede contener letras y espacios',
  })
  lastName: string;

  @ApiProperty({
    description: 'Rol del usuario en el sistema',
    enum: UserRole,
    example: UserRole.STUDENT,
  })
  @IsEnum(UserRole, {
    message: 'El rol debe ser student, teacher o admin',
  })
  role: UserRole;

  @ApiProperty({
    description: 'URL del avatar del usuario',
    example: 'https://ejemplo.com/avatar.jpg',
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
    example: 'Estudiante de ingeniería apasionado por la tecnología',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'La biografía debe ser un texto' })
  @MaxLength(500, { message: 'La biografía no puede exceder 500 caracteres' })
  bio?: string;
}
