import {
  DocenteNoVinculado,
  LicenciasInsuficientes,
  ProductoNoEnInventario,
  SinPermisosDeEncargado,
} from '../domain/errores';
import type { DocenteDestino } from '../domain/ports/asignacion.repository';
import type {
  ReposInstitucional,
  UnidadDeTrabajoInstitucional,
} from '../domain/ports/institucion.repository';

export interface LineaAsignacion {
  docenteId: string;
  cantidad: number;
}

export interface AsignarLicenciasInput {
  institucionId: string;
  productoId: string;
  lineas: LineaAsignacion[];
  observaciones: string | null;
  encargadoId: string;
}

export interface LicenciasAsignadas {
  producto_id: string;
  asignaciones: { asignacion_id: string; docente_id: string; cantidad: number }[];
  /** Disponibilidad ya actualizada, para que la grilla de CU-25 no tenga que releer (p21). */
  cantidad_disponible: number;
}

/**
 * CU-26 · Asignar Licencia de Juego a un Docente.
 *
 * Todo ocurre en UNA transacción: las asignaciones, el incremento de `quantity_assigned` del
 * inventario (RN-007), las notificaciones y la auditoría. Es stock, así que la regla del
 * proyecto es commit total o rollback total.
 */
export class AsignarLicencias {
  constructor(private readonly uow: UnidadDeTrabajoInstitucional) {}

  async ejecutar(input: AsignarLicenciasInput): Promise<LicenciasAsignadas> {
    const total = input.lineas.reduce((suma, l) => suma + l.cantidad, 0);

    return this.uow.transaccion(async (repos) => {
      // RN-001: sólo el encargado. Sin membresía admin activa la institución no existe para
      // el caller (404), igual que en CU-25: nunca se revela un recurso ajeno.
      const encargado = await repos.inventario.buscarMembresiaActiva(
        input.institucionId,
        input.encargadoId,
      );
      if (encargado === null || !encargado.esAdmin) throw new SinPermisosDeEncargado();

      // p14: el producto tiene que estar en el inventario de ESTA institución.
      const enInventario = await repos.asignaciones.buscarEnInventario(
        input.institucionId,
        input.productoId,
      );
      if (enInventario === null) throw new ProductoNoEnInventario();

      // A1 / RN-005: se valida acá para poder informar el disponible exacto en el mensaje.
      if (total > enInventario.disponibles) {
        throw new LicenciasInsuficientes(enInventario.disponibles);
      }

      // A3 / RN-010: cada destino tiene que estar vinculado y activo. Se resuelven todos antes
      // de escribir para que un docente ajeno no deje asignaciones a medias.
      const destinos: { linea: LineaAsignacion; docente: DocenteDestino }[] = [];
      for (const linea of input.lineas) {
        const docente = await repos.asignaciones.buscarDocenteDestino(
          input.institucionId,
          linea.docenteId,
        );
        if (docente === null) throw new DocenteNoVinculado();
        destinos.push({ linea, docente });
      }

      // RN-007 con guard de disponibilidad en el WHERE: si otra asignación concurrente consumió
      // el stock entre la lectura y este UPDATE, no hay filas afectadas y se corta acá.
      const alcanzo = await repos.asignaciones.incrementarAsignado(
        input.institucionId,
        input.productoId,
        total,
      );
      if (!alcanzo) throw new LicenciasInsuficientes(enInventario.disponibles);

      const asignaciones: LicenciasAsignadas['asignaciones'] = [];
      for (const { linea, docente } of destinos) {
        // RN-003: un docente puede recibir el mismo producto más de una vez (A2.5), así que
        // cada línea es una asignación nueva y no una actualización de la anterior.
        const asignacionId = await repos.asignaciones.crear({
          institucionId: input.institucionId,
          membresiaDocenteId: docente.membresiaId,
          productoId: input.productoId,
          cantidad: linea.cantidad,
          asignadaPorMembresiaId: encargado.id,
          observaciones: input.observaciones,
        });

        await this.notificar(repos, docente, enInventario.nombreProducto, linea.cantidad, asignacionId);

        // RN-009 / RNF-007: un evento por asignación, con docente, producto y cantidad.
        await repos.auditoria.registrar({
          tipo: 'LicenciaAsignada',
          sujetoTipo: 'institutional_assignment',
          sujetoId: asignacionId,
          actorId: input.encargadoId,
          datos: {
            institution_id: input.institucionId,
            teacher_id: docente.usuarioId,
            product_id: input.productoId,
            quantity: linea.cantidad,
          },
        });

        asignaciones.push({
          asignacion_id: asignacionId,
          docente_id: docente.usuarioId,
          cantidad: linea.cantidad,
        });
      }

      return {
        producto_id: input.productoId,
        asignaciones,
        cantidad_disponible: enInventario.disponibles - total,
      };
    });
  }

  /**
   * RN-008: el docente recibe la notificación por dashboard y por email. El email se encola en
   * el outbox, no se envía acá: A9 exige que una caída del servidor de correo no tumbe la
   * asignación, y el reintento queda a cargo del worker.
   */
  private async notificar(
    repos: ReposInstitucional,
    docente: DocenteDestino,
    nombreProducto: string,
    cantidad: number,
    asignacionId: string,
  ): Promise<void> {
    await repos.notificaciones.crear({
      destinatarioId: docente.usuarioId,
      tipo: 'licencia_asignada',
      titulo: 'Tenés nuevas licencias asignadas',
      mensaje: `Se te asignaron ${cantidad} licencia(s) de "${nombreProducto}".`,
      entidadTipo: 'institutional_assignment',
      entidadId: asignacionId,
    });

    await repos.outbox.encolar({
      tipo: 'licencia-asignada',
      destinatario: docente.email,
      payload: { nombre: docente.nombre, producto: nombreProducto, cantidad },
    });
  }
}
