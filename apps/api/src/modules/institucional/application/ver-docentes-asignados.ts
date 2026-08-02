import { DocenteNoEncontrado, SinPermisosDeEncargado } from '../domain/errores';
import type {
  DetalleDocente,
  DocenteConAsignaciones,
  FiltroDocentes,
  ResumenDocentes,
} from '../domain/ports/docentes.repository';
import type {
  ReposInstitucional,
  UnidadDeTrabajoInstitucional,
} from '../domain/ports/institucion.repository';

export interface ListadoDocentesAsignados {
  institucion_id: string;
  resumen: {
    total_docentes_con_asignaciones: number;
    total_licencias_asignadas: number;
    productos_mas_asignados: { producto_id: string; nombre_producto: string; total: number }[];
  };
  docentes: {
    docente_id: string;
    nombre: string;
    email: string;
    total_licencias: number;
    ultima_asignacion_en: string | null;
    asignaciones: {
      producto_id: string;
      nombre_producto: string;
      cantidad: number;
      asignada_en: string;
      asignada_por: string | null;
      estado: 'active' | 'revoked';
    }[];
  }[];
}

export interface DetalleDocenteAsignaciones {
  docente_id: string;
  nombre: string;
  email: string;
  vinculado_en: string | null;
  asignaciones: (ListadoDocentesAsignados['docentes'][number]['asignaciones'][number] & {
    revocada_en: string | null;
    revocada_por: string | null;
    razon_revocacion: string | null;
  })[];
}

/**
 * CU-28 · Ver Listado de Docentes Asignados. Sólo el encargado (RN-001); cada consulta
 * registra assigned_teachers_viewed (RN-006).
 */
export class VerDocentesAsignados {
  constructor(private readonly uow: UnidadDeTrabajoInstitucional) {}

  async ejecutar(
    institucionId: string,
    usuarioId: string,
    filtro: FiltroDocentes,
  ): Promise<ListadoDocentesAsignados> {
    return this.uow.transaccion(async (repos) => {
      await this.exigirEncargado(repos, institucionId, usuarioId);
      const [docentes, resumen] = await Promise.all([
        repos.docentes.listar(institucionId, filtro),
        repos.docentes.resumen(institucionId),
      ]);
      await repos.auditoria.registrar({
        tipo: 'DocentesAsignadosConsultados',
        sujetoId: institucionId,
        actorId: usuarioId,
      });
      return {
        institucion_id: institucionId,
        resumen: mapearResumen(resumen),
        docentes: docentes.map(mapearDocente),
      };
    });
  }

  async detalle(
    institucionId: string,
    docenteId: string,
    usuarioId: string,
  ): Promise<DetalleDocenteAsignaciones> {
    return this.uow.transaccion(async (repos) => {
      await this.exigirEncargado(repos, institucionId, usuarioId);
      const detalle = await repos.docentes.detalle(institucionId, docenteId);
      if (detalle === null) throw new DocenteNoEncontrado(); // A9: docente ajeno → 404
      return mapearDetalle(detalle);
    });
  }

  private async exigirEncargado(
    repos: ReposInstitucional,
    institucionId: string,
    usuarioId: string,
  ): Promise<void> {
    const membresia = await repos.inventario.buscarMembresiaActiva(institucionId, usuarioId);
    if (membresia === null || !membresia.esAdmin) throw new SinPermisosDeEncargado();
  }
}

function mapearResumen(r: ResumenDocentes): ListadoDocentesAsignados['resumen'] {
  return {
    total_docentes_con_asignaciones: r.totalDocentesConAsignaciones,
    total_licencias_asignadas: r.totalLicenciasAsignadas,
    productos_mas_asignados: r.productosMasAsignados.map((p) => ({
      producto_id: p.productoId,
      nombre_producto: p.nombreProducto,
      total: p.total,
    })),
  };
}

function mapearAsignacion(
  a: DocenteConAsignaciones['asignaciones'][number],
): ListadoDocentesAsignados['docentes'][number]['asignaciones'][number] {
  return {
    producto_id: a.productoId,
    nombre_producto: a.nombreProducto,
    cantidad: a.cantidad,
    asignada_en: a.asignadaEn.toISOString(),
    asignada_por: a.asignadaPor,
    estado: a.estado,
  };
}

function mapearDocente(d: DocenteConAsignaciones): ListadoDocentesAsignados['docentes'][number] {
  return {
    docente_id: d.docenteId,
    nombre: d.nombre,
    email: d.email,
    total_licencias: d.totalLicencias,
    ultima_asignacion_en: d.ultimaAsignacionEn?.toISOString() ?? null,
    asignaciones: d.asignaciones.map(mapearAsignacion),
  };
}

function mapearDetalle(d: DetalleDocente): DetalleDocenteAsignaciones {
  return {
    docente_id: d.docenteId,
    nombre: d.nombre,
    email: d.email,
    vinculado_en: d.vinculadoEn?.toISOString() ?? null,
    asignaciones: d.asignaciones.map((a) => ({
      ...mapearAsignacion(a),
      revocada_en: a.revocadaEn?.toISOString() ?? null,
      revocada_por: a.revocadaPor,
      razon_revocacion: a.razonRevocacion,
    })),
  };
}
