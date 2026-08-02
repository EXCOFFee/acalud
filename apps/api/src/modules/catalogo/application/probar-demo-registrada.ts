import { Inject, Injectable } from '@nestjs/common';
import { DemoNoEncontrada } from '../domain/errores';
import { DEMOS_REPOSITORY, type DemosRepository, type ContenidoDemo } from '../domain/ports/demos.repository';

@Injectable()
export class ProbarDemoRegistrada {
  constructor(
    @Inject(DEMOS_REPOSITORY)
    private readonly demos: DemosRepository,
  ) {}

  /**
   * CU-007: Devuelve el contenido embebido de la demo completa y registra la prueba.
   * Requiere un docente logueado. Lanza DemoNoEncontrada si no existe.
   */
  async ejecutar(docenteId: string, juegoSlugOId: string): Promise<ContenidoDemo> {
    const demo = await this.demos.obtenerDemo(juegoSlugOId, 'completa');
    if (!demo) {
      throw new DemoNoEncontrada();
    }

    // Registra el evento de que el docente probó esta demo (auditoría/marketing)
    await this.demos.registrarPrueba(docenteId, demo.juegoId, demo.demoId);

    return demo;
  }
}
