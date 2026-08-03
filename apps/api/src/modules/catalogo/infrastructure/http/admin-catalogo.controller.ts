import { Body, Controller, Delete, Get, HttpException, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../../../platform/auth/admin.guard';
import { AuthGuard } from '../../../../platform/auth/auth.guard';
import type { RequestAutenticada } from '../../../../platform/auth/autenticado';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { ActualizarProducto } from '../../application/actualizar-producto';
import { CrearProducto } from '../../application/crear-producto';
import { DesactivarProducto } from '../../application/desactivar-producto';
import { ListarProductosAdmin } from '../../application/listar-productos-admin';
import { CategoriaInvalida, ProductoAdminNoEncontrado } from '../../domain/errores';
import type { ProductoAdmin } from '../../domain/producto-admin';
import {
  type ListadoProductosAdminQuery,
  listadoProductosAdminSchema,
  type ProductoAdminBody,
  productoAdminSchema,
} from './admin-catalogo.esquemas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapearError(error: unknown): never {
  if (error instanceof ProductoAdminNoEncontrado) {
    throw new HttpException({ title: 'No encontrado', detail: error.message }, 404);
  }
  if (error instanceof CategoriaInvalida) {
    throw new HttpException({ title: 'Dato inválido', detail: error.message }, 422);
  }
  throw error;
}

function aDatosProducto(body: ProductoAdminBody) {
  return {
    name: body.titulo,
    description: body.descripcion,
    price: body.precio,
    stock: body.stock,
    isOwnBrand: body.marca_propia,
    externalUrl: body.url_externa ?? null,
    categoryId: body.categoria_id ?? null,
    wholesaleThreshold: body.umbral_mayorista ?? null,
    wholesaleDiscountPercent: body.descuento_mayorista_porcentaje ?? null,
    imageUrl: body.imagen_url ?? null,
  };
}

function aRespuesta(p: ProductoAdmin) {
  return {
    id: p.id,
    titulo: p.name,
    descripcion: p.description,
    precio: p.price,
    stock: p.stock,
    marca_propia: p.isOwnBrand,
    url_externa: p.externalUrl,
    categoria_id: p.categoryId,
    umbral_mayorista: p.wholesaleThreshold,
    descuento_mayorista_porcentaje: p.wholesaleDiscountPercent,
    imagen_url: p.imageUrl,
    activo: p.isActive,
    creado_en: p.createdAt,
    actualizado_en: p.updatedAt,
  };
}

/** CU-19 · ABM de catálogo — Productos (RN-001: solo `role = admin`). */
@Controller('admin/products')
@UseGuards(AuthGuard, AdminGuard)
export class AdminCatalogoController {
  constructor(
    private readonly listarProductos: ListarProductosAdmin,
    private readonly crearProducto: CrearProducto,
    private readonly actualizarProducto: ActualizarProducto,
    private readonly desactivarProducto: DesactivarProducto,
  ) {}

  @Get()
  async listar(@Query(new ZodValidationPipe(listadoProductosAdminSchema)) query: ListadoProductosAdminQuery) {
    const pagina = await this.listarProductos.ejecutar(query);
    return {
      datos: pagina.datos.map((p) => ({
        id: p.id,
        titulo: p.name,
        precio: p.price,
        stock: p.stock,
        activo: p.isActive,
        tiene_demo: p.tieneDemo,
      })),
      paginacion: { pagina: query.pagina, tamanio: query.tamanio, total: pagina.total },
    };
  }

  @Post()
  async crear(
    @Req() req: RequestAutenticada,
    @Body(new ZodValidationPipe(productoAdminSchema)) body: ProductoAdminBody,
  ) {
    try {
      const producto = await this.crearProducto.ejecutar({
        ...aDatosProducto(body),
        adminId: req.autenticado!.id,
      });
      return aRespuesta(producto);
    } catch (error) {
      mapearError(error);
    }
  }

  @Put(':product_id')
  async actualizar(
    @Param('product_id') productId: string,
    @Req() req: RequestAutenticada,
    @Body(new ZodValidationPipe(productoAdminSchema)) body: ProductoAdminBody,
  ) {
    try {
      if (!UUID_RE.test(productId)) throw new ProductoAdminNoEncontrado();
      const producto = await this.actualizarProducto.ejecutar(productId, {
        ...aDatosProducto(body),
        adminId: req.autenticado!.id,
      });
      return aRespuesta(producto);
    } catch (error) {
      mapearError(error);
    }
  }

  @Delete(':product_id')
  async desactivar(@Param('product_id') productId: string, @Req() req: RequestAutenticada) {
    try {
      if (!UUID_RE.test(productId)) throw new ProductoAdminNoEncontrado();
      const producto = await this.desactivarProducto.ejecutar(productId, req.autenticado!.id);
      return aRespuesta(producto);
    } catch (error) {
      mapearError(error);
    }
  }
}
