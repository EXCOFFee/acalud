import {
  AsignacionNoEncontrada,
  CantidadRevocacionInvalida,
  ProductoNoEnInventario,
  SinPermisosDeEncargado,
} from '../domain/errores';
import type {
  ReposInstitucional,
  UnidadDeTrabajoInstitucional,
} from '../domain/ports/institucion.repository';

export interface RevocarLicenciasInput {
  institucionId: string;
  docenteId: string;
  productoId: string;
  cantidadARevocar: number;
  observaciones: string | null;
  encargadoId: string;
}

export interface LicenciaRevocada {
  producto_id: string;
  docente_id: string;
  cantidad_revocada: number;
  /** Lo que le queda asignado al docente del producto (A9: revocación parcial). */
  cantidad_restante: number;
}

/**
 * CU-27 · Revocar Licencia a un Docente.
 *
 * Como CU-26 crea UNA FILA por asignación (RN-003), la "cantidad asignada actual" del CU es
 * el AGREGADO de las filas activas del (docente, producto). La revocación consume de la más
 * antigua primero (FIFO): la fila que llega a 0 pasa a `revoked` con fecha, autor y razón
 * (A10); la fila mordida parcialmente queda activa con el resto (A9). Nunca se borra nada:
 * CU-28 RN-007/RN-008 exigen el historial completo.
 *
 * Todo en UNA transacción: es stock (RN-004), commit total o rollback total.
 */
export class RevocarLicencias {
  constructor(private readonly uow: UnidadDeTrabajoInstitucional) {}

  async ejecutar(input: RevocarLicenciasInput): Promise<LicenciaRevocada> {
    return this.uow.transaccion(async (repos) => {
      // RN-001: sólo el encargado (404 si no lo es, la regla del proyecto).
      const encargado = await repos.inventario.buscarMembresiaActiva(
        input.institucionId,
        input.encargadoId,
      );
      if (encargado === null || !encargado.esAdmin) throw new SinPermisosDeEncargado();

      // p13: el producto tiene que estar en el inventario. FOR UPDATE: la fila es el mutex
      // que serializa contra CU-26 y contra otra revocación concurrente del mismo producto.
      const producto = await repos.asignaciones.bloquearInventario(
        input.institucionId,
        input.productoId,
      );
      if (producto === null) throw new ProductoNoEnInventario();

      // p14: la asignación activa del docente para este producto (agregado de filas).
      const docente = await repos.asignaciones.buscarDocenteDestino(
        input.institucionId,
        input.docenteId,
      );
      if (docente === null) throw new AsignacionNoEncontrada(); // A3

      const activas = await repos.asignaciones.listarActivas(
        input.institucionId,
        docente.membresiaId,
        input.productoId,
      );
      if (activas.length === 0) throw new AsignacionNoEncontrada(); // A3 → 404

      const asignadaActual = activas.reduce((suma, a) => suma + a.cantidad, 0);
      // A2 / RN-002: no se puede revocar más de lo asignado (A1 lo resuelve Zod: > 0).
      if (input.cantidadARevocar > asignadaActual) {
        throw new CantidadRevocacionInvalida(asignadaActual);
      }

      // Consumo FIFO: la más antigua primero.
      let restante = input.cantidadARevocar;
      for (const fila of activas) {
        if (restante === 0) break;
        const consumir = Math.min(fila.cantidad, restante);
        await repos.asignaciones.aplicarRevocacion({
          asignacionId: fila.id,
          nuevaCantidad: fila.cantidad - consumir,
          revocadaPorMembresiaId: encargado.id,
          razon: input.observaciones,
        });
        restante -= consumir;
      }

      // RN-004: el inventario se actualiza en la misma transacción.
      await repos.asignaciones.descontarAsignado(
        input.institucionId,
        input.productoId,
        input.cantidadARevocar,
      );

      await this.notificar(repos, docente.usuarioId, docente.email, docente.nombre, {
        producto: producto.nombreProducto,
        cantidad: input.cantidadARevocar,
        razon: input.observaciones,
        institucionId: input.institucionId,
        productoId: input.productoId,
      });

      // RN-006/RN-007 / p20: auditoría con admin, docente, producto, cantidad y razón.
      await repos.auditoria.registrar({
        tipo: 'LicenciaRevocada',
        sujetoId: input.institucionId,
        actorId: input.encargadoId,
        datos: {
          teacher_id: input.docenteId,
          product_id: input.productoId,
          quantity_revoked: input.cantidadARevocar,
          reason: input.observaciones,
        },
      });

      return {
        producto_id: input.productoId,
        docente_id: input.docenteId,
        cantidad_revocada: input.cantidadARevocar,
        cantidad_restante: asignadaActual - input.cantidadARevocar,
      };
    });
  }

  /**
   * RN-005 / p19: notificación por dashboard y por email, con los detalles y las razones si
   * las hay. El email va encolado (A8: una caída del correo no puede tumbar la revocación).
   */
  private async notificar(
    repos: ReposInstitucional,
    usuarioId: string,
    email: string,
    nombre: string,
    datos: {
      producto: string;
      cantidad: number;
      razon: string | null;
      institucionId: string;
      productoId: string;
    },
  ): Promise<void> {
    const motivo = datos.razon !== null ? ` Motivo: ${datos.razon}.` : '';
    await repos.notificaciones.crear({
      destinatarioId: usuarioId,
      tipo: 'licencia_revocada',
      titulo: 'Se revocaron licencias asignadas',
      mensaje: `Se revocaron ${datos.cantidad} licencia(s) de "${datos.producto}".${motivo}`,
      entidadTipo: 'product',
      entidadId: datos.productoId,
    });

    await repos.outbox.encolar({
      tipo: 'licencia-revocada',
      destinatario: email,
      payload: {
        nombre,
        producto: datos.producto,
        cantidad: datos.cantidad,
        razon: datos.razon ?? '',
      },
    });
  }
}
