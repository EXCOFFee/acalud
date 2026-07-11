export type EstadoCuenta = 'no_verificada' | 'verificada';

export interface DatosCuenta {
  readonly id: string;
  readonly email: string;
  readonly hashPassword: string;
  readonly nombre: string;
  readonly apellido: string;
  readonly estado: EstadoCuenta;
  readonly esAdmin: boolean;
  readonly intentosFallidos: number;
  readonly intentosDesde: Date | null;
  readonly bloqueadaHasta: Date | null;
}

/** Nuevo estado de seguridad a persistir tras un intento de login (PA-02). */
export interface EstadoSeguridad {
  readonly intentosFallidos: number;
  readonly intentosDesde: Date | null;
  readonly bloqueadaHasta: Date | null;
  /** Si no es null, se actualiza `ultimo_login` (solo en login exitoso). */
  readonly ultimoLogin: Date | null;
  readonly bloqueada: boolean;
  /** true si este intento fue el que gatilló el bloqueo (para enviar el aviso una sola vez). */
  readonly recienBloqueada: boolean;
}

export interface PerfilCuenta {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  estado: EstadoCuenta;
  es_admin: boolean;
}

const UMBRAL_BLOQUEO = 5; // PA-02: 5 intentos fallidos
const VENTANA_MS = 15 * 60 * 1000; // en 15 minutos
const BLOQUEO_MS = 15 * 60 * 1000; // → bloqueo de 15 minutos

/**
 * Aggregate `Cuenta` (BC1 Identidad). Concentra las invariantes de seguridad del login
 * (PA-02) sin conocer ni HTTP ni la BD. Los efectos (hash, persistencia) los hacen los
 * puertos; acá vive la decisión de negocio.
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

  /** PA-06: la cuenta no verificada navega logueada pero con capacidades limitadas. */
  get capacidadesLimitadas(): boolean {
    return this.datos.estado === 'no_verificada';
  }

  estaBloqueada(ahora: Date): boolean {
    return (
      this.datos.bloqueadaHasta !== null &&
      this.datos.bloqueadaHasta.getTime() > ahora.getTime()
    );
  }

  /** Aplica un intento fallido con ventana deslizante de 15 min (PA-02). */
  registrarFallo(ahora: Date): EstadoSeguridad {
    const dentroDeVentana =
      this.datos.intentosDesde !== null &&
      ahora.getTime() - this.datos.intentosDesde.getTime() <= VENTANA_MS;

    const intentos = dentroDeVentana ? this.datos.intentosFallidos + 1 : 1;
    const intentosDesde = dentroDeVentana ? this.datos.intentosDesde : ahora;
    const alcanzaUmbral = intentos >= UMBRAL_BLOQUEO;

    return {
      intentosFallidos: intentos,
      intentosDesde,
      bloqueadaHasta: alcanzaUmbral ? new Date(ahora.getTime() + BLOQUEO_MS) : null,
      ultimoLogin: null,
      bloqueada: alcanzaUmbral,
      recienBloqueada: alcanzaUmbral,
    };
  }

  /** Estado de seguridad tras un login exitoso: resetea el contador y marca último login. */
  resetearSeguridad(ahora: Date): EstadoSeguridad {
    return {
      intentosFallidos: 0,
      intentosDesde: null,
      bloqueadaHasta: null,
      ultimoLogin: ahora,
      bloqueada: false,
      recienBloqueada: false,
    };
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
