import { Inject, Injectable } from '@nestjs/common';
import { DemoNoEncontrada } from '../domain/errores';
import { DEMOS_REPOSITORY, type DemosRepository, type ContenidoDemo } from '../domain/ports/demos.repository';

@Injectable()
export class ProbarDemoPublica {
  constructor(
    @Inject(DEMOS_REPOSITORY)
    private readonly demos: DemosRepository,
  ) {}

  /**
   * CU-006: Devuelve el contenido embebido de la demo pública de un juego.
   * Lanza DemoNoEncontrada si el juego no tiene demo pública.
   */
  async ejecutar(juegoSlugOId: string): Promise<ContenidoDemo> {
    const demo = await this.demos.obtenerDemo(juegoSlugOId, 'publica');
    if (!demo) {
      throw new DemoNoEncontrada();
    }
    return demo;
  }
}
