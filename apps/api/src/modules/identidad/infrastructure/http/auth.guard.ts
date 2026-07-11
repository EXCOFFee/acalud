import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import type { PerfilCuenta } from '../../domain/cuenta';
import { SESION_REPOSITORY, type SesionRepository } from '../../domain/ports/sesion.repository';
import {
  GENERADOR_TOKEN,
  type GeneradorTokenOpaco,
  RELOJ,
  type Reloj,
} from '../../domain/ports/servicios';
import { COOKIE_SESION, leerCookie } from './cookies';

export interface RequestAutenticada extends Request {
  cuenta?: PerfilCuenta;
  capacidadesLimitadas?: boolean;
}

const VIGENCIA_SESION_MS = 7 * 24 * 60 * 60 * 1000; // PA-05

/**
 * Guard de **transporte dual** (ADR-004): autentica por `Authorization: Bearer` (APK) o por
 * cookie httpOnly (web) contra el mismo session store. Aplica la renovación deslizante (PA-05).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(SESION_REPOSITORY) private readonly sesiones: SesionRepository,
    @Inject(GENERADOR_TOKEN) private readonly generador: GeneradorTokenOpaco,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestAutenticada>();
    const token = this.extraerToken(req);
    if (token === null) throw new UnauthorizedException('No autenticado');

    const ahora = this.reloj.ahora();
    const sesion = await this.sesiones.buscarActivaPorTokenHash(
      this.generador.hashDe(token),
      ahora,
    );
    if (sesion === null) throw new UnauthorizedException('No autenticado');

    await this.sesiones.renovar(sesion.sesionId, new Date(ahora.getTime() + VIGENCIA_SESION_MS));

    req.cuenta = sesion.perfil;
    req.capacidadesLimitadas = sesion.capacidadesLimitadas;
    return true;
  }

  private extraerToken(req: Request): string | null {
    const auth = req.headers.authorization;
    if (auth !== undefined && auth.startsWith('Bearer ')) return auth.slice('Bearer '.length);
    return leerCookie(req.headers.cookie, COOKIE_SESION);
  }
}
