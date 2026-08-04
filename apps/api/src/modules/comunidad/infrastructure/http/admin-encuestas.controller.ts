import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../../../../platform/auth/admin.guard';
import { AuthGuard } from '../../../../platform/auth/auth.guard';
import type { RequestAutenticada } from '../../../../platform/auth/autenticado';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { ActualizarEncuesta } from '../../application/actualizar-encuesta';
import { AlternarEstadoEncuesta } from '../../application/alternar-estado-encuesta';
import { CrearEncuesta } from '../../application/crear-encuesta';
import { EliminarEncuesta } from '../../application/eliminar-encuesta';
import { ListarEncuestasAdmin } from '../../application/listar-encuestas-admin';
import { EncuestaActivaNoEditable, EncuestaAdminNoEncontrada, NivelEducativoInvalido } from '../../domain/errores';
import type { EncuestaAdmin } from '../../domain/encuesta-admin';
import { type EncuestaAdminBody, encuestaAdminSchema } from './admin-encuestas.esquemas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapearError(error: unknown): never {
  if (error instanceof EncuestaAdminNoEncontrada) {
    throw new HttpException({ title: 'No encontrado', detail: error.message }, 404);
  }
  if (error instanceof EncuestaActivaNoEditable) {
    throw new HttpException({ title: 'Conflicto', detail: error.message }, 409);
  }
  if (error instanceof NivelEducativoInvalido) {
    throw new HttpException({ title: 'Dato inválido', detail: error.message }, 422);
  }
  throw error;
}

function aDatosEncuesta(body: EncuestaAdminBody) {
  return {
    question: body.pregunta,
    targetLevelId: body.nivel_educativo_id ?? null,
    opciones: body.opciones,
  };
}

function aRespuesta(e: EncuestaAdmin) {
  return {
    id: e.id,
    pregunta: e.question,
    estado: e.status,
    nivel_educativo_id: e.targetLevelId,
    creada_en: e.createdAt,
    opciones: e.opciones.map((o) => ({ id: o.id, texto: o.text })),
  };
}

/** CU-20 · ABM de encuestas (RN-001: solo `role = admin`). */
@Controller('admin/polls')
@UseGuards(AuthGuard, AdminGuard)
export class AdminEncuestasController {
  constructor(
    private readonly listar: ListarEncuestasAdmin,
    private readonly crearEncuesta: CrearEncuesta,
    private readonly actualizarEncuesta: ActualizarEncuesta,
    private readonly alternarEstado: AlternarEstadoEncuesta,
    private readonly eliminarEncuesta: EliminarEncuesta,
  ) {}

  @Get()
  async listarTodas() {
    const encuestas = await this.listar.ejecutar();
    return encuestas.map((e) => ({
      id: e.id,
      pregunta: e.question,
      estado: e.status,
      nivel_educativo_id: e.targetLevelId,
      creada_en: e.createdAt,
      total_votos: e.totalVotes,
    }));
  }

  // CU-20 A2: detalle completo, para precargar el formulario de edición (F5 del frontend).
  @Get(':poll_id')
  async detalle(@Param('poll_id') pollId: string) {
    try {
      if (!UUID_RE.test(pollId)) throw new EncuestaAdminNoEncontrada();
      const encuesta = await this.listar.detalle(pollId);
      return aRespuesta(encuesta);
    } catch (error) {
      mapearError(error);
    }
  }

  @Post()
  async crear(
    @Req() req: RequestAutenticada,
    @Body(new ZodValidationPipe(encuestaAdminSchema)) body: EncuestaAdminBody,
  ) {
    try {
      const encuesta = await this.crearEncuesta.ejecutar({
        ...aDatosEncuesta(body),
        adminId: req.autenticado!.id,
      });
      return aRespuesta(encuesta);
    } catch (error) {
      mapearError(error);
    }
  }

  @Put(':poll_id')
  async actualizar(
    @Param('poll_id') pollId: string,
    @Req() req: RequestAutenticada,
    @Body(new ZodValidationPipe(encuestaAdminSchema)) body: EncuestaAdminBody,
  ) {
    try {
      if (!UUID_RE.test(pollId)) throw new EncuestaAdminNoEncontrada();
      const encuesta = await this.actualizarEncuesta.ejecutar(pollId, {
        ...aDatosEncuesta(body),
        adminId: req.autenticado!.id,
      });
      return aRespuesta(encuesta);
    } catch (error) {
      mapearError(error);
    }
  }

  @Patch(':poll_id/toggle')
  async toggle(@Param('poll_id') pollId: string, @Req() req: RequestAutenticada) {
    try {
      if (!UUID_RE.test(pollId)) throw new EncuestaAdminNoEncontrada();
      const encuesta = await this.alternarEstado.ejecutar(pollId, req.autenticado!.id);
      return aRespuesta(encuesta);
    } catch (error) {
      mapearError(error);
    }
  }

  @Delete(':poll_id')
  @HttpCode(204)
  async eliminar(@Param('poll_id') pollId: string, @Req() req: RequestAutenticada) {
    try {
      if (!UUID_RE.test(pollId)) throw new EncuestaAdminNoEncontrada();
      await this.eliminarEncuesta.ejecutar(pollId, req.autenticado!.id);
    } catch (error) {
      mapearError(error);
    }
  }
}
