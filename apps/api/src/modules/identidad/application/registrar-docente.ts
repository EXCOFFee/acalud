import { normalizarEmail } from '../domain/email';
import { ContrasenaFiltrada } from '../domain/errores';
import type {
  GeneradorTokenOpaco,
  HasherContrasena,
  Reloj,
  VerificadorContrasenaFiltrada,
} from '../domain/ports/servicios';
import type { UnidadDeTrabajo } from '../domain/ports/unidad-de-trabajo';

export interface RegistrarDocenteInput {
  email: string;
  contrasena: string;
  nombre: string;
  apellido: string;
}

const VIGENCIA_TOKEN_VERIFICACION_MS = 24 * 60 * 60 * 1000; // PA-03: 24 h

/**
 * CU-001 · Registrar Docente. Crea la cuenta `no_verificada` + token de verificación + email,
 * todo en UNA transacción. Anti-enumeración (A1): si el email ya existe, responde igual pero
 * encola un email "cuenta-existente" y no crea nada.
 */
export class RegistrarDocente {
  constructor(
    private readonly uow: UnidadDeTrabajo,
    private readonly hasher: HasherContrasena,
    private readonly generador: GeneradorTokenOpaco,
    private readonly filtrada: VerificadorContrasenaFiltrada,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(input: RegistrarDocenteInput): Promise<void> {
    // PA-01: la longitud la valida Zod en el borde; acá el chequeo de contraseñas filtradas.
    if (await this.filtrada.esFiltrada(input.contrasena)) {
      throw new ContrasenaFiltrada();
    }
    const email = normalizarEmail(input.email);

    await this.uow.transaccion(async (repos) => {
      const existente = await repos.cuentas.buscarPorEmail(email);
      if (existente !== null) {
        await repos.outbox.encolar({ tipo: 'cuenta-existente', destinatario: email, payload: {} });
        return;
      }

      const hash = await this.hasher.hash(input.contrasena);
      const cuenta = await repos.cuentas.crear({
        email,
        hashPassword: hash,
        nombre: input.nombre,
        apellido: input.apellido,
      });

      const token = this.generador.generar();
      await repos.tokens.crear({
        cuentaId: cuenta.id,
        tipo: 'verificacion_email',
        tokenHash: token.hash,
        expiraEn: new Date(this.reloj.ahora().getTime() + VIGENCIA_TOKEN_VERIFICACION_MS),
      });
      await repos.outbox.encolar({
        tipo: 'verificacion_email',
        destinatario: email,
        payload: { token: token.valor },
      });
      await repos.auditoria.registrar({
        tipo: 'DocenteRegistrado',
        sujetoTipo: 'cuenta',
        sujetoId: cuenta.id,
      });
    });
  }
}
