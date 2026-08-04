import type { PoolClient } from 'pg';
import { CuitDuplicado, EmailInstitucionalDuplicado, UsuarioYaVinculado } from '../../domain/errores';
import type {
  AuditoriaInstitucional,
  DatosFacturacionEnvio,
  DatosNuevaInstitucion,
  InstitucionRepository,
  MembresiaPropia,
} from '../../domain/ports/institucion.repository';

const PG_VIOLACION_UNICIDAD = '23505';
// Nombres exactos de las restricciones (migraciones 0014/0015). Comparación por igualdad, no por
// subcadena: un renombre tiene que romper acá y no degradar un 409 a 500 en silencio.
// Sobre `tax_id` hay DOS índices únicos: el total que exige CU-23 RN-001 y el parcial que
// heredamos de la v1 (sólo entre instituciones activas). Cuál de los dos salta no está definido,
// así que se contemplan ambos. El parcial es redundante y está propuesto para retiro (matriz §8).
const UQ_CUIT = ['institutions_tax_id_uq', 'uq_institutions_tax_id_active'];
const UQ_EMAIL = 'institutions_email_key';
const UQ_ENCARGADO = 'uq_single_admin_per_user';

export class InstitucionRepositoryPg implements InstitucionRepository {
  constructor(private readonly client: PoolClient) {}

  async estaVinculado(usuarioId: string): Promise<boolean> {
    const r = await this.client.query(
      `SELECT 1 FROM institutional_teachers WHERE user_id = $1 AND status <> 'unlinked' LIMIT 1`,
      [usuarioId],
    );
    return r.rowCount !== null && r.rowCount > 0;
  }

  async buscarPropia(usuarioId: string): Promise<MembresiaPropia | null> {
    const r = await this.client.query<{ institution_id: string; is_admin: boolean }>(
      `SELECT institution_id, is_admin FROM institutional_teachers
        WHERE user_id = $1 AND status <> 'unlinked'
        LIMIT 1`,
      [usuarioId],
    );
    const fila = r.rows[0];
    return fila ? { institucionId: fila.institution_id, esEncargado: fila.is_admin } : null;
  }

  /** CU-32 paso 12: nombre de la institución para el encabezado/nombre del archivo exportado. */
  async buscarNombre(institucionId: string): Promise<string | null> {
    const r = await this.client.query<{ legal_name: string }>(
      `SELECT legal_name FROM institutions WHERE id = $1`,
      [institucionId],
    );
    return r.rows[0]?.legal_name ?? null;
  }

  /** CU-24: domicilio + razón social/CUIT para precargar el checkout institucional. */
  async buscarDatosFacturacionEnvio(institucionId: string): Promise<DatosFacturacionEnvio | null> {
    const r = await this.client.query<{
      legal_name: string;
      tax_id: string;
      street: string | null;
      number: string | null;
      city: string | null;
      province: string | null;
      postal_code: string | null;
    }>(
      `SELECT legal_name, tax_id, street, number, city, province, postal_code
         FROM institutions WHERE id = $1`,
      [institucionId],
    );
    const fila = r.rows[0];
    if (!fila) return null;
    return {
      nombreLegal: fila.legal_name,
      identificadorTributario: fila.tax_id,
      // Las 5 columnas viajan juntas: `street` es la única que se chequea porque A10 (institución
      // sin dirección de envío configurada) es alcanzable de verdad (columnas nullable).
      domicilio:
        fila.street !== null
          ? {
              calle: fila.street,
              numero: fila.number ?? '',
              localidad: fila.city ?? '',
              provincia: fila.province ?? '',
              codigoPostal: fila.postal_code ?? '',
            }
          : null,
    };
  }

  async buscarNivelPorNombre(nombre: string): Promise<string | null> {
    const r = await this.client.query<{ id: string }>(
      `SELECT id FROM levels WHERE lower(name) = lower($1)`,
      [nombre],
    );
    return r.rows[0]?.id ?? null;
  }

  async crear(datos: DatosNuevaInstitucion): Promise<string> {
    try {
      const r = await this.client.query<{ id: string }>(
        `INSERT INTO institutions
           (legal_name, tax_id, email, street, number, city, province, postal_code,
            phone, level_id, student_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id`,
        [
          datos.nombreLegal,
          datos.identificadorTributario,
          datos.emailInstitucional,
          datos.domicilio.calle,
          datos.domicilio.numero,
          datos.domicilio.localidad,
          datos.domicilio.provincia,
          datos.domicilio.codigoPostal,
          datos.telefono,
          datos.nivelEducativo,
          datos.cantidadAlumnos,
        ],
      );
      return r.rows[0]!.id;
    } catch (e) {
      const err = e as { code?: string; constraint?: string };
      if (err.code === PG_VIOLACION_UNICIDAD) {
        if (err.constraint !== undefined && UQ_CUIT.includes(err.constraint)) {
          throw new CuitDuplicado(); // CU-23 A2
        }
        if (err.constraint === UQ_EMAIL) throw new EmailInstitucionalDuplicado(); // CU-23 A3
      }
      throw e;
    }
  }

  async vincularEncargado(institucionId: string, usuarioId: string): Promise<void> {
    try {
      await this.client.query(
        `INSERT INTO institutional_teachers (institution_id, user_id, invited_email, is_admin, status, joined_at)
         VALUES ($1, $2, (SELECT email FROM users WHERE id = $2), true, 'active', now())`,
        [institucionId, usuarioId],
      );
    } catch (e) {
      const err = e as { code?: string; constraint?: string };
      // Carrera contra el chequeo previo: dos registros simultáneos del mismo encargado. El
      // índice parcial es el que decide, y el perdedor recibe el 409 de A1.
      if (err.code === PG_VIOLACION_UNICIDAD && err.constraint === UQ_ENCARGADO) {
        throw new UsuarioYaVinculado();
      }
      throw e;
    }
  }
}

/** Auditoría del BC Institucional sobre `audit_log` (RNF-SIS-016, CU-23 RNF-011). */
export class AuditoriaInstitucionalPg implements AuditoriaInstitucional {
  constructor(private readonly client: PoolClient) {}

  async registrar(evento: {
    tipo: string;
    sujetoId: string;
    actorId: string;
    sujetoTipo?: string;
    datos?: Record<string, unknown>;
  }): Promise<void> {
    await this.client.query(
      `INSERT INTO audit_log (action, entity_type, entity_id, actor_user_id, new_values)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [
        evento.tipo,
        evento.sujetoTipo ?? 'institution',
        evento.sujetoId,
        evento.actorId,
        JSON.stringify(evento.datos ?? {}),
      ],
    );
  }
}
