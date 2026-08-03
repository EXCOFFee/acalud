import { Body, Controller, Get, HttpException, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../../platform/auth/auth.guard';
import { OpcionalAuthGuard } from '../../../../platform/auth/opcional-auth.guard';
import type { RequestAutenticada } from '../../../../platform/auth/autenticado';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { VerListadoEncuestas } from '../../application/ver-listado-encuestas';
import { VerResultadosEncuesta } from '../../application/ver-resultados-encuesta';
import { VotarEncuesta } from '../../application/votar-encuesta';
import { EncuestaNoEncontrada, EncuestaYaVotada, OpcionInvalida } from '../../domain/errores';
import type { ResultadosEncuesta } from '../../domain/encuesta';
import {
  type ListadoEncuestasQuery,
  listadoEncuestasQuerySchema,
  type VotarEncuestaBody,
  votarEncuestaSchema,
} from './encuestas.esquemas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function aRespuestaResultados(r: ResultadosEncuesta) {
  return {
    poll_id: r.pollId,
    pregunta: r.question,
    estado: r.status,
    total_votos: r.totalVotes,
    opciones: r.opciones.map((o) => ({
      id: o.id,
      texto: o.text,
      votos: o.voteCount,
      porcentaje: o.percentage,
    })),
    ya_voto: r.hasUserVoted,
    opcion_votada_id: r.optionIdVotada,
  };
}

/** CU-14/CU-16 · Encuestas públicas: listado, resultados y participación. */
@Controller('polls')
export class EncuestasController {
  constructor(
    private readonly verListado: VerListadoEncuestas,
    private readonly verResultados: VerResultadosEncuesta,
    private readonly votarEncuesta: VotarEncuesta,
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
      return aRespuestaResultados(resultados);
    } catch (error) {
      if (error instanceof EncuestaNoEncontrada) {
        throw new HttpException({ title: 'No encontrado', detail: error.message }, 404);
      }
      throw error;
    }
  }

  // RN-006: requiere sesión (AuthGuard); anónimo no puede votar (A6).
  @Post(':poll_id/responses')
  @UseGuards(AuthGuard)
  async votar(
    @Param('poll_id') pollId: string,
    @Req() req: RequestAutenticada,
    @Body(new ZodValidationPipe(votarEncuestaSchema)) body: VotarEncuestaBody,
  ) {
    try {
      if (!UUID_RE.test(pollId)) throw new EncuestaNoEncontrada();
      const resultados = await this.votarEncuesta.ejecutar(pollId, body.opcion_id, req.autenticado!.id);
      return aRespuestaResultados(resultados);
    } catch (error) {
      if (error instanceof EncuestaNoEncontrada) {
        throw new HttpException({ title: 'No encontrado', detail: error.message }, 404);
      }
      if (error instanceof EncuestaYaVotada) {
        throw new HttpException({ title: 'Conflicto', detail: error.message }, 409);
      }
      if (error instanceof OpcionInvalida) {
        throw new HttpException({ title: 'Dato inválido', detail: error.message }, 422);
      }
      throw error;
    }
  }
}
