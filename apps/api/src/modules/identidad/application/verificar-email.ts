import type { PerfilCuenta } from '../domain/cuenta';
import { TokenInvalido } from '../domain/errores';
import type { GeneradorTokenOpaco, Reloj } from '../domain/ports/servicios';
import type { UnidadDeTrabajo } from '../domain/ports/unidad-de-trabajo';

export interface EmailVerificado {
  token: string; // token de sesión (se inicia sesión al verificar)
  perfil: PerfilCuenta;
}

const VIGENCIA_SESION_MS = 7 * 24 * 60 * 60 * 1000; // PA-05

/**
 * CU-E02 · Verificar email. Valida el token (existe, vigente, no usado), activa la cuenta,
 * marca el token usado e inicia sesión — todo en una transacción. Token inválido → 410.
 */
export class VerificarEmail {
  constructor(
    private readonly uow: UnidadDeTrabajo,
    private readonly generador: GeneradorTokenOpaco,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(tokenOpaco: string): Promise<EmailVerificado> {
    const hash = this.generador.hashDe(tokenOpaco);
    return this.uow.transaccion(async (repos) => {
      const ahora = this.reloj.ahora();
      const token = await repos.tokens.buscarVigentePorHash(hash, 'verificacion_email', ahora);
      if (token === null) throw new TokenInvalido();

      await repos.cuentas.verificar(token.cuentaId);
      await repos.tokens.marcarUsado(token.id);

      const sesion = this.generador.generar();
      await repos.sesiones.crear({
        cuentaId: token.cuentaId,
        tokenHash: sesion.hash,
        ip: null,
        userAgent: null,
        expiraEn: new Date(ahora.getTime() + VIGENCIA_SESION_MS),
      });
      await repos.auditoria.registrar({
        tipo: 'EmailVerificado',
        sujetoTipo: 'cuenta',
        sujetoId: token.cuentaId,
      });

      const cuenta = await repos.cuentas.buscarPorId(token.cuentaId);
      if (cuenta === null) throw new TokenInvalido();
      return { token: sesion.valor, perfil: cuenta.aPerfil() };
    });
  }
}
