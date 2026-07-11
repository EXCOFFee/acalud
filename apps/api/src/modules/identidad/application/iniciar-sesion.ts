import type { PerfilCuenta } from '../domain/cuenta';
import { normalizarEmail } from '../domain/email';
import { CredencialesInvalidas, CuentaBloqueada } from '../domain/errores';
import type { CuentaRepository } from '../domain/ports/cuenta.repository';
import type { GeneradorTokenOpaco, HasherContrasena, Reloj } from '../domain/ports/servicios';
import type { UnidadDeTrabajo } from '../domain/ports/unidad-de-trabajo';

export interface IniciarSesionInput {
  email: string;
  contrasena: string;
  ip: string | null;
  userAgent: string | null;
}

export interface SesionCreada {
  token: string; // token opaco: va como Bearer (APK) y como cookie httpOnly (web)
  perfil: PerfilCuenta;
  capacidadesLimitadas: boolean;
}

const VIGENCIA_SESION_MS = 7 * 24 * 60 * 60 * 1000; // PA-05: 7 días

/**
 * CU-002 · Iniciar sesión. Verifica credenciales en tiempo constante, aplica el bloqueo por
 * fuerza bruta (PA-02) y crea la sesión server-side (ADR-004) cuyo token opaco se transporta
 * dual (cookie web / Bearer APK). Mensajes de error genéricos (anti-enumeración).
 *
 * Nota de atomicidad: el registro del intento fallido se COMMITEA en su propia transacción
 * antes de lanzar el error; si estuviera en la misma tx que el `throw`, el rollback borraría
 * el incremento del contador y el bloqueo nunca se alcanzaría.
 */
export class IniciarSesion {
  constructor(
    private readonly cuentas: CuentaRepository,
    private readonly uow: UnidadDeTrabajo,
    private readonly hasher: HasherContrasena,
    private readonly generador: GeneradorTokenOpaco,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(input: IniciarSesionInput): Promise<SesionCreada> {
    const email = normalizarEmail(input.email);
    const cuenta = await this.cuentas.buscarPorEmail(email);
    const ahora = this.reloj.ahora();

    if (cuenta === null) {
      // Anti-enumeración por timing: se ejecuta el hash igual, con un dummy (CU-002 directiva).
      await this.hasher.verificar(await this.hasher.hashDummy(), input.contrasena);
      throw new CredencialesInvalidas();
    }

    // PA-02 E2: si está bloqueada, no se evalúan credenciales ni se extiende el bloqueo.
    if (cuenta.estaBloqueada(ahora)) {
      throw new CuentaBloqueada();
    }

    const passwordOk = await this.hasher.verificar(cuenta.hashPassword, input.contrasena);
    if (!passwordOk) {
      const seguridad = cuenta.registrarFallo(ahora);
      await this.uow.transaccion(async (repos) => {
        await repos.cuentas.actualizarSeguridad(cuenta.id, seguridad);
        if (seguridad.recienBloqueada) {
          await repos.outbox.encolar({ tipo: 'aviso-bloqueo', destinatario: email, payload: {} });
        }
      });
      throw seguridad.bloqueada ? new CuentaBloqueada() : new CredencialesInvalidas();
    }

    // Éxito: resetea el contador, crea la sesión y audita (con IP y user-agent), todo atómico.
    return this.uow.transaccion(async (repos) => {
      await repos.cuentas.actualizarSeguridad(cuenta.id, cuenta.resetearSeguridad(ahora));
      const token = this.generador.generar();
      await repos.sesiones.crear({
        cuentaId: cuenta.id,
        tokenHash: token.hash,
        ip: input.ip,
        userAgent: input.userAgent,
        expiraEn: new Date(ahora.getTime() + VIGENCIA_SESION_MS),
      });
      await repos.auditoria.registrar({
        tipo: 'SesionIniciada',
        sujetoTipo: 'cuenta',
        sujetoId: cuenta.id,
        datos: { ip: input.ip, userAgent: input.userAgent },
        ip: input.ip,
      });
      return {
        token: token.valor,
        perfil: cuenta.aPerfil(),
        capacidadesLimitadas: cuenta.capacidadesLimitadas,
      };
    });
  }
}
