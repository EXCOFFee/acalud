import type { PerfilCuenta } from '../cuenta';

export interface DatosNuevaSesion {
  cuentaId: string;
  tokenHash: string;
  ip: string | null;
  userAgent: string | null;
  expiraEn: Date;
}

/** Sesión activa resuelta junto con su cuenta (para el guard de transporte dual, ADR-004). */
export interface SesionConCuenta {
  sesionId: string;
  perfil: PerfilCuenta;
  capacidadesLimitadas: boolean;
}

export interface SesionRepository {
  crear(datos: DatosNuevaSesion): Promise<void>;
  buscarActivaPorTokenHash(tokenHash: string, ahora: Date): Promise<SesionConCuenta | null>;
  revocarPorTokenHash(tokenHash: string, ahora: Date): Promise<void>;
  /** Revoca todas las sesiones activas de una cuenta (CU-E01: restablecer contraseña). */
  revocarTodasDeCuenta(cuentaId: string, ahora: Date): Promise<void>;
  renovar(sesionId: string, expiraEn: Date): Promise<void>;
}

export const SESION_REPOSITORY = Symbol('SesionRepository');
