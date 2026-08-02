import { Body, Controller, Get, Put, Req, UnauthorizedException, UseGuards, Inject } from '@nestjs/common';
import { AuthGuard } from '../../../../platform/auth/auth.guard';
import type { RequestAutenticada } from '../../../../platform/auth/autenticado';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { ActualizarPerfil } from '../../application/actualizar-perfil';
import { CUENTA_REPOSITORY, type CuentaRepository } from '../../domain/ports/cuenta.repository';
import { type PerfilInput, perfilSchema } from './esquemas';

interface RespuestaPerfil {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  estado: string;
  es_admin: boolean;
  capacidades_limitadas: boolean;
  nivel_educativo: string | null;
  materia: string | null;
  institucion: string | null;
  membresias: unknown[];
}

/** GET /me · perfil propio. Demuestra la autenticación dual (cookie o Bearer) del AuthGuard. */
@Controller('me')
@UseGuards(AuthGuard)
export class MeController {
  constructor(
    private readonly actualizarPerfil: ActualizarPerfil,
    @Inject(CUENTA_REPOSITORY) private readonly cuentas: CuentaRepository,
  ) {}

  @Get()
  async perfil(@Req() req: RequestAutenticada): Promise<RespuestaPerfil> {
    const cuenta = req.autenticado;
    if (cuenta === undefined) throw new UnauthorizedException();

    const perfilPersistido = await this.cuentas.buscarPerfil(cuenta.id);

    return {
      ...cuenta,
      capacidades_limitadas: req.capacidadesLimitadas ?? false,
      nivel_educativo: perfilPersistido?.nivelEducativo ?? null,
      materia: perfilPersistido?.materia ?? null,
      institucion: perfilPersistido?.institucion ?? null,
      membresias: [], // BC7 Institucional aún no implementado
    };
  }

  @Put()
  async actualizar(
    @Req() req: RequestAutenticada,
    @Body(new ZodValidationPipe(perfilSchema)) input: PerfilInput,
  ): Promise<RespuestaPerfil> {
    const cuenta = req.autenticado;
    if (cuenta === undefined) throw new UnauthorizedException();

    const perfil = await this.actualizarPerfil.ejecutar({
      id: cuenta.id,
      nombre: input.nombre,
      apellido: input.apellido,
      nivelEducativo: input.nivel_educativo ?? null,
      materia: input.materia ?? null,
      institucion: input.institucion ?? null,
    });

    return {
      ...perfil,
      capacidades_limitadas: req.capacidadesLimitadas ?? false,
      nivel_educativo: perfil.nivel_educativo ?? null,
      materia: perfil.materia ?? null,
      institucion: perfil.institucion ?? null,
      membresias: [],
    };
  }
}
