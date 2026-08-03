import { Body, Controller, Delete, Get, HttpCode, HttpException, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../../platform/auth/auth.guard';
import type { RequestAutenticada } from '../../../../platform/auth/autenticado';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { EliminarFavorito } from '../../application/eliminar-favorito';
import { GuardarFavorito } from '../../application/guardar-favorito';
import { VerMisFavoritos } from '../../application/ver-mis-favoritos';
import { ElementoFavoritoNoEncontrado, FavoritoDuplicado, FavoritoNoEncontrado } from '../../domain/errores';
import { type GuardarFavoritoBody, guardarFavoritoSchema } from './favoritos.esquemas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** CU-18 · Guardar Favorito (RN-008: requiere sesión — anónimo no guarda). */
@Controller('favorites')
@UseGuards(AuthGuard)
export class FavoritosController {
  constructor(
    private readonly guardarFavorito: GuardarFavorito,
    private readonly verMisFavoritos: VerMisFavoritos,
    private readonly eliminarFavorito: EliminarFavorito,
  ) {}

  @Get()
  async mios(@Req() req: RequestAutenticada) {
    const favoritos = await this.verMisFavoritos.ejecutar(req.autenticado!.id);
    return favoritos.map((f) => ({
      id: f.id,
      tipo: f.tipo,
      item_id: f.itemId,
      titulo: f.titulo,
      creado_en: f.createdAt,
    }));
  }

  @Post()
  async crear(
    @Req() req: RequestAutenticada,
    @Body(new ZodValidationPipe(guardarFavoritoSchema)) body: GuardarFavoritoBody,
  ) {
    try {
      const favorito = await this.guardarFavorito.ejecutar({
        userId: req.autenticado!.id,
        productId: body.producto_id ?? null,
        resourceId: body.recurso_id ?? null,
        editorialPartnerId: body.editorial_id ?? null,
      });
      return {
        id: favorito.id,
        producto_id: favorito.productId,
        recurso_id: favorito.resourceId,
        editorial_id: favorito.editorialPartnerId,
        creado_en: favorito.createdAt,
      };
    } catch (error) {
      if (error instanceof ElementoFavoritoNoEncontrado) {
        throw new HttpException({ title: 'No encontrado', detail: error.message }, 404);
      }
      if (error instanceof FavoritoDuplicado) {
        throw new HttpException({ title: 'Conflicto', detail: error.message }, 409);
      }
      throw error;
    }
  }

  @Delete(':favorito_id')
  @HttpCode(204)
  async eliminar(@Param('favorito_id') favoritoId: string, @Req() req: RequestAutenticada) {
    try {
      if (!UUID_RE.test(favoritoId)) throw new FavoritoNoEncontrado();
      await this.eliminarFavorito.ejecutar(req.autenticado!.id, favoritoId);
    } catch (error) {
      if (error instanceof FavoritoNoEncontrado) {
        throw new HttpException({ title: 'No encontrado', detail: error.message }, 404);
      }
      throw error;
    }
  }
}
