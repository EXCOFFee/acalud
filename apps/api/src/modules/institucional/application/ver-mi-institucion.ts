import type { UnidadDeTrabajoInstitucional } from '../domain/ports/institucion.repository';

export interface DatosFacturacionEnvioDto {
  nombre_legal: string;
  identificador_tributario: string;
  domicilio: {
    calle: string;
    numero: string;
    localidad: string;
    provincia: string;
    codigo_postal: string;
  } | null;
}

export interface MiInstitucion {
  institucion_id: string | null;
  es_encargado: boolean;
  /** CU-24: null si el usuario no está vinculado a ninguna institución. */
  datos_facturacion_envio: DatosFacturacionEnvioDto | null;
}

/**
 * Resuelve a qué institución pertenece el usuario autenticado, si a alguna. Sin esto el
 * frontend no tiene forma de recuperar `institucion_id` fuera del instante de CU-23 (el propio
 * `POST /instituciones` lo devuelve una sola vez, al crearla) — toda la navegación del BC
 * Institucional depende de conocer ese id.
 *
 * Devuelve siempre un objeto (nunca `null` a secas): NestJS no serializa el `return null` de un
 * handler como JSON `null` literal, así que un contrato `T | null` en la firma es una trampa —
 * el cliente HTTP real recibe `{}`, no `null`.
 */
export class VerMiInstitucion {
  constructor(private readonly uow: UnidadDeTrabajoInstitucional) {}

  async ejecutar(usuarioId: string): Promise<MiInstitucion> {
    return this.uow.transaccion(async (repos) => {
      const membresia = await repos.instituciones.buscarPropia(usuarioId);
      if (membresia === null) {
        return { institucion_id: null, es_encargado: false, datos_facturacion_envio: null };
      }
      const datos = await repos.instituciones.buscarDatosFacturacionEnvio(membresia.institucionId);
      return {
        institucion_id: membresia.institucionId,
        es_encargado: membresia.esEncargado,
        datos_facturacion_envio: datos
          ? {
              nombre_legal: datos.nombreLegal,
              identificador_tributario: datos.identificadorTributario,
              domicilio: datos.domicilio
                ? {
                    calle: datos.domicilio.calle,
                    numero: datos.domicilio.numero,
                    localidad: datos.domicilio.localidad,
                    provincia: datos.domicilio.provincia,
                    codigo_postal: datos.domicilio.codigoPostal,
                  }
                : null,
            }
          : null,
      };
    });
  }
}
