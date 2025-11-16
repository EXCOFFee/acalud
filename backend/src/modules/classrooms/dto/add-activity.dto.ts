import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

/**
 * DTO para agregar una actividad existente a un aula
 * CU-20: Agregar Actividad a Aula
 */
export class AddActivityDto {
  @ApiProperty({
    description: 'ID de la actividad a agregar al aula',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID('4', { message: 'El ID de la actividad debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de la actividad es obligatorio' })
  activityId: string;
}
