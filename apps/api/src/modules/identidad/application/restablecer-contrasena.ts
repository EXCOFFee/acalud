import { ContrasenaFiltrada, TokenInvalido } from '../domain/errores';
import type {
  GeneradorTokenOpaco,
  HasherContrasena,
  Reloj,
  VerificadorContrasenaFiltrada,
} from '../domain/ports/servicios';
import type { UnidadDeTrabajo } from '../domain/ports/unidad-de-trabajo';

export interface RestablecerContrasenaInput {
  token: string;
  contrasenaNueva: string;
}

/**
 * CU-E01 · Restablecer contraseña (pasos 4-5). Valida el token (vigente, no usado), fija la
 * nueva contraseña (PA-01), invalida TODAS las sesiones activas y marca el token usado — todo
 * en una transacción. Doble efecto: si la cuenta estaba `no_verificada`, además la verifica
 * (evita cuentas zombies). Token inválido → 410; contraseña filtrada → 422.
 */
export class RestablecerContrasena {
  constructor(
    private readonly uow: UnidadDeTrabajo,
    private readonly hasher: HasherContrasena,
    private readonly generador: GeneradorTokenOpaco,
    private readonly filtrada: VerificadorContrasenaFiltrada,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(input: RestablecerContrasenaInput): Promise<void> {
    // PA-01: la longitud la valida Zod en el borde; acá el chequeo de contraseñas filtradas.
    if (await this.filtrada.esFiltrada(input.contrasenaNueva)) {
      throw new ContrasenaFiltrada();
    }
    const hashToken = this.generador.hashDe(input.token);

    await this.uow.transaccion(async (repos) => {
      const ahora = this.reloj.ahora();
      const token = await repos.tokens.buscarVigentePorHash(hashToken, 'recuperacion_password', ahora);
      if (token === null) throw new TokenInvalido();

      const hashPassword = await this.hasher.hash(input.contrasenaNueva);
      await repos.cuentas.actualizarContrasena(token.cuentaId, hashPassword);
      await repos.cuentas.verificar(token.cuentaId); // doble efecto (idempotente si ya verificada)
      await repos.tokens.marcarUsado(token.id);
      await repos.sesiones.revocarTodasDeCuenta(token.cuentaId, ahora);
      await repos.outbox.encolar({
        tipo: 'recuperacion_confirmada',
        destinatario: (await repos.cuentas.buscarPorId(token.cuentaId))?.email ?? '',
        payload: {},
      });
      await repos.auditoria.registrar({
        tipo: 'ContrasenaRestablecida',
        sujetoTipo: 'cuenta',
        sujetoId: token.cuentaId,
      });
    });
  }
}
