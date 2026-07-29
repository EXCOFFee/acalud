import type { Cuenta } from '../cuenta';
import type { ResultadoIntento } from '../politica-bloqueo';

export interface DatosNuevaCuenta {
  email: string;
  hashPassword: string;
  nombre: string;
  apellido: string;
}

export interface CuentaRepository {
  buscarPorEmail(email: string): Promise<Cuenta | null>;
  buscarPorId(id: string): Promise<Cuenta | null>;
  crear(datos: DatosNuevaCuenta): Promise<Cuenta>;
  /** Marca el correo como confirmado (CU-E02). */
  verificar(id: string): Promise<void>;
  /** Reemplaza el hash de contraseña (recuperación, CU-02 RNF-005). */
  actualizarContrasena(id: string, hashPassword: string): Promise<void>;
  /** Registra el instante del último acceso (CU-02 RN-003). */
  registrarUltimoLogin(id: string, ahora: Date): Promise<void>;
}

export const CUENTA_REPOSITORY = Symbol('CuentaRepository');

/**
 * Registro de intentos de ingreso (`login_attempts`). Sostiene el bloqueo por fuerza bruta
 * (CU-02 RN-007) y deja rastro auditable de cada intento.
 */
export interface IntentosLoginRepository {
  registrar(email: string, ip: string | null, resultado: ResultadoIntento): Promise<void>;
  /** Intentos fallidos para ese email desde el instante dado (ventana del bloqueo). */
  contarFallosDesde(email: string, desde: Date): Promise<number>;
}

export const INTENTOS_LOGIN_REPOSITORY = Symbol('IntentosLoginRepository');
