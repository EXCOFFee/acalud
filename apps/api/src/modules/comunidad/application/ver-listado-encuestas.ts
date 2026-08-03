import type { EncuestaResumen, FiltroEncuestas } from '../domain/encuesta';
import type { EncuestasRepository } from '../domain/ports/encuestas.repository';

/** CU-16 §4 (y CU-14 §4, con filtro implícito de sólo activas desde el controller). */
export class VerListadoEncuestas {
  constructor(private readonly repo: EncuestasRepository) {}

  async ejecutar(filtro: FiltroEncuestas): Promise<EncuestaResumen[]> {
    return this.repo.listar(filtro);
  }
}
