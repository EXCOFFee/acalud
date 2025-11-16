import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

class InvitationMetadataDto {
  @ApiProperty({
    description: 'Identificador opcional de la fuente que originó el envío',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'source debe ser una cadena de texto' })
  @MaxLength(100, { message: 'source no puede exceder 100 caracteres' })
  source?: string;

  @ApiProperty({
    description: 'Dato adicional opcional para correlacionar invitaciones',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'correlationId debe ser una cadena de texto' })
  @MaxLength(100, { message: 'correlationId no puede exceder 100 caracteres' })
  correlationId?: string;
}

export class InviteStudentsDto {
  @ApiProperty({
    description: 'Lista de correos electrónicos a invitar (máximo 20 por petición)',
    type: [String],
    example: ['estudiante1@colegio.edu', 'estudiante2@colegio.edu'],
    maxItems: 20,
  })
  @IsArray({ message: 'emails debe ser una lista de correos electrónicos' })
  @ArrayNotEmpty({ message: 'Debe proporcionar al menos un correo para invitar' })
  @ArrayMaxSize(20, { message: 'Solo se permiten 20 invitaciones por solicitud' })
  @ArrayUnique({ message: 'Los correos electrónicos no pueden repetirse' })
  @IsEmail({}, { each: true, message: 'Cada correo debe tener un formato válido' })
  @Transform(({ value }) => Array.isArray(value)
    ? Array.from(new Set(value
        .map((email: string) => (typeof email === 'string' ? email.trim().toLowerCase() : email))
        .filter(Boolean)))
    : [])
  emails: string[];

  @ApiProperty({
    description: 'Mensaje personalizado opcional que se incluirá en el correo',
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
    description: 'URL a la que se redirigirá al aceptar la invitación',
    required: false,
    example: 'https://app.acalud.com/auth/register',
  })
  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_tld: false }, { message: 'redirectUrl debe ser una URL válida' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  redirectUrl?: string;

  @ApiProperty({
    description: 'Metadatos adicionales para rastrear el origen del envío',
    required: false,
    type: InvitationMetadataDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => InvitationMetadataDto)
  metadata?: InvitationMetadataDto;
}
