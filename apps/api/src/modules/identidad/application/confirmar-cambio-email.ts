import { TokenInvalido } from '../domain/errores';
import type { GeneradorTokenOpaco, Reloj } from '../domain/ports/servicios';
import type { UnidadDeTrabajo } from '../domain/ports/unidad-de-trabajo';

/**
 * CU-34 (pasos 14-25) · Confirmar cambio de correo. Valida el testigo (existe, vigente, no
 * usado — A4/A5/A6), efectiviza el cambio de email, marca el correo confirmado como verificado
 * (mismo doble efecto que CU-E01/RestablecerContrasena), notifica al correo anterior y al
 * nuevo, y audita — todo en una transacción. No cierra la sesión activa: el paso 26 del CU es
 * explícitamente opcional y RN-004 exige que la cuenta nunca quede inaccesible.
 */
export class ConfirmarCambioEmail {
  constructor(
    private readonly uow: UnidadDeTrabajo,
    private readonly generador: GeneradorTokenOpaco,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(tokenOpaco: string): Promise<void> {
    const hash = this.generador.hashDe(tokenOpaco);
    await this.uow.transaccion(async (repos) => {
      const ahora = this.reloj.ahora();
      const token = await repos.tokens.buscarVigentePorHash(hash, 'cambio_email', ahora);
      if (token === null || token.emailNuevo === null) throw new TokenInvalido();

      const cuenta = await repos.cuentas.buscarPorId(token.cuentaId);
      if (cuenta === null) throw new TokenInvalido();

      await repos.cuentas.actualizarEmail(token.cuentaId, token.emailNuevo);
      await repos.cuentas.verificar(token.cuentaId); // paso 19: el correo confirmado queda verificado
      await repos.tokens.marcarUsado(token.id);

      await repos.outbox.encolar({
        tipo: 'cambio_email_confirmado_anterior',
        destinatario: cuenta.email, // el correo VIEJO, leído antes de la actualización
        payload: { email_nuevo: token.emailNuevo },
      });
      await repos.outbox.encolar({
        tipo: 'cambio_email_confirmado_nuevo',
        destinatario: token.emailNuevo,
        payload: {},
      });
      await repos.auditoria.registrar({
        tipo: 'EmailCambiado',
        sujetoTipo: 'cuenta',
        sujetoId: token.cuentaId,
        actorId: token.cuentaId,
        datos: { email_anterior: cuenta.email, email_nuevo: token.emailNuevo },
      });
    });
  }
}
