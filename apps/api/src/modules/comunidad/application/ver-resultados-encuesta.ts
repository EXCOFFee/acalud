import { EncuestaNoEncontrada } from '../domain/errores';
import type { ResultadosEncuesta } from '../domain/encuesta';
import type { EncuestasRepository } from '../domain/ports/encuestas.repository';

/** CU-16 §4: resultados agregados, públicos (anónimo o logueado). */
export class VerResultadosEncuesta {
  constructor(private readonly repo: EncuestasRepository) {}

  async ejecutar(pollId: string, usuarioId: string | null): Promise<ResultadosEncuesta> {
    const resultados = await this.repo.obtenerResultados(pollId, usuarioId);
    if (resultados === null) throw new EncuestaNoEncontrada();
    return resultados;
  }
}
