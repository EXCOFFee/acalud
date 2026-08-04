import { Module } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../platform/db/pg.module';
import { ListarJuegos } from '../application/listar-juegos';
import { VerJuego } from '../application/ver-juego';
import { CATALOGO_REPOSITORY, type CatalogoRepository } from '../domain/ports/catalogo.repository';
import { DEMOS_REPOSITORY, type DemosRepository } from '../domain/ports/demos.repository';
import { ProbarDemoPublica } from '../application/probar-demo-publica';
import { ProbarDemoRegistrada } from '../application/probar-demo-registrada';
import { CatalogoController } from './http/catalogo.controller';
import { CatalogoRepositoryPg } from './persistencia/catalogo.repository.pg';
import { DemosRepositoryPg } from './persistencia/demos.repository.pg';
import { RECURSOS_REPOSITORY } from '../domain/ports/recursos.repository';
import { DESCARGAS_REPOSITORY } from '../domain/ports/descargas.repository';
import { RECURSOS_AUTORIZACION_PORT } from '../domain/ports/recursos-autorizacion.port';
import { RecursosRepositoryPg } from './persistencia/recursos.repository.pg';
import { DescargasRepositoryPg } from './persistencia/descargas.repository.pg';
import { RecursosAutorizacionPg } from './persistencia/recursos-autorizacion.pg';
import { DescargarRecurso } from '../application/descargar-recurso';
import { STORAGE_PROVIDER, type StorageProvider } from '../../../platform/storage/storage-provider.port';
import { ActualizarProducto } from '../application/actualizar-producto';
import { CrearProducto } from '../application/crear-producto';
import { DesactivarProducto } from '../application/desactivar-producto';
import { ListarProductosAdmin } from '../application/listar-productos-admin';
import {
  UOW_CATALOGO_ADMIN,
  type UnidadDeTrabajoCatalogoAdmin,
} from '../domain/ports/catalogo-admin.uow';
import { UnidadDeTrabajoCatalogoAdminPg } from './persistencia/unidad-de-trabajo-admin.pg';
import { AdminCatalogoController } from './http/admin-catalogo.controller';
import { ActualizarCategoria } from '../application/actualizar-categoria';
import { CrearCategoria } from '../application/crear-categoria';
import { EliminarCategoria } from '../application/eliminar-categoria';
import { ListarCategoriasAdmin } from '../application/listar-categorias-admin';
import { AdminCategoriasController } from './http/admin-categorias.controller';
import { AsignarDemo } from '../application/asignar-demo';
import { VerDemoAdmin } from '../application/ver-demo-admin';
import { AdminDemosController } from './http/admin-demos.controller';
import { ActualizarRecurso } from '../application/actualizar-recurso';
import { CrearRecurso } from '../application/crear-recurso';
import { EliminarRecurso } from '../application/eliminar-recurso';
import { ListarRecursosAdmin } from '../application/listar-recursos-admin';
import { SubirImagenProducto } from '../application/subir-imagen-producto';
import { SubirPdfRecurso } from '../application/subir-pdf-recurso';
import { AdminRecursosController } from './http/admin-recursos.controller';
import { ListarEditoriales } from '../application/listar-editoriales';
import { VerEditorial } from '../application/ver-editorial';
import { RegistrarClickEditorial } from '../application/registrar-click-editorial';
import { EDITORIALES_REPOSITORY, type EditorialesRepository } from '../domain/ports/editoriales.repository';
import { EditorialesRepositoryPg } from './persistencia/editoriales.repository.pg';
import { EditorialesController } from './http/editoriales.controller';
import { GuardarFavorito } from '../application/guardar-favorito';
import { VerMisFavoritos } from '../application/ver-mis-favoritos';
import { EliminarFavorito } from '../application/eliminar-favorito';
import { FAVORITOS_REPOSITORY, type FavoritosRepository } from '../domain/ports/favoritos.repository';
import { FavoritosRepositoryPg } from './persistencia/favoritos.repository.pg';
import { FavoritosController } from './http/favoritos.controller';

/**
 * BC2 · Catálogo (read-only, CU-006). Cablea el puerto de lectura con su adapter PG; los casos
 * de uso son clases framework-agnósticas instanciadas por `useFactory` (ADR-002).
 */
@Module({
  controllers: [
    CatalogoController,
    AdminCatalogoController,
    AdminCategoriasController,
    AdminDemosController,
    AdminRecursosController,
    EditorialesController,
    FavoritosController,
  ],
  providers: [
    {
      provide: CATALOGO_REPOSITORY,
      useFactory: (pool: Pool): CatalogoRepository => new CatalogoRepositoryPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: ListarJuegos,
      useFactory: (repo: CatalogoRepository): ListarJuegos => new ListarJuegos(repo),
      inject: [CATALOGO_REPOSITORY],
    },
    {
      provide: VerJuego,
      useFactory: (repo: CatalogoRepository): VerJuego => new VerJuego(repo),
      inject: [CATALOGO_REPOSITORY],
    },
    {
      provide: DEMOS_REPOSITORY,
      useFactory: (pool: Pool): DemosRepository => new DemosRepositoryPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: ProbarDemoPublica,
      useFactory: (repo: DemosRepository): ProbarDemoPublica => new ProbarDemoPublica(repo),
      inject: [DEMOS_REPOSITORY],
    },
    {
      provide: ProbarDemoRegistrada,
      useFactory: (repo: DemosRepository): ProbarDemoRegistrada => new ProbarDemoRegistrada(repo),
      inject: [DEMOS_REPOSITORY],
    },
    {
      provide: RECURSOS_REPOSITORY,
      useFactory: (pool: Pool) => new RecursosRepositoryPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: DESCARGAS_REPOSITORY,
      useFactory: (pool: Pool) => new DescargasRepositoryPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: RECURSOS_AUTORIZACION_PORT,
      useFactory: (pool: Pool) => new RecursosAutorizacionPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: DescargarRecurso,
      useFactory: (
        recursosRepo,
        descargasRepo,
        autorizacionPort,
        storageProvider,
      ) => new DescargarRecurso(recursosRepo, descargasRepo, autorizacionPort, storageProvider),
      inject: [
        RECURSOS_REPOSITORY,
        DESCARGAS_REPOSITORY,
        RECURSOS_AUTORIZACION_PORT,
        STORAGE_PROVIDER,
      ],
    },
    {
      provide: UOW_CATALOGO_ADMIN,
      useFactory: (pool: Pool): UnidadDeTrabajoCatalogoAdmin => new UnidadDeTrabajoCatalogoAdminPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: ListarProductosAdmin,
      useFactory: (uow: UnidadDeTrabajoCatalogoAdmin): ListarProductosAdmin => new ListarProductosAdmin(uow),
      inject: [UOW_CATALOGO_ADMIN],
    },
    {
      provide: CrearProducto,
      useFactory: (uow: UnidadDeTrabajoCatalogoAdmin): CrearProducto => new CrearProducto(uow),
      inject: [UOW_CATALOGO_ADMIN],
    },
    {
      provide: ActualizarProducto,
      useFactory: (uow: UnidadDeTrabajoCatalogoAdmin, storage: StorageProvider): ActualizarProducto =>
        new ActualizarProducto(uow, storage),
      inject: [UOW_CATALOGO_ADMIN, STORAGE_PROVIDER],
    },
    {
      provide: DesactivarProducto,
      useFactory: (uow: UnidadDeTrabajoCatalogoAdmin): DesactivarProducto => new DesactivarProducto(uow),
      inject: [UOW_CATALOGO_ADMIN],
    },
    {
      provide: ListarCategoriasAdmin,
      useFactory: (uow: UnidadDeTrabajoCatalogoAdmin): ListarCategoriasAdmin => new ListarCategoriasAdmin(uow),
      inject: [UOW_CATALOGO_ADMIN],
    },
    {
      provide: CrearCategoria,
      useFactory: (uow: UnidadDeTrabajoCatalogoAdmin): CrearCategoria => new CrearCategoria(uow),
      inject: [UOW_CATALOGO_ADMIN],
    },
    {
      provide: ActualizarCategoria,
      useFactory: (uow: UnidadDeTrabajoCatalogoAdmin): ActualizarCategoria => new ActualizarCategoria(uow),
      inject: [UOW_CATALOGO_ADMIN],
    },
    {
      provide: EliminarCategoria,
      useFactory: (uow: UnidadDeTrabajoCatalogoAdmin): EliminarCategoria => new EliminarCategoria(uow),
      inject: [UOW_CATALOGO_ADMIN],
    },
    {
      provide: AsignarDemo,
      useFactory: (uow: UnidadDeTrabajoCatalogoAdmin): AsignarDemo => new AsignarDemo(uow),
      inject: [UOW_CATALOGO_ADMIN],
    },
    {
      provide: VerDemoAdmin,
      useFactory: (uow: UnidadDeTrabajoCatalogoAdmin): VerDemoAdmin => new VerDemoAdmin(uow),
      inject: [UOW_CATALOGO_ADMIN],
    },
    {
      provide: ListarRecursosAdmin,
      useFactory: (uow: UnidadDeTrabajoCatalogoAdmin): ListarRecursosAdmin => new ListarRecursosAdmin(uow),
      inject: [UOW_CATALOGO_ADMIN],
    },
    {
      provide: CrearRecurso,
      useFactory: (uow: UnidadDeTrabajoCatalogoAdmin): CrearRecurso => new CrearRecurso(uow),
      inject: [UOW_CATALOGO_ADMIN],
    },
    {
      provide: ActualizarRecurso,
      useFactory: (uow: UnidadDeTrabajoCatalogoAdmin, storage: StorageProvider): ActualizarRecurso =>
        new ActualizarRecurso(uow, storage),
      inject: [UOW_CATALOGO_ADMIN, STORAGE_PROVIDER],
    },
    {
      provide: EliminarRecurso,
      useFactory: (uow: UnidadDeTrabajoCatalogoAdmin): EliminarRecurso => new EliminarRecurso(uow),
      inject: [UOW_CATALOGO_ADMIN],
    },
    {
      provide: SubirImagenProducto,
      useFactory: (storage: StorageProvider): SubirImagenProducto => new SubirImagenProducto(storage),
      inject: [STORAGE_PROVIDER],
    },
    {
      provide: SubirPdfRecurso,
      useFactory: (storage: StorageProvider): SubirPdfRecurso => new SubirPdfRecurso(storage),
      inject: [STORAGE_PROVIDER],
    },
    {
      provide: EDITORIALES_REPOSITORY,
      useFactory: (pool: Pool): EditorialesRepository => new EditorialesRepositoryPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: ListarEditoriales,
      useFactory: (repo: EditorialesRepository): ListarEditoriales => new ListarEditoriales(repo),
      inject: [EDITORIALES_REPOSITORY],
    },
    {
      provide: VerEditorial,
      useFactory: (repo: EditorialesRepository): VerEditorial => new VerEditorial(repo),
      inject: [EDITORIALES_REPOSITORY],
    },
    {
      provide: RegistrarClickEditorial,
      useFactory: (repo: EditorialesRepository): RegistrarClickEditorial => new RegistrarClickEditorial(repo),
      inject: [EDITORIALES_REPOSITORY],
    },
    {
      provide: FAVORITOS_REPOSITORY,
      useFactory: (pool: Pool): FavoritosRepository => new FavoritosRepositoryPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: GuardarFavorito,
      useFactory: (repo: FavoritosRepository): GuardarFavorito => new GuardarFavorito(repo),
      inject: [FAVORITOS_REPOSITORY],
    },
    {
      provide: VerMisFavoritos,
      useFactory: (repo: FavoritosRepository): VerMisFavoritos => new VerMisFavoritos(repo),
      inject: [FAVORITOS_REPOSITORY],
    },
    {
      provide: EliminarFavorito,
      useFactory: (repo: FavoritosRepository): EliminarFavorito => new EliminarFavorito(repo),
      inject: [FAVORITOS_REPOSITORY],
    },
  ],
})
export class CatalogoModule {}
