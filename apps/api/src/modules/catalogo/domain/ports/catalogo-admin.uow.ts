import type { CategoriasAdminRepository } from './categorias-admin.repository';
import type { ProductosAdminRepository } from './productos-admin.repository';

/** Auditoría propia del BC (RN-002/RNF-002, CU-19). Cada contexto declara la suya: ADR-002. */
export interface AuditoriaCatalogo {
  registrar(evento: {
    /** `audit_log.action`: CU-19 la enumera taxativamente como create/update/delete. */
    tipo: 'create' | 'update' | 'delete';
    sujetoTipo: 'product' | 'category';
    sujetoId: string;
    actorId: string;
    datos?: Record<string, unknown>;
  }): Promise<void>;
}

export interface ReposCatalogoAdmin {
  productos: ProductosAdminRepository;
  categorias: CategoriasAdminRepository;
  auditoria: AuditoriaCatalogo;
}

/** Unit of Work del ABM de catálogo: commit total o rollback total (ADR-002). */
export interface UnidadDeTrabajoCatalogoAdmin {
  transaccion<T>(fn: (repos: ReposCatalogoAdmin) => Promise<T>): Promise<T>;
}

export const UOW_CATALOGO_ADMIN = Symbol('UnidadDeTrabajoCatalogoAdmin');
