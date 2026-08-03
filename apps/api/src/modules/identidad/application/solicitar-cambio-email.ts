import { normalizarEmail } from '../domain/email';
import { ContrasenaIncorrecta, EmailIgualAlActual, EmailYaRegistrado } from '../domain/errores';
import type { CuentaRepository } from '../domain/ports/cuenta.repository';
import type { GeneradorTokenOpaco, HasherContrasena, Reloj } from '../domain/ports/servicios';
import type { UnidadDeTrabajo } from '../domain/ports/unidad-de-trabajo';

export interface SolicitarCambioEmailInput {
  cuentaId: string;
  nuevoEmail: string;
  contrasena: string;
}

const VIGENCIA_TOKEN_CAMBIO_EMAIL_MS = 24 * 60 * 60 * 1000; // RNF-003: 24 h

/**
 * CU-34 (pasos 1-13) · Solicitar cambio de correo. El docente, ya logueado, pide cambiar su
 * email: la contraseña vigente verifica identidad (RN-006) y el nuevo correo debe ser único
 * (RN-005/RN-011, sin revelar la otra cuenta) y distinto del actual. El cambio recién se
 * efectiviza cuando se confirma el testigo enviado al correo nuevo (RN-001/RN-002) — hasta
 * entonces el correo actual sigue vigente y operativo (RN-003/RN-004).
 */
export class SolicitarCambioEmail {
  constructor(
    private readonly uow: UnidadDeTrabajo,
    private readonly cuentas: CuentaRepository,
    private readonly hasher: HasherContrasena,
    private readonly generador: GeneradorTokenOpaco,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(input: SolicitarCambioEmailInput): Promise<void> {
    const nuevoEmail = normalizarEmail(input.nuevoEmail);

    const cuenta = await this.cuentas.buscarPorId(input.cuentaId);
    if (cuenta === null) throw new Error('Cuenta no encontrada');

    // Paso 7 (el formato ya lo validó Zod en el borde): el nuevo correo debe diferir del actual.
    if (nuevoEmail === normalizarEmail(cuenta.email)) throw new EmailIgualAlActual();

    // Paso 8: contraseña vigente. Fuera de la transacción —argon2 es costoso en CPU y no debe
    // retener una conexión de la pool (mismo criterio que CU-02/IniciarSesion).
    const passwordOk = await this.hasher.verificar(cuenta.hashPassword, input.contrasena);
    if (!passwordOk) throw new ContrasenaIncorrecta();

    await this.uow.transaccion(async (repos) => {
      // Paso 9 (RN-005/RN-011): unicidad, sin revelar la existencia de la otra cuenta.
      const existente = await repos.cuentas.buscarPorEmail(nuevoEmail);
      if (existente !== null) throw new EmailYaRegistrado();

      // Al emitir un testigo nuevo, cualquier solicitud de cambio anterior queda invalidada.
      await repos.tokens.invalidarVigentesPorCuenta(cuenta.id, 'cambio_email');
      const token = this.generador.generar();
      await repos.tokens.crear({
        cuentaId: cuenta.id,
        tipo: 'cambio_email',
        tokenHash: token.hash,
        expiraEn: new Date(this.reloj.ahora().getTime() + VIGENCIA_TOKEN_CAMBIO_EMAIL_MS),
        emailNuevo: nuevoEmail,
      });
      await repos.outbox.encolar({
        tipo: 'cambio_email_verificacion',
        destinatario: nuevoEmail,
        payload: { token: token.valor },
      });
      await repos.auditoria.registrar({
        tipo: 'CambioEmailSolicitado',
        sujetoTipo: 'cuenta',
        sujetoId: cuenta.id,
        actorId: cuenta.id,
        datos: { email_actual: cuenta.email, email_nuevo: nuevoEmail },
      });
    });
  }
}
