import type { SesionRepository } from '../domain/ports/sesion.repository';
import type { GeneradorTokenOpaco, Reloj } from '../domain/ports/servicios';

/**
 * CU-003 · Cerrar sesión. Invalida la sesión **server-side** (no basta con borrar la cookie).
 * Idempotente: si el token ya no corresponde a una sesión activa, no falla (misma redirección).
 * La revocación afecta a ambos canales a la vez (ADR-004: store único).
 */
export class CerrarSesion {
  constructor(
    private readonly sesiones: SesionRepository,
    private readonly generador: GeneradorTokenOpaco,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(tokenOpaco: string): Promise<void> {
    const tokenHash = this.generador.hashDe(tokenOpaco);
    await this.sesiones.revocarPorTokenHash(tokenHash, this.reloj.ahora());
  }
}
