import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ResendInvitationDto {
  @ApiProperty({
    description: 'Mensaje opcional que reemplazará al anterior en el correo reenviado',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'message debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'message no puede estar vacío si se proporciona' })
  @MaxLength(500, { message: 'message no puede exceder 500 caracteres' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  message?: string;

  @ApiProperty({
    description: 'URL a la que se redirigirá al aceptar la invitación reenviada',
    required: false,
    example: 'https://app.acalud.com/my-classrooms',
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_tld: false }, { message: 'redirectUrl debe ser una URL válida' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  redirectUrl?: string;
}
