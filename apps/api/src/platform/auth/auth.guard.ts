import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/pg.module';
import type { Autenticado, RequestAutenticada } from './autenticado';

const COOKIE_SESION = 'acalud_sesion';
const VIGENCIA_SESION_MS = 7 * 24 * 60 * 60 * 1000; // PA-05

interface FilaSesionCuenta {
  sesion_id: string;
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  estado: 'no_verificada' | 'verificada';
  es_admin: boolean;
}

/**
 * Guard de autenticación **transversal** (platform): valida la sesión opaca —cookie httpOnly
 * (web) o `Authorization: Bearer` (APK), ADR-004— contra el session store y aplica la
 * renovación deslizante (PA-05). Vive en platform/ porque la autenticación es transversal a
 * todos los bounded contexts, y ADR-002 no permite que un módulo importe el guard de otro.
 * Identidad crea/revoca las sesiones (login/logout); este guard solo las lee (SHA-256 del
 * token opaco, nunca el valor en claro).
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestAutenticada>();
    const token = this.extraerToken(req);
    if (token === null) throw new UnauthorizedException('No autenticado');

    const hash = createHash('sha256').update(token).digest('hex');
    const ahora = new Date();
    const r = await this.pool.query<FilaSesionCuenta>(
      `SELECT s.id AS sesion_id, c.id, c.email, c.nombre, c.apellido, c.estado, c.es_admin
         FROM sesiones s JOIN cuentas c ON c.id = s.cuenta_id
        WHERE s.token_hash = $1 AND s.revocada_en IS NULL AND s.expira_en > $2`,
      [hash, ahora],
    );
    const fila = r.rows[0];
    if (!fila) throw new UnauthorizedException('No autenticado');

    // Renovación deslizante (PA-05).
    await this.pool.query(`UPDATE sesiones SET expira_en = $2 WHERE id = $1`, [
      fila.sesion_id,
      new Date(ahora.getTime() + VIGENCIA_SESION_MS),
    ]);

    const autenticado: Autenticado = {
      id: fila.id,
      email: fila.email,
      nombre: fila.nombre,
      apellido: fila.apellido,
      estado: fila.estado,
      es_admin: fila.es_admin,
    };
    req.autenticado = autenticado;
    req.capacidadesLimitadas = fila.estado === 'no_verificada';
    return true;
  }

  private extraerToken(req: RequestAutenticada): string | null {
    const auth = req.headers.authorization;
    if (auth !== undefined && auth.startsWith('Bearer ')) return auth.slice('Bearer '.length);
    return this.leerCookie(req.headers.cookie, COOKIE_SESION);
  }

  private leerCookie(header: string | undefined, nombre: string): string | null {
    if (!header) return null;
    for (const parte of header.split(';')) {
      const igual = parte.indexOf('=');
      if (igual === -1) continue;
      if (parte.slice(0, igual).trim() === nombre) {
        return decodeURIComponent(parte.slice(igual + 1).trim());
      }
    }
    return null;
  }
}
