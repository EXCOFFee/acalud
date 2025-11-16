import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/user.entity';

/**
 * Decorador personalizado para extraer información del usuario autenticado
 * 
 * Permite obtener datos del usuario desde el contexto de la request
 * después de que el JWT ha sido validado por el JwtAuthGuard
 * 
 * Uso básico:
 * @GetUser() user: User - Obtiene el objeto usuario completo
 * @GetUser('id') userId: string - Obtiene solo el ID del usuario
 * @GetUser('role') userRole: UserRole - Obtiene solo el rol del usuario
 * 
 * @author Sistema de Gestión Educativa AcaLud
 * @version 1.0.0
 */
export const GetUser = createParamDecorator(
  /**
   * Extrae información del usuario del contexto de la request
   * 
   * @param data - Propiedad específica del usuario a extraer (opcional)
   * @param ctx - Contexto de ejecución de NestJS
   * @returns Usuario completo o propiedad específica del usuario
   */
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    // Obtener la request desde el contexto
    const request = ctx.switchToHttp().getRequest();
    
    // El usuario se encuentra en request.user después de la validación JWT
    const user: User = request.user;
    
    // Si no se especifica una propiedad, retornar el usuario completo
    if (!data) {
      return user;
    }
    
    // Retornar la propiedad específica solicitada
    return user[data];
  },
);