import {
  BadRequestException,
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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../../../../platform/auth/admin.guard';
import { AuthGuard } from '../../../../platform/auth/auth.guard';
import type { RequestAutenticada } from '../../../../platform/auth/autenticado';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { ActualizarRecurso } from '../../application/actualizar-recurso';
import { CrearRecurso } from '../../application/crear-recurso';
import { EliminarRecurso } from '../../application/eliminar-recurso';
import { ListarRecursosAdmin } from '../../application/listar-recursos-admin';
import { SubirPdfRecurso } from '../../application/subir-pdf-recurso';
import { ArchivoInvalido, ProductoRelacionadoInvalido, RecursoAdminNoEncontrado } from '../../domain/errores';
import type { RecursoAdmin } from '../../domain/recurso-admin';
import { type RecursoAdminBody, recursoAdminSchema } from './admin-recursos.esquemas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapearError(error: unknown): never {
  if (error instanceof RecursoAdminNoEncontrado) {
    throw new HttpException({ title: 'No encontrado', detail: error.message }, 404);
  }
  if (error instanceof ProductoRelacionadoInvalido || error instanceof ArchivoInvalido) {
    throw new HttpException({ title: 'Dato inválido', detail: error.message }, 422);
  }
  throw error;
}

function aDatosRecurso(body: RecursoAdminBody) {
  return {
    title: body.titulo,
    type: body.tipo,
    url: body.url,
    isLicensed: body.licenciado,
    productId: body.producto_id ?? null,
  };
}

function aRespuesta(r: RecursoAdmin) {
  return {
    id: r.id,
    titulo: r.title,
    tipo: r.type,
    url: r.url,
    licenciado: r.isLicensed,
    producto_id: r.productId,
  };
}

/** CU-19 A9 · ABM de recursos del catálogo (RN-001: solo `role = admin`). */
@Controller('admin/resources')
@UseGuards(AuthGuard, AdminGuard)
export class AdminRecursosController {
  constructor(
    private readonly listar: ListarRecursosAdmin,
    private readonly crearRecurso: CrearRecurso,
    private readonly actualizarRecurso: ActualizarRecurso,
    private readonly eliminarRecurso: EliminarRecurso,
    private readonly subirPdfRecurso: SubirPdfRecurso,
  ) {}

  // CU-19 A9: sube al bucket privado 'recursos' antes de guardar el form; el path resultante
  // se pega en el campo url, igual que antes se pegaba a mano.
  @Post('pdf')
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async subirPdf(@UploadedFile() archivo?: Express.Multer.File) {
    if (!archivo) throw new BadRequestException('Falta el archivo');
    try {
      return await this.subirPdfRecurso.ejecutar(archivo.buffer, archivo.mimetype, archivo.size);
    } catch (error) {
      mapearError(error);
    }
  }

  @Get()
  async listarTodos() {
    const recursos = await this.listar.ejecutar();
    return recursos.map(aRespuesta);
  }

  @Post()
  async crear(
    @Req() req: RequestAutenticada,
    @Body(new ZodValidationPipe(recursoAdminSchema)) body: RecursoAdminBody,
  ) {
    try {
      const recurso = await this.crearRecurso.ejecutar({
        ...aDatosRecurso(body),
        adminId: req.autenticado!.id,
      });
      return aRespuesta(recurso);
    } catch (error) {
      mapearError(error);
    }
  }

  @Put(':resource_id')
  async actualizar(
    @Param('resource_id') resourceId: string,
    @Req() req: RequestAutenticada,
    @Body(new ZodValidationPipe(recursoAdminSchema)) body: RecursoAdminBody,
  ) {
    try {
      if (!UUID_RE.test(resourceId)) throw new RecursoAdminNoEncontrado();
      const recurso = await this.actualizarRecurso.ejecutar(resourceId, {
        ...aDatosRecurso(body),
        adminId: req.autenticado!.id,
      });
      return aRespuesta(recurso);
    } catch (error) {
      mapearError(error);
    }
  }

  @Delete(':resource_id')
  @HttpCode(204)
  async eliminar(@Param('resource_id') resourceId: string, @Req() req: RequestAutenticada) {
    try {
      if (!UUID_RE.test(resourceId)) throw new RecursoAdminNoEncontrado();
      await this.eliminarRecurso.ejecutar(resourceId, req.autenticado!.id);
    } catch (error) {
      mapearError(error);
    }
  }
}
