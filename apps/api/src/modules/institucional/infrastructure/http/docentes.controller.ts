import { Controller, Get, Post, Body, Req, UseGuards, Query, HttpCode, UnauthorizedException, HttpException } from '@nestjs/common';
import { AuthGuard } from '../../../../platform/auth/auth.guard';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { CargarSesionJuego } from '../../application/cargar-sesion-juego';
import { VerHistorialSesiones } from '../../application/ver-historial-sesiones';
import { CargarSesionBody, cargarSesionSchema } from './docentes.esquemas';
import type { RequestAutenticada } from '../../../../platform/auth/autenticado';
import { DocenteNoVinculado, JuegoNoAsignado } from '../../domain/errores';

function mapearErrorLocal(error: unknown): never {
  if (error instanceof DocenteNoVinculado) {
    throw new HttpException({ title: 'Dato inválido', detail: error.message }, 422);
  }
  if (error instanceof JuegoNoAsignado) {
    throw new HttpException({ title: 'No encontrado', detail: error.message }, 403);
  }
  throw error;
}

@Controller('docentes/me')
export class DocentesController {
  constructor(
    private readonly cargarSesion: CargarSesionJuego,
    private readonly verHistorialSesiones: VerHistorialSesiones
  ) {}

  @Post('sesiones-juego')
  @UseGuards(AuthGuard)
  @HttpCode(201)
  async registrarSesion(
    @Req() req: RequestAutenticada,
    @Body(new ZodValidationPipe(cargarSesionSchema)) body: CargarSesionBody
  ) {
    if (!req.autenticado) throw new UnauthorizedException();
    try {
      return await this.cargarSesion.ejecutar(req.autenticado.id, {
        productoId: body.producto_id,
        fechaUso: body.fecha_uso,
        grupo: body.grupo,
        estudiantes: body.cantidad_estudiantes,
        duracionMinutos: body.duracion_minutos,
        satisfaccionDocente: body.satisfaccion_docente,
        aprendizajesClave: body.aprendizajes_clave,
        dificultades: body.dificultades ?? null,
        reutilizaria: body.reutilizaria
      });
    } catch (error) {
      mapearErrorLocal(error);
    }
  }

  // CU-30: Ver Historial de Sesiones Cargadas
  @Get('sesiones-juego')
  @UseGuards(AuthGuard)
  async listarSesiones(
    @Req() req: RequestAutenticada,
    @Query('producto_id') productoId?: string,
    @Query('pagina') paginaStr?: string,
    @Query('limite') limiteStr?: string
  ) {
    if (!req.autenticado) throw new UnauthorizedException();
    try {
      const pagina = paginaStr ? parseInt(paginaStr, 10) : 1;
      const limite = limiteStr ? parseInt(limiteStr, 10) : 20;

      return await this.verHistorialSesiones.ejecutar(req.autenticado.id, {
        ...(productoId !== undefined && { productoId }),
        pagina,
        limite 
      });
    } catch (error) {
      mapearErrorLocal(error);
    }
  }
}
