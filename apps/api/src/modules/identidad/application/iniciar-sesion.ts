import type { PerfilCuenta } from '../domain/cuenta';
import { normalizarEmail } from '../domain/email';
import { CredencialesInvalidas, CuentaBloqueada } from '../domain/errores';
import type { CuentaRepository, IntentosLoginRepository } from '../domain/ports/cuenta.repository';
import type { GeneradorTokenOpaco, HasherContrasena, Reloj } from '../domain/ports/servicios';
import type { UnidadDeTrabajo } from '../domain/ports/unidad-de-trabajo';
import { estaBloqueadoPorIntentos, ventanaDesde } from '../domain/politica-bloqueo';

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

const VIGENCIA_SESION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * CU-02 · Iniciar sesión. Verifica credenciales en tiempo constante y aplica el bloqueo por
 * fuerza bruta (RN-007: tres intentos, quince minutos) contando los fallos recientes en
 * `login_attempts`. La sesión es opaca con estado en el servidor (ADR-004): el token se
 * transporta dual —cookie en web, Bearer en la APK—. Mensajes genéricos (anti-enumeración).
 *
 * Cada intento se asienta en `login_attempts`, exitoso o fallido: sostiene el bloqueo y deja
 * el rastro auditable con el que se resuelve `last_login` (RN-003).
 */
export class IniciarSesion {
  constructor(
    private readonly cuentas: CuentaRepository,
    private readonly intentos: IntentosLoginRepository,
    private readonly uow: UnidadDeTrabajo,
    private readonly hasher: HasherContrasena,
    private readonly generador: GeneradorTokenOpaco,
    private readonly reloj: Reloj,
  ) {}

  async ejecutar(input: IniciarSesionInput): Promise<SesionCreada> {
    const email = normalizarEmail(input.email);
    const ahora = this.reloj.ahora();

    // Bloqueo vigente: no se evalúan credenciales ni se extiende el bloqueo (A3).
    const fallosPrevios = await this.intentos.contarFallosDesde(email, ventanaDesde(ahora));
    if (estaBloqueadoPorIntentos(fallosPrevios)) throw new CuentaBloqueada();

    const cuenta = await this.cuentas.buscarPorEmail(email);
    if (cuenta === null) {
      // Anti-enumeración por timing: se ejecuta el hash igual, con un dummy.
      await this.hasher.verificar(await this.hasher.hashDummy(), input.contrasena);
      await this.intentos.registrar(email, input.ip, 'failed');
      throw new CredencialesInvalidas();
    }

    const passwordOk = await this.hasher.verificar(cuenta.hashPassword, input.contrasena);
    if (!passwordOk) {
      await this.intentos.registrar(email, input.ip, 'failed');
      const recienBloqueada = estaBloqueadoPorIntentos(fallosPrevios + 1);
      if (recienBloqueada) {
        // Aviso al titular de la cuenta, una sola vez: es el intento que gatilla el bloqueo.
        await this.uow.transaccion(async (repos) => {
          await repos.outbox.encolar({ tipo: 'aviso-bloqueo', destinatario: email, payload: {} });
        });
      }
      // Si este intento alcanzó el umbral, el mensaje ya informa el bloqueo (A2.6 → A3).
      throw recienBloqueada ? new CuentaBloqueada() : new CredencialesInvalidas();
    }

    await this.intentos.registrar(email, input.ip, 'success');

    // Éxito: crea la sesión y audita, todo atómico.
    return this.uow.transaccion(async (repos) => {
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
