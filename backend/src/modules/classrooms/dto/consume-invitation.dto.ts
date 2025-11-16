import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ConsumeInvitationDto {
  @ApiProperty({ description: 'Token único que identifica la invitación' })
  @IsString({ message: 'token debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'token es obligatorio' })
  @MinLength(16, { message: 'token debe tener al menos 16 caracteres' })
  @MaxLength(96, { message: 'token no puede exceder 96 caracteres' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  token!: string;

  @ApiProperty({ description: 'Correo electrónico del estudiante que acepta la invitación' })
  @IsEmail({}, { message: 'email debe ser un correo electrónico válido' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  email!: string;
}
