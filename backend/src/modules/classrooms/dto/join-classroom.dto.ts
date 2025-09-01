import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

/**
 * DTO para unirse a un aula usando código de invitación
 * Define la estructura y validaciones para el código de acceso
 */
export class JoinClassroomDto {
  @ApiProperty({
    description: 'Código de invitación del aula (8 caracteres alfanuméricos)',
    example: 'ABC12345',
    minLength: 8,
    maxLength: 8,
  })
  @IsString({ message: 'El código de invitación debe ser un texto' })
  @IsNotEmpty({ message: 'El código de invitación es obligatorio' })
  @Length(8, 8, { message: 'El código de invitación debe tener exactamente 8 caracteres' })
  @Matches(/^[A-Z0-9]+$/, {
    message: 'El código de invitación solo puede contener letras mayúsculas y números',
  })
  inviteCode: string;
}
