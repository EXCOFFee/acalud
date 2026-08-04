import type { CatalogoItem, CatalogoPedagogicoRepository } from '../domain/ports/catalogo-pedagogico.repository';

/** Bloque E: catálogo público de niveles/materias, para los selectores de encuestas/propuestas. */
export class VerCatalogoPedagogico {
  constructor(private readonly repo: CatalogoPedagogicoRepository) {}

  async niveles(): Promise<CatalogoItem[]> {
    return this.repo.listarNiveles();
  }

  async materias(): Promise<CatalogoItem[]> {
    return this.repo.listarMaterias();
  }
}
