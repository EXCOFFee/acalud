import { Controller, Get, Post, HttpException, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../../platform/auth/auth.guard';
import { OpcionalAuthGuard } from '../../../../platform/auth/opcional-auth.guard';
import type { RequestAutenticada } from '../../../../platform/auth/autenticado';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { ListarJuegos, type ListadoJuegos } from '../../application/listar-juegos';
import { ProbarDemoPublica } from '../../application/probar-demo-publica';
import { ProbarDemoRegistrada } from '../../application/probar-demo-registrada';
import { VerJuego } from '../../application/ver-juego';
import { DescargarRecurso } from '../../application/descargar-recurso';
import { DemoNoEncontrada, JuegoNoEncontrado, RecursoNoEncontrado, RecursoNoAutorizado } from '../../domain/errores';
import type { ContenidoDemo } from '../../domain/ports/demos.repository';
import type { JuegoDetalle } from '../../domain/juego';
import { type ListadoQuery, listadoQuerySchema } from './esquemas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** BC2 · Catálogo público (CU-006, read-only). Sin autenticación: listado y ficha son públicos. */
@Controller('catalogo')
export class CatalogoController {
  constructor(
    private readonly listar: ListarJuegos,
    private readonly ver: VerJuego,
    private readonly demoPublica: ProbarDemoPublica,
    private readonly demoRegistrada: ProbarDemoRegistrada,
    private readonly descargarRecurso: DescargarRecurso,
  ) {}

  @Get('juegos')
  async listarJuegos(
    @Query(new ZodValidationPipe(listadoQuerySchema)) query: ListadoQuery,
  ): Promise<ListadoJuegos> {
    return this.listar.ejecutar({
      q: query.q,
      area: query.area,
      pagina: query.pagina,
      tamanio: query.tamanio,
    });
  }

  @Get('juegos/:juego_id')
  async verJuego(@Param('juego_id') juegoId: string): Promise<JuegoDetalle> {
    try {
      // Un id con formato inválido es un recurso inexistente, no un 500.
      if (!UUID_RE.test(juegoId)) throw new JuegoNoEncontrado();
      return await this.ver.ejecutar(juegoId);
    } catch (error) {
      if (error instanceof JuegoNoEncontrado) {
        throw new HttpException({ title: 'No encontrado', detail: error.message }, 404);
      }
      throw error;
    }
  }

  @Get('juegos/:juego_id/demo/publica')
  async probarDemoPublica(@Param('juego_id') juegoId: string): Promise<ContenidoDemo> {
    try {
      if (!UUID_RE.test(juegoId)) throw new JuegoNoEncontrado();
      return await this.demoPublica.ejecutar(juegoId);
    } catch (error) {
      if (error instanceof JuegoNoEncontrado || error instanceof DemoNoEncontrada) {
        throw new HttpException({ title: 'No encontrado', detail: error.message }, 404);
      }
      throw error;
    }
  }

  @UseGuards(AuthGuard)
  @Get('juegos/:juego_id/demo/completa')
  async probarDemoRegistrada(
    @Param('juego_id') juegoId: string,
    @Req() req: RequestAutenticada,
  ): Promise<ContenidoDemo> {
    try {
      if (!UUID_RE.test(juegoId)) throw new JuegoNoEncontrado();
      return await this.demoRegistrada.ejecutar(req.autenticado!.id, juegoId);
    } catch (error) {
      if (error instanceof JuegoNoEncontrado || error instanceof DemoNoEncontrada) {
        throw new HttpException({ title: 'No encontrado', detail: error.message }, 404);
      }
      throw error;
    }
  }

  @Post('recursos/:recurso_id/descarga')
  @UseGuards(OpcionalAuthGuard)
  async solicitarDescarga(
    @Param('recurso_id') recursoId: string,
    @Req() req: RequestAutenticada,
  ): Promise<{ url_firmada: string; expira_en?: string }> {
    try {
      if (!UUID_RE.test(recursoId)) throw new RecursoNoEncontrado();
      return await this.descargarRecurso.ejecutar(recursoId, req.autenticado?.id || null);
    } catch (error) {
      if (error instanceof RecursoNoEncontrado) {
        throw new HttpException({ title: 'No encontrado', detail: error.message }, 404);
      }
      if (error instanceof RecursoNoAutorizado) {
        throw new HttpException({ title: 'Prohibido', detail: error.message }, 403);
      }
      throw error;
    }
  }
}
