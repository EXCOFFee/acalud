/**
 * DTO para solicitud de recuperación de contraseña
 */
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestPasswordResetDto {
  /**
   * Email del usuario para recuperación
   */
  @ApiProperty({
    description: 'Email del usuario para recuperación de contraseña',
    example: 'usuario@example.com',
    format: 'email'
  })
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;
}

/**
 * DTO para validación de token
 */
export class ValidateTokenDto {
  /**
   * Token de recuperación
   */
  @ApiProperty({
    description: 'Token de recuperación de contraseña',
    example: 'abc123def456...',
    minLength: 64,
    maxLength: 128
  })
  @IsString({ message: 'El token debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El token es requerido' })
  token: string;
}

/**
 * DTO para reseteo de contraseña
 */
export class ResetPasswordDto {
  /**
   * Token de recuperación
   */
  @ApiProperty({
    description: 'Token de recuperación de contraseña',
    example: 'abc123def456...',
    minLength: 64,
    maxLength: 128
  })
  @IsString({ message: 'El token debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El token es requerido' })
  token: string;

  /**
   * Nueva contraseña
   */
  @ApiProperty({
    description: 'Nueva contraseña del usuario',
    example: 'MiNuevaPassword123!',
    minLength: 8
  })
  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La nueva contraseña es requerida' })
  newPassword: string;

  /**
   * Confirmación de la nueva contraseña
   */
  @ApiProperty({
    description: 'Confirmación de la nueva contraseña',
    example: 'MiNuevaPassword123!',
    minLength: 8
  })
  @IsString({ message: 'La confirmación debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La confirmación de contraseña es requerida' })
  confirmPassword: string;
}