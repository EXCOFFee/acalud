import { normalizarEmail } from '../domain/email';
import type { GeneradorTokenOpaco, Reloj } from '../domain/ports/servicios';
import type { UnidadDeTrabajo } from '../domain/ports/unidad-de-trabajo';

const VIGENCIA_TOKEN_RECUPERACION_MS = 30 * 60 * 1000; // PA-04: 30 min

/**
 * CU-E01 · Solicitar recuperación de contraseña. Anti-enumeración: la respuesta HTTP es
 * siempre idéntica exista o no el email. Solo si la cuenta existe crea un token (PA-04),
 * invalida los tokens de recuperación previos y encola el email — todo en una transacción.
 */
export class SolicitarRecuperacion {
  constructor(
    private readonly uow: UnidadDeTrabajo,
    private readonly generador: GeneradorTokenOpaco,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(emailCrudo: string): Promise<void> {
    const email = normalizarEmail(emailCrudo);
    await this.uow.transaccion(async (repos) => {
      const cuenta = await repos.cuentas.buscarPorEmail(email);
      if (cuenta === null) return; // no se revela; no se encola nada (CU-E01 ALT-001)

      await repos.tokens.invalidarVigentesPorCuenta(cuenta.id, 'recuperacion_password');
      const token = this.generador.generar();
      await repos.tokens.crear({
        cuentaId: cuenta.id,
        tipo: 'recuperacion_password',
        tokenHash: token.hash,
        expiraEn: new Date(this.reloj.ahora().getTime() + VIGENCIA_TOKEN_RECUPERACION_MS),
      });
      await repos.outbox.encolar({
        tipo: 'recuperacion_password',
        destinatario: email,
        payload: { token: token.valor },
      });
      await repos.auditoria.registrar({
        tipo: 'RecuperacionSolicitada',
        sujetoTipo: 'cuenta',
        sujetoId: cuenta.id,
      });
    });
  }
}
