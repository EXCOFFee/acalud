import { Controller, Get, HttpCode, HttpException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { OpcionalAuthGuard } from '../../../../platform/auth/opcional-auth.guard';
import type { RequestAutenticada } from '../../../../platform/auth/autenticado';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { ListarEditoriales } from '../../application/listar-editoriales';
import { RegistrarClickEditorial } from '../../application/registrar-click-editorial';
import { VerEditorial } from '../../application/ver-editorial';
import { EditorialNoEncontrada } from '../../domain/errores';
import { type ListadoEditorialesQuery, listadoEditorialesQuerySchema } from './editoriales.esquemas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** CU-17 · Explorar Editoriales Aliadas (público: anónimo o logueado). */
@Controller('editorial-partners')
export class EditorialesController {
  constructor(
    private readonly listarEditoriales: ListarEditoriales,
    private readonly verEditorial: VerEditorial,
    private readonly registrarClick: RegistrarClickEditorial,
  ) {}

  @Get()
  async listar(
    @Query(new ZodValidationPipe(listadoEditorialesQuerySchema)) query: ListadoEditorialesQuery,
  ) {
    const editoriales = await this.listarEditoriales.ejecutar({ category: query.category });
    return editoriales.map((e) => ({
      id: e.id,
      nombre: e.name,
      logo_url: e.logoUrl,
      descripcion: e.description,
      sitio_web: e.externalWebsiteUrl,
    }));
  }

  @Get(':partner_id')
  @UseGuards(OpcionalAuthGuard)
  async detalle(@Param('partner_id') partnerId: string, @Req() req: RequestAutenticada) {
    try {
      if (!UUID_RE.test(partnerId)) throw new EditorialNoEncontrada();
      const editorial = await this.verEditorial.ejecutar(partnerId, req.autenticado?.id ?? null);
      return {
        id: editorial.id,
        nombre: editorial.name,
        logo_url: editorial.logoUrl,
        descripcion: editorial.description,
        sitio_web: editorial.externalWebsiteUrl,
        categoria: editorial.category,
      };
    } catch (error) {
      if (error instanceof EditorialNoEncontrada) {
        throw new HttpException({ title: 'No encontrado', detail: error.message }, 404);
      }
      throw error;
    }
  }

  // A1/A2: el frontend llama esto al hacer clic en "Ir al sitio web", antes de abrir la URL.
  @Post(':partner_id/click')
  @UseGuards(OpcionalAuthGuard)
  @HttpCode(204)
  async click(@Param('partner_id') partnerId: string, @Req() req: RequestAutenticada) {
    try {
      if (!UUID_RE.test(partnerId)) throw new EditorialNoEncontrada();
      await this.registrarClick.ejecutar(partnerId, req.autenticado?.id ?? null);
    } catch (error) {
      if (error instanceof EditorialNoEncontrada) {
        throw new HttpException({ title: 'No encontrado', detail: error.message }, 404);
      }
      throw error;
    }
  }
}
