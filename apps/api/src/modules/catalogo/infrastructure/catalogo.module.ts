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
import { STORAGE_PROVIDER } from '../../../platform/storage/storage-provider.port';
import { ActualizarProducto } from '../application/actualizar-producto';
import { CrearProducto } from '../application/crear-producto';
import { DesactivarProducto } from '../application/desactivar-producto';
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

/**
 * BC2 · Catálogo (read-only, CU-006). Cablea el puerto de lectura con su adapter PG; los casos
 * de uso son clases framework-agnósticas instanciadas por `useFactory` (ADR-002).
 */
@Module({
  controllers: [CatalogoController, AdminCatalogoController, AdminCategoriasController],
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
      provide: CrearProducto,
      useFactory: (uow: UnidadDeTrabajoCatalogoAdmin): CrearProducto => new CrearProducto(uow),
      inject: [UOW_CATALOGO_ADMIN],
    },
    {
      provide: ActualizarProducto,
      useFactory: (uow: UnidadDeTrabajoCatalogoAdmin): ActualizarProducto => new ActualizarProducto(uow),
      inject: [UOW_CATALOGO_ADMIN],
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
  ],
})
export class CatalogoModule {}
