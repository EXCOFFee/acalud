import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Post,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '../../../../platform/auth/auth.guard';
import type { RequestAutenticada } from '../../../../platform/auth/autenticado';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { ActualizarPerfil } from '../../application/actualizar-perfil';
import { SolicitarCambioEmail } from '../../application/solicitar-cambio-email';
import { CUENTA_REPOSITORY, type CuentaRepository } from '../../domain/ports/cuenta.repository';
import { ContrasenaIncorrecta, EmailIgualAlActual, EmailYaRegistrado } from '../../domain/errores';
import { type CambioEmailInput, cambioEmailSchema, type PerfilInput, perfilSchema } from './esquemas';

function mapearError(error: unknown): never {
  if (error instanceof ContrasenaIncorrecta) {
    throw new HttpException({ title: 'No autorizado', detail: error.message }, 401);
  }
  if (error instanceof EmailYaRegistrado) {
    throw new HttpException({ title: 'Correo no disponible', detail: error.message }, 422);
  }
  if (error instanceof EmailIgualAlActual) {
    throw new HttpException({ title: 'Correo inválido', detail: error.message }, 422);
  }
  throw error;
}

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
    private readonly solicitarCambioEmail: SolicitarCambioEmail,
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

  /** CU-34 (pasos 1-13). No efectiviza el cambio: envía el testigo de verificación al correo nuevo. */
  @Post('cambio-correo')
  @HttpCode(202)
  async cambioCorreo(
    @Req() req: RequestAutenticada,
    @Body(new ZodValidationPipe(cambioEmailSchema)) input: CambioEmailInput,
  ): Promise<{ mensaje: string }> {
    const cuenta = req.autenticado;
    if (cuenta === undefined) throw new UnauthorizedException();

    try {
      await this.solicitarCambioEmail.ejecutar({
        cuentaId: cuenta.id,
        nuevoEmail: input.nuevo_email,
        contrasena: input.contrasena,
      });
    } catch (error) {
      mapearError(error);
    }
    return {
      mensaje: 'Se ha enviado un enlace de verificación a tu nuevo correo. Revisá tu bandeja de entrada.',
    };
  }
}
