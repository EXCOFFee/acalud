import { Controller, Get, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { AuthGuard, type RequestAutenticada } from './auth.guard';

interface RespuestaPerfil {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  estado: string;
  es_admin: boolean;
  capacidades_limitadas: boolean;
  membresias: unknown[];
}

/** GET /me · perfil propio. Demuestra la autenticación dual (cookie o Bearer) del AuthGuard. */
@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  @Get()
  perfil(@Req() req: RequestAutenticada): RespuestaPerfil {
    const cuenta = req.cuenta;
    if (cuenta === undefined) throw new UnauthorizedException();
    return {
      ...cuenta,
      capacidades_limitadas: req.capacidadesLimitadas ?? false,
      membresias: [], // BC7 Institucional aún no implementado
    };
  }
}
