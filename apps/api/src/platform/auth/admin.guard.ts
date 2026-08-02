import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { RequestAutenticada } from './autenticado';

/**
 * Guard de autorización por rol (RN-001, CU-19): solo `role = 'admin'` puede pasar. Se compone
 * DESPUÉS de `AuthGuard` (`@UseGuards(AuthGuard, AdminGuard)`) — depende de que `req.autenticado`
 * ya esté resuelto, así que no vuelve a tocar la sesión ni la BD.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestAutenticada>();
    if (!req.autenticado?.es_admin) {
      throw new ForbiddenException('Requiere rol de administrador');
    }
    return true;
  }
}
