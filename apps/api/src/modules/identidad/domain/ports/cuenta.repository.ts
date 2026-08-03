import type { Cuenta } from '../cuenta';
import type { ResultadoIntento } from '../politica-bloqueo';

export interface DatosNuevaCuenta {
  email: string;
  hashPassword: string;
  nombre: string;
  apellido: string;
}

export interface DatosPerfilCuenta {
  nombre: string;
  apellido: string;
  nivelEducativo?: string | null;
  materia?: string | null;
  institucion?: string | null;
}

export interface PerfilDocentePersistido {
  nivelEducativo: string | null;
  materia: string | null;
  institucion: string | null;
}

export interface CuentaRepository {
  buscarPorEmail(email: string): Promise<Cuenta | null>;
  buscarPorId(id: string): Promise<Cuenta | null>;
  crear(datos: DatosNuevaCuenta): Promise<Cuenta>;
  /** Marca el correo como confirmado (CU-E02). */
  verificar(id: string): Promise<void>;
  /** Reemplaza el hash de contraseña (recuperación, CU-02 RNF-005). */
  actualizarContrasena(id: string, hashPassword: string): Promise<void>;
  /** Reemplaza el email tras confirmar el testigo de cambio (CU-34 paso 18). */
  actualizarEmail(id: string, nuevoEmail: string): Promise<void>;
  /** Registra el instante del último acceso (CU-02 RN-003). */
  registrarUltimoLogin(id: string, ahora: Date): Promise<void>;
  /** Actualiza nombre completo y datos pedagógicos del perfil docente. */
  actualizarPerfil(id: string, datos: DatosPerfilCuenta): Promise<void>;
  /** Devuelve los datos pedagógicos persistidos del docente, si existen. */
  buscarPerfil(id: string): Promise<PerfilDocentePersistido | null>;
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
