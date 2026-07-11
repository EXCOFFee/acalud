import type { Cuenta, EstadoSeguridad } from '../cuenta';

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
  actualizarSeguridad(id: string, seguridad: EstadoSeguridad): Promise<void>;
  /** Marca la cuenta como verificada (CU-E02). */
  verificar(id: string): Promise<void>;
}

export const CUENTA_REPOSITORY = Symbol('CuentaRepository');
