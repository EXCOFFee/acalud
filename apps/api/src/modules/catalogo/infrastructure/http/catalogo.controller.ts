import { Controller, Get, HttpException, Param, Query } from '@nestjs/common';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { ListarJuegos, type ListadoJuegos } from '../../application/listar-juegos';
import { VerJuego } from '../../application/ver-juego';
import { JuegoNoEncontrado } from '../../domain/errores';
import type { JuegoDetalle } from '../../domain/juego';
import { type ListadoQuery, listadoQuerySchema } from './esquemas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** BC2 · Catálogo público (CU-006, read-only). Sin autenticación: listado y ficha son públicos. */
@Controller('catalogo')
export class CatalogoController {
  constructor(
    private readonly listar: ListarJuegos,
    private readonly ver: VerJuego,
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
}
