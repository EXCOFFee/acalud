import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { AuthGuard } from './auth.guard';

@Injectable()
export class OpcionalAuthGuard extends AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      await super.canActivate(context);
    } catch (_e) {
      // Ignoramos el error, permitiendo la request anónima
    }
    return true; // Siempre permite el paso
  }
}
