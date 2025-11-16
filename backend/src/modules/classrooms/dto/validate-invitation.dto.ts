import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ValidateInvitationDto {
  @ApiProperty({ description: 'Token único de la invitación emitida por el aula' })
  @IsString({ message: 'token debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'token es obligatorio' })
  @MinLength(16, { message: 'token debe tener al menos 16 caracteres' })
  @MaxLength(96, { message: 'token no puede exceder 96 caracteres' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  token!: string;
}
