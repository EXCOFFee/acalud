import { Body, Controller, Get, HttpException, Param, Put, Query, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../../../platform/auth/admin.guard';
import { AuthGuard } from '../../../../platform/auth/auth.guard';
import type { RequestAutenticada } from '../../../../platform/auth/autenticado';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { ActualizarEstadoPropuesta } from '../../application/actualizar-estado-propuesta';
import { ListarPropuestasAdmin } from '../../application/listar-propuestas-admin';
import { VerDetallePropuestaAdmin } from '../../application/ver-detalle-propuesta-admin';
import { PropuestaNoEncontrada, RevisionSinCambios, TransicionEstadoInvalida } from '../../domain/errores';
import type { Propuesta, PropuestaDetalleAdmin } from '../../domain/propuesta';
import {
  type ActualizarPropuestaBody,
  actualizarPropuestaSchema,
  type ListadoPropuestasAdminQuery,
  listadoPropuestasAdminQuerySchema,
} from './admin-propuestas.esquemas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapearError(error: unknown): never {
  if (error instanceof PropuestaNoEncontrada) {
    throw new HttpException({ title: 'No encontrado', detail: error.message }, 404);
  }
  if (error instanceof TransicionEstadoInvalida || error instanceof RevisionSinCambios) {
    throw new HttpException({ title: 'Conflicto', detail: error.message }, 409);
  }
  throw error;
}

function aRespuestaDetalle(p: PropuestaDetalleAdmin) {
  return {
    id: p.id,
    titulo: p.title,
    descripcion: p.description,
    autor: { id: p.userId, nombre: p.autorNombre, email: p.autorEmail },
    materia_id: p.subjectId,
    nivel_educativo_id: p.targetLevelId,
    estado: p.status,
    feedback_admin: p.adminFeedback,
    creada_en: p.createdAt,
    actualizada_en: p.updatedAt,
  };
}

function aRespuesta(p: Propuesta) {
  return {
    id: p.id,
    titulo: p.title,
    estado: p.status,
    feedback_admin: p.adminFeedback,
    actualizada_en: p.updatedAt,
  };
}

/** CU-21 · Revisar Propuestas de Juegos (RN-001: solo `role = admin`). */
@Controller('admin/proposals')
@UseGuards(AuthGuard, AdminGuard)
export class AdminPropuestasController {
  constructor(
    private readonly listar: ListarPropuestasAdmin,
    private readonly verDetalle: VerDetallePropuestaAdmin,
    private readonly actualizarEstado: ActualizarEstadoPropuesta,
  ) {}

  @Get()
  async listarTodas(
    @Query(new ZodValidationPipe(listadoPropuestasAdminQuerySchema)) query: ListadoPropuestasAdminQuery,
  ) {
    const propuestas = await this.listar.ejecutar({
      status: query.status,
      search: query.search,
      ordenDir: query.order,
    });
    return propuestas.map((p) => ({
      id: p.id,
      titulo: p.title,
      autor: p.autorNombre,
      estado: p.status,
      creada_en: p.createdAt,
    }));
  }

  @Get(':proposal_id')
  async detalle(@Param('proposal_id') proposalId: string) {
    try {
      if (!UUID_RE.test(proposalId)) throw new PropuestaNoEncontrada();
      const propuesta = await this.verDetalle.ejecutar(proposalId);
      return aRespuestaDetalle(propuesta);
    } catch (error) {
      mapearError(error);
    }
  }

  @Put(':proposal_id')
  async actualizar(
    @Param('proposal_id') proposalId: string,
    @Req() req: RequestAutenticada,
    @Body(new ZodValidationPipe(actualizarPropuestaSchema)) body: ActualizarPropuestaBody,
  ) {
    try {
      if (!UUID_RE.test(proposalId)) throw new PropuestaNoEncontrada();
      const propuesta = await this.actualizarEstado.ejecutar(proposalId, {
        status: body.estado,
        feedback: body.feedback ?? null,
        adminId: req.autenticado!.id,
      });
      return aRespuesta(propuesta);
    } catch (error) {
      mapearError(error);
    }
  }
}
