import { Controller, Get } from '@nestjs/common';
import { VerCatalogoPedagogico } from '../../application/ver-catalogo-pedagogico';
import type { CatalogoItem } from '../../domain/ports/catalogo-pedagogico.repository';

function aRespuesta(items: CatalogoItem[]) {
  return items.map((i) => ({ id: i.id, nombre: i.name }));
}

/**
 * Bloque E: catálogo público de niveles/materias (sin sesión) — para armar los selectores de
 * `/encuestas`, `/propuestas` y `/admin/encuestas`.
 */
@Controller()
export class CatalogoPedagogicoController {
  constructor(private readonly verCatalogo: VerCatalogoPedagogico) {}

  @Get('levels')
  async niveles() {
    return aRespuesta(await this.verCatalogo.niveles());
  }

  @Get('subjects')
  async materias() {
    return aRespuesta(await this.verCatalogo.materias());
  }
}
