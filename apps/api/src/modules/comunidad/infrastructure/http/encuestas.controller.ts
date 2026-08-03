import { Controller, Get, HttpException, Param, Query, Req, UseGuards } from '@nestjs/common';
import { OpcionalAuthGuard } from '../../../../platform/auth/opcional-auth.guard';
import type { RequestAutenticada } from '../../../../platform/auth/autenticado';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { VerListadoEncuestas } from '../../application/ver-listado-encuestas';
import { VerResultadosEncuesta } from '../../application/ver-resultados-encuesta';
import { EncuestaNoEncontrada } from '../../domain/errores';
import { type ListadoEncuestasQuery, listadoEncuestasQuerySchema } from './encuestas.esquemas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** CU-16 · Ver Resultados de Encuestas (público, anónimo o logueado). */
@Controller('polls')
export class EncuestasController {
  constructor(
    private readonly verListado: VerListadoEncuestas,
    private readonly verResultados: VerResultadosEncuesta,
  ) {}

  @Get()
  async listar(
    @Query(new ZodValidationPipe(listadoEncuestasQuerySchema)) query: ListadoEncuestasQuery,
  ) {
    const encuestas = await this.verListado.ejecutar({
      status: query.status,
      levelId: query.level_id,
    });
    return encuestas.map((e) => ({
      id: e.id,
      pregunta: e.question,
      estado: e.status,
      nivel_educativo_id: e.targetLevelId,
      total_votos: e.totalVotes,
      creada_en: e.createdAt,
    }));
  }

  @Get(':poll_id/results')
  @UseGuards(OpcionalAuthGuard)
  async resultados(@Param('poll_id') pollId: string, @Req() req: RequestAutenticada) {
    try {
      if (!UUID_RE.test(pollId)) throw new EncuestaNoEncontrada();
      const resultados = await this.verResultados.ejecutar(pollId, req.autenticado?.id ?? null);
      return {
        poll_id: resultados.pollId,
        pregunta: resultados.question,
        estado: resultados.status,
        total_votos: resultados.totalVotes,
        opciones: resultados.opciones.map((o) => ({
          id: o.id,
          texto: o.text,
          votos: o.voteCount,
          porcentaje: o.percentage,
        })),
        ya_voto: resultados.hasUserVoted,
        opcion_votada_id: resultados.optionIdVotada,
      };
    } catch (error) {
      if (error instanceof EncuestaNoEncontrada) {
        throw new HttpException({ title: 'No encontrado', detail: error.message }, 404);
      }
      throw error;
    }
  }
}
