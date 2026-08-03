import { Body, Controller, Get, HttpException, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../../platform/auth/auth.guard';
import type { RequestAutenticada } from '../../../../platform/auth/autenticado';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { CrearPropuesta } from '../../application/crear-propuesta';
import { VerMisPropuestas } from '../../application/ver-mis-propuestas';
import { MateriaInvalida, NivelEducativoInvalido, PropuestaDuplicada } from '../../domain/errores';
import { type CrearPropuestaBody, crearPropuestaSchema } from './propuestas.esquemas';

/** CU-15 · Enviar Propuesta de Juego (requiere sesión, RN-006/A6: el anónimo no puede enviar). */
@Controller('proposals')
@UseGuards(AuthGuard)
export class PropuestasController {
  constructor(
    private readonly crearPropuesta: CrearPropuesta,
    private readonly verMisPropuestas: VerMisPropuestas,
  ) {}

  @Get()
  async mias(@Req() req: RequestAutenticada) {
    const propuestas = await this.verMisPropuestas.ejecutar(req.autenticado!.id);
    return propuestas.map((p) => ({
      id: p.id,
      titulo: p.title,
      estado: p.status,
      creada_en: p.createdAt,
      actualizada_en: p.updatedAt,
    }));
  }

  @Post()
  async crear(
    @Req() req: RequestAutenticada,
    @Body(new ZodValidationPipe(crearPropuestaSchema)) body: CrearPropuestaBody,
  ) {
    try {
      const propuesta = await this.crearPropuesta.ejecutar({
        userId: req.autenticado!.id,
        autorNombre: `${req.autenticado!.nombre} ${req.autenticado!.apellido}`.trim(),
        title: body.titulo,
        description: body.descripcion,
        subjectId: body.materia_id ?? null,
        targetLevelId: body.nivel_educativo_id ?? null,
      });
      return {
        id: propuesta.id,
        titulo: propuesta.title,
        descripcion: propuesta.description,
        materia_id: propuesta.subjectId,
        nivel_educativo_id: propuesta.targetLevelId,
        estado: propuesta.status,
        creada_en: propuesta.createdAt,
      };
    } catch (error) {
      if (error instanceof MateriaInvalida || error instanceof NivelEducativoInvalido) {
        throw new HttpException({ title: 'Dato inválido', detail: error.message }, 422);
      }
      if (error instanceof PropuestaDuplicada) {
        throw new HttpException({ title: 'Conflicto', detail: error.message }, 409);
      }
      throw error;
    }
  }
}
