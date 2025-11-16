import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO para la respuesta de actualización de avatar
 * CU-11: Modificar Avatar de Usuario
 */
export class UpdateAvatarResponseDto {
  @ApiProperty({
    description: 'ID del usuario',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    description: 'URL del nuevo avatar',
    example: 'https://api.example.com/uploads/avatars/avatar-1633024800000-123456789.jpg',
  })
  avatar: string;

  @ApiProperty({
    description: 'Mensaje de confirmación',
    example: 'Avatar actualizado exitosamente',
  })
  message: string;
}
