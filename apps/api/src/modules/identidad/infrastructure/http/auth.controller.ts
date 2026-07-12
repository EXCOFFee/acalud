import { Body, Controller, Delete, HttpCode, HttpException, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import type { PerfilCuenta } from '../../domain/cuenta';
import {
  ContrasenaFiltrada,
  CredencialesInvalidas,
  CuentaBloqueada,
  TokenInvalido,
} from '../../domain/errores';
import { CerrarSesion } from '../../application/cerrar-sesion';
import { IniciarSesion } from '../../application/iniciar-sesion';
import { RegistrarDocente } from '../../application/registrar-docente';
import { RestablecerContrasena } from '../../application/restablecer-contrasena';
import { SolicitarRecuperacion } from '../../application/solicitar-recuperacion';
import { VerificarEmail } from '../../application/verificar-email';
import { COOKIE_SESION, leerCookie } from './cookies';
import {
  type LoginInput,
  loginSchema,
  type RecuperacionInput,
  recuperacionSchema,
  type RegistroInput,
  registroSchema,
  type RestablecerInput,
  restablecerSchema,
  type VerificacionInput,
  verificacionSchema,
} from './esquemas';

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
  if (error instanceof TokenInvalido) {
    throw new HttpException({ title: 'Enlace inválido', detail: error.message }, 410);
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
    private readonly verificar: VerificarEmail,
    private readonly solicitarRecuperacion: SolicitarRecuperacion,
    private readonly restablecer: RestablecerContrasena,
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

  /** CU-E02. Verifica el email por token, activa la cuenta e inicia sesión (cookie + token). */
  @Post('verificacion')
  @HttpCode(200)
  async verificacion(
    @Body(new ZodValidationPipe(verificacionSchema)) input: VerificacionInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<RespuestaLogin> {
    try {
      const sesion = await this.verificar.ejecutar(input.token);
      this.setCookieSesion(res, sesion.token);
      return { token: sesion.token, cuenta: sesion.perfil, capacidades_limitadas: false };
    } catch (error) {
      mapearError(error);
    }
  }

  /** CU-E01. Solicitar recuperación. Respuesta idéntica exista o no el email (anti-enumeración). */
  @Post('recuperacion')
  @HttpCode(202)
  async recuperacion(
    @Body(new ZodValidationPipe(recuperacionSchema)) input: RecuperacionInput,
  ): Promise<{ mensaje: string }> {
    await this.solicitarRecuperacion.ejecutar(input.email);
    return { mensaje: 'Si el email está registrado, te enviamos instrucciones para restablecer la contraseña.' };
  }

  /** CU-E01 (pasos 4-5). Fija la contraseña nueva e invalida todas las sesiones. */
  @Post('recuperacion/restablecer')
  @HttpCode(200)
  async restablecerContrasena(
    @Body(new ZodValidationPipe(restablecerSchema)) input: RestablecerInput,
  ): Promise<{ mensaje: string }> {
    try {
      await this.restablecer.ejecutar({
        token: input.token,
        contrasenaNueva: input.contrasena_nueva,
      });
    } catch (error) {
      mapearError(error);
    }
    return { mensaje: 'Tu contraseña fue actualizada. Ya podés ingresar con la nueva.' };
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
