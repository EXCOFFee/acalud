export type EstadoCuenta = 'no_verificada' | 'verificada';

export interface DatosCuenta {
  readonly id: string;
  readonly email: string;
  readonly hashPassword: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly estado: EstadoCuenta;
  readonly esAdmin: boolean;
}

export interface PerfilCuenta {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  estado: EstadoCuenta;
  es_admin: boolean;
}

/**
 * Aggregate `Cuenta` (users). Concentra las invariantes de la cuenta sin conocer ni HTTP ni la
 * BD. El bloqueo por fuerza bruta ya no vive acá: se calcula sobre `login_attempts` según la
 * política de dominio (ver politica-bloqueo.ts, decisión Δ3).
 */
export class Cuenta {
  constructor(private readonly datos: DatosCuenta) {}

  get id(): string {
    return this.datos.id;
  }
  get email(): string {
    return this.datos.email;
  }
  get hashPassword(): string {
    return this.datos.hashPassword;
  }
  get estado(): EstadoCuenta {
    return this.datos.estado;
  }
  get esAdmin(): boolean {
    return this.datos.esAdmin;
  }

  /** El correo aún no fue confirmado. La verificación NO condiciona el acceso (addendum II §2). */
  get capacidadesLimitadas(): boolean {
    return this.datos.estado === 'no_verificada';
  }

  aPerfil(): PerfilCuenta {
    return {
      id: this.datos.id,
      email: this.datos.email,
      nombre: this.datos.nombre,
      apellido: this.datos.apellido,
      estado: this.datos.estado,
      es_admin: this.datos.esAdmin,
    };
  }
}
