import { EncuestaNoEncontrada, OpcionInvalida } from '../domain/errores';
import type { ResultadosEncuesta } from '../domain/encuesta';
import type { EncuestasRepository } from '../domain/ports/encuestas.repository';
import type { VotosRepository } from '../domain/ports/votos.repository';

/**
 * CU-14 · Participar en Encuesta. RN-006: un usuario, una respuesta por encuesta — la unicidad
 * la garantiza la restricción `uq_poll_user` (A1 se resuelve ahí, no con una lectura previa).
 */
export class VotarEncuesta {
  constructor(
    private readonly votos: VotosRepository,
    private readonly encuestas: EncuestasRepository,
  ) {}

  async ejecutar(pollId: string, optionId: string, userId: string): Promise<ResultadosEncuesta> {
    const votable = await this.votos.buscarEncuestaVotable(pollId);
    if (votable === null) throw new EncuestaNoEncontrada(); // A2: no existe o no está activa

    const opcionValida = await this.votos.existeOpcion(pollId, optionId);
    if (!opcionValida) throw new OpcionInvalida();

    await this.votos.votar(pollId, optionId, userId); // A1: EncuestaYaVotada si ya existía

    return (await this.encuestas.obtenerResultados(pollId, userId))!;
  }
}
