import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../../../platform/auth/admin.guard';
import { AuthGuard } from '../../../../platform/auth/auth.guard';
import type { RequestAutenticada } from '../../../../platform/auth/autenticado';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { ActualizarCategoria } from '../../application/actualizar-categoria';
import { CrearCategoria } from '../../application/crear-categoria';
import { EliminarCategoria } from '../../application/eliminar-categoria';
import { ListarCategoriasAdmin } from '../../application/listar-categorias-admin';
import { CategoriaAdminNoEncontrada, NombreCategoriaDuplicado } from '../../domain/errores';
import { type CategoriaAdminBody, categoriaAdminSchema } from './admin-categorias.esquemas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapearError(error: unknown): never {
  if (error instanceof CategoriaAdminNoEncontrada) {
    throw new HttpException({ title: 'No encontrado', detail: error.message }, 404);
  }
  if (error instanceof NombreCategoriaDuplicado) {
    throw new HttpException({ title: 'Conflicto', detail: error.message }, 409);
  }
  throw error;
}

/** CU-19 A7 · ABM de categorías del catálogo (RN-001: solo `role = admin`). */
@Controller('admin/categories')
@UseGuards(AuthGuard, AdminGuard)
export class AdminCategoriasController {
  constructor(
    private readonly listar: ListarCategoriasAdmin,
    private readonly crearCategoria: CrearCategoria,
    private readonly actualizarCategoria: ActualizarCategoria,
    private readonly eliminarCategoria: EliminarCategoria,
  ) {}

  @Get()
  async listarTodas() {
    const categorias = await this.listar.ejecutar();
    return categorias.map((c) => ({ id: c.id, nombre: c.name }));
  }

  @Post()
  async crear(
    @Req() req: RequestAutenticada,
    @Body(new ZodValidationPipe(categoriaAdminSchema)) body: CategoriaAdminBody,
  ) {
    try {
      const categoria = await this.crearCategoria.ejecutar({
        nombre: body.nombre,
        adminId: req.autenticado!.id,
      });
      return { id: categoria.id, nombre: categoria.name };
    } catch (error) {
      mapearError(error);
    }
  }

  @Put(':category_id')
  async actualizar(
    @Param('category_id') categoryId: string,
    @Req() req: RequestAutenticada,
    @Body(new ZodValidationPipe(categoriaAdminSchema)) body: CategoriaAdminBody,
  ) {
    try {
      if (!UUID_RE.test(categoryId)) throw new CategoriaAdminNoEncontrada();
      const categoria = await this.actualizarCategoria.ejecutar(categoryId, {
        nombre: body.nombre,
        adminId: req.autenticado!.id,
      });
      return { id: categoria.id, nombre: categoria.name };
    } catch (error) {
      mapearError(error);
    }
  }

  @Delete(':category_id')
  @HttpCode(204)
  async eliminar(@Param('category_id') categoryId: string, @Req() req: RequestAutenticada) {
    try {
      if (!UUID_RE.test(categoryId)) throw new CategoriaAdminNoEncontrada();
      await this.eliminarCategoria.ejecutar(categoryId, req.autenticado!.id);
    } catch (error) {
      mapearError(error);
    }
  }
}
