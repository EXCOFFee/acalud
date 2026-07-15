import type { Request } from 'express';

/** Identidad mínima resuelta por el guard de autenticación (transversal, sin PII de más). */
export interface Autenticado {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  estado: 'no_verificada' | 'verificada';
  es_admin: boolean;
}

/** Request con la cuenta ya resuelta por el `AuthGuard` de platform. */
export interface RequestAutenticada extends Request {
  autenticado?: Autenticado;
  capacidadesLimitadas?: boolean;
}
