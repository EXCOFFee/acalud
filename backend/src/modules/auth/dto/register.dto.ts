import { IsEmail, IsString, MinLength, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../users/user.entity';
import { IsStrongPassword, IsSafeName } from '../../../common/validators/custom.validators';

export class RegisterDto {
  @ApiProperty({
    description: 'Email del usuario',
    example: 'usuario@ejemplo.com',
  })
  @IsEmail({}, { message: 'Debe ser un email válido' })
  email: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: 'Password123!',
    minLength: 8,
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsStrongPassword({ message: 'La contraseña debe ser segura' })
  password: string;

  @ApiProperty({
    description: 'Nombre del usuario',
    example: 'Juan',
  })
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsSafeName({ message: 'El nombre contiene caracteres no permitidos' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El nombre no debe exceder 50 caracteres' })
  firstName: string;

  @ApiProperty({
    description: 'Apellido del usuario',
    example: 'Pérez',
  })
  @IsString({ message: 'El apellido debe ser una cadena de texto' })
  @IsSafeName({ message: 'El apellido contiene caracteres no permitidos' })
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El apellido no debe exceder 50 caracteres' })
  lastName: string;

  @ApiProperty({
    description: 'Nombre completo del usuario (se genera automáticamente)',
    example: 'Juan Pérez',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El nombre completo debe ser una cadena de texto' })
  @MaxLength(100, { message: 'El nombre completo no debe exceder 100 caracteres' })
  name?: string;

  @ApiProperty({
    description: 'Rol del usuario en el sistema',
    enum: UserRole,
    example: UserRole.STUDENT,
  })
  @IsEnum(UserRole, { message: 'El rol debe ser teacher, student o admin' })
  role: UserRole;

  @ApiProperty({
    description: 'URL del avatar del usuario',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'El avatar debe ser una URL válida' })
  @MaxLength(500, { message: 'La URL del avatar no debe exceder 500 caracteres' })
  avatar?: string;
}
