import { InventarioNoVisible, ProductoNoEnInventario } from '../domain/errores';
import type {
  DetalleProductoInstitucional,
  FiltroInventario,
  InventarioRepository,
  ItemInventario,
  ResumenInventario,
} from '../domain/ports/inventario.repository';
import type { UnidadDeTrabajoInstitucional } from '../domain/ports/institucion.repository';

export interface InventarioInstitucional {
  institucion_id: string;
  resumen: {
    total_adquiridas: number;
    docentes_asignados: number;
    total_en_uso: number;
    total_disponibles: number;
  };
  items: {
    producto_id: string;
    nombre_producto: string;
    descripcion_producto: string | null;
    cantidad_adquirida: number;
    cantidad_asignada: number;
    cantidad_disponible: number;
    ultima_compra_en: string | null;
    total_gastado: number | null;
  }[];
}

export interface DetalleProductoInventario {
  producto_id: string;
  nombre_producto: string;
  descripcion_producto: string | null;
  precio: number;
  cantidad_adquirida: number;
  cantidad_asignada: number;
  cantidad_disponible: number;
  compras: {
    orden_id: string;
    numero: string;
    fecha: string;
    cantidad: number;
    monto: number;
  }[];
  docentes: {
    docente_id: string;
    nombre: string;
    cantidad: number;
    asignada_en: string;
    estado: 'active' | 'revoked';
  }[];
}

/**
 * CU-25 · Ver Tenencia de Licencias Institucionales.
 *
 * Sólo el encargado (is_admin = true, RN-004) ve el inventario. Cada consulta queda
 * registrada (RN-006: evento inventory_viewed) en la MISMA transacción que la lectura.
 */
export class VerInventario {
  constructor(private readonly uow: UnidadDeTrabajoInstitucional) {}

  async ejecutar(
    institucionId: string,
    usuarioId: string,
    filtro: FiltroInventario,
  ): Promise<InventarioInstitucional> {
    return this.uow.transaccion(async (repos) => {
      await this.exigirEncargado(repos.inventario, institucionId, usuarioId);

      const [items, resumen] = await Promise.all([
        repos.inventario.listar(institucionId, filtro),
        repos.inventario.resumen(institucionId),
      ]);

      // CU-25 RN-006 / p12: inventory_viewed con institution_id y user_id.
      await repos.auditoria.registrar({
        tipo: 'InventarioConsultado',
        sujetoId: institucionId,
        actorId: usuarioId,
      });

      return { institucion_id: institucionId, resumen: mapearResumen(resumen), items: items.map(mapearItem) };
    });
  }

  async detalle(
    institucionId: string,
    productoId: string,
    usuarioId: string,
  ): Promise<DetalleProductoInventario> {
    return this.uow.transaccion(async (repos) => {
      await this.exigirEncargado(repos.inventario, institucionId, usuarioId);

      const detalle = await repos.inventario.detalle(institucionId, productoId);
      if (detalle === null) throw new ProductoNoEnInventario(); // CU-25 A7

      await repos.auditoria.registrar({
        tipo: 'InventarioConsultado',
        sujetoId: institucionId,
        actorId: usuarioId,
        datos: { producto_id: productoId },
      });

      return mapearDetalle(detalle);
    });
  }

  /** CU-25 A2: sin membresía activa con is_admin, el inventario no es visible (404). */
  private async exigirEncargado(
    inventario: InventarioRepository,
    institucionId: string,
    usuarioId: string,
  ): Promise<void> {
    const membresia = await inventario.buscarMembresiaActiva(institucionId, usuarioId);
    if (membresia === null || !membresia.esAdmin) throw new InventarioNoVisible();
  }
}

function mapearItem(i: ItemInventario): InventarioInstitucional['items'][number] {
  return {
    producto_id: i.productoId,
    nombre_producto: i.nombreProducto,
    descripcion_producto: i.descripcionProducto,
    cantidad_adquirida: i.cantidadAdquirida,
    cantidad_asignada: i.cantidadAsignada,
    cantidad_disponible: i.cantidadDisponible,
    ultima_compra_en: i.ultimaCompraEn?.toISOString() ?? null,
    total_gastado: i.totalGastado,
  };
}

function mapearResumen(r: ResumenInventario): InventarioInstitucional['resumen'] {
  return {
    total_adquiridas: r.totalAdquiridas,
    docentes_asignados: r.docentesConAsignaciones,
    total_en_uso: r.totalEnUso,
    total_disponibles: r.totalDisponibles,
  };
}

function mapearDetalle(d: DetalleProductoInstitucional): DetalleProductoInventario {
  return {
    producto_id: d.productoId,
    nombre_producto: d.nombreProducto,
    descripcion_producto: d.descripcionProducto,
    precio: d.precio,
    cantidad_adquirida: d.cantidadAdquirida,
    cantidad_asignada: d.cantidadAsignada,
    cantidad_disponible: d.cantidadDisponible,
    compras: d.compras.map((c) => ({
      orden_id: c.ordenId,
      numero: c.numero,
      fecha: c.fecha.toISOString(),
      cantidad: c.cantidad,
      monto: c.monto,
    })),
    docentes: d.docentes.map((t) => ({
      docente_id: t.docenteId,
      nombre: t.nombre,
      cantidad: t.cantidad,
      asignada_en: t.asignadaEn.toISOString(),
      estado: t.estado,
    })),
  };
}
