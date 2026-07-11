import { Body, Controller, Delete, HttpCode, HttpException, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import type { PerfilCuenta } from '../../domain/cuenta';
import { ContrasenaFiltrada, CredencialesInvalidas, CuentaBloqueada } from '../../domain/errores';
import { CerrarSesion } from '../../application/cerrar-sesion';
import { IniciarSesion } from '../../application/iniciar-sesion';
import { RegistrarDocente } from '../../application/registrar-docente';
import { COOKIE_SESION, leerCookie } from './cookies';
import { type LoginInput, loginSchema, type RegistroInput, registroSchema } from './esquemas';

const VIGENCIA_SESION_MS = 7 * 24 * 60 * 60 * 1000; // PA-05

/** Traduce errores de dominio a HTTP; el filtro global les da forma RFC 9457 (2.4 §4). */
function mapearError(error: unknown): never {
  if (error instanceof ContrasenaFiltrada) {
    throw new HttpException({ title: 'Contraseña insegura', detail: error.message }, 422);
  }
  if (error instanceof CredencialesInvalidas) {
    throw new HttpException({ title: 'No autorizado', detail: error.message }, 401);
  }
  if (error instanceof CuentaBloqueada) {
    throw new HttpException({ title: 'Cuenta bloqueada', detail: error.message }, 423);
  }
  throw error;
}

interface RespuestaLogin {
  token: string;
  cuenta: PerfilCuenta;
  capacidades_limitadas: boolean;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly registrar: RegistrarDocente,
    private readonly iniciar: IniciarSesion,
    private readonly cerrar: CerrarSesion,
  ) {}

  /** CU-001. Respuesta idéntica exista o no el email (anti-enumeración). */
  @Post('registro')
  @HttpCode(201)
  async registro(
    @Body(new ZodValidationPipe(registroSchema)) input: RegistroInput,
  ): Promise<{ mensaje: string }> {
    try {
      await this.registrar.ejecutar(input);
    } catch (error) {
      mapearError(error);
    }
    return { mensaje: 'Si el email es válido, te enviamos instrucciones para verificar la cuenta.' };
  }

  /** CU-002. Sesión dual: token en el cuerpo (Bearer/APK) + cookie httpOnly (web). */
  @Post('sesion')
  @HttpCode(200)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) input: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RespuestaLogin> {
    try {
      const sesion = await this.iniciar.ejecutar({
        email: input.email,
        contrasena: input.contrasena,
        ip: req.ip ?? null,
        userAgent: req.headers['user-agent'] ?? null,
      });
      this.setCookieSesion(res, sesion.token);
      return {
        token: sesion.token,
        cuenta: sesion.perfil,
        capacidades_limitadas: sesion.capacidadesLimitadas,
      };
    } catch (error) {
      mapearError(error);
    }
  }

  /** CU-003. Invalidación server-side; idempotente. */
  @Delete('sesion')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = this.extraerToken(req);
    if (token !== null) await this.cerrar.ejecutar(token);
    res.clearCookie(COOKIE_SESION, { path: '/' });
  }

  private setCookieSesion(res: Response, token: string): void {
    res.cookie(COOKIE_SESION, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: VIGENCIA_SESION_MS,
      path: '/',
    });
  }

  private extraerToken(req: Request): string | null {
    const auth = req.headers.authorization;
    if (auth !== undefined && auth.startsWith('Bearer ')) return auth.slice('Bearer '.length);
    return leerCookie(req.headers.cookie, COOKIE_SESION);
  }
}
