// CuitDuplicado y EmailInstitucionalDuplicado los levanta el adapter al traducir el 23505 de
// PostgreSQL: la unicidad la garantiza la base, no una consulta previa (que sería carrera).
import { NivelEducativoInvalido, UsuarioYaVinculado } from '../domain/errores';
import type {
  DomicilioInstitucion,
  UnidadDeTrabajoInstitucional,
} from '../domain/ports/institucion.repository';

export interface RegistrarInstitucionInput {
  nombreLegal: string;
  identificadorTributario: string;
  emailInstitucional: string;
  domicilio: DomicilioInstitucion;
  telefono?: string | null;
  nivelEducativo?: string | null;
  cantidadAlumnos?: number | null;
  encargadoId: string;
}

export interface InstitucionRegistrada {
  institucion_id: string;
}

/**
 * CU-23 · Registrar Institución Educativa.
 *
 * Todo ocurre en UNA transacción: crear la institución y vincular al encargado son un solo
 * hecho. Si el vínculo falla, la institución no queda huérfana (ADR-002, Unit of Work).
 */
export class RegistrarInstitucion {
  constructor(private readonly uow: UnidadDeTrabajoInstitucional) {}

  async ejecutar(input: RegistrarInstitucionInput): Promise<InstitucionRegistrada> {
    // El CUIT se normaliza a dígitos: el mismo número con o sin guiones es el mismo CUIT, y de
    // otro modo RN-001 se esquivaría escribiéndolo distinto.
    const cuit = input.identificadorTributario.replace(/\D/g, '');
    const email = input.emailInstitucional.trim().toLowerCase();

    return this.uow.transaccion(async (repos) => {
      // CU-23 A1 / RN-003: un usuario es encargado de UNA sola institución.
      if (await repos.instituciones.estaVinculado(input.encargadoId)) {
        throw new UsuarioYaVinculado();
      }

      let nivelId: string | null = null;
      if (input.nivelEducativo != null && input.nivelEducativo.trim() !== '') {
        nivelId = await repos.instituciones.buscarNivelPorNombre(input.nivelEducativo.trim());
        if (nivelId === null) throw new NivelEducativoInvalido();
      }

      const institucionId = await repos.instituciones.crear({
        nombreLegal: input.nombreLegal.trim(),
        identificadorTributario: cuit,
        emailInstitucional: email,
        domicilio: input.domicilio,
        telefono: input.telefono?.trim() || null,
        nivelEducativo: nivelId,
        cantidadAlumnos: input.cantidadAlumnos ?? null,
      });

      await repos.instituciones.vincularEncargado(institucionId, input.encargadoId);

      // CU-23 p15 / RNF-011: el sujeto del evento es la institución, no el usuario.
      await repos.auditoria.registrar({
        tipo: 'InstitucionRegistrada',
        sujetoId: institucionId,
        actorId: input.encargadoId,
      });

      return { institucion_id: institucionId };
    });
  }
}
