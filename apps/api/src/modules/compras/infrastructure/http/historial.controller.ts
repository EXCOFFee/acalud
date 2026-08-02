import { Controller, Get, HttpException, Param, Query, Req, UseGuards } from '@nestjs/common';
import { VerHistorial } from '../../application/ver-historial';
import { AuthGuard } from '../../../../platform/auth/auth.guard';
import type { RequestAutenticada } from '../../../../platform/auth/autenticado';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { FiltroHistorialSchema, FiltroHistorialDto } from './esquemas';
import type { DetalleOrdenHistorial, FiltroHistorial, HistorialRepository, OrdenHistorial, ResultadoPaginado } from '../../domain/ports/historial.repository';
import { OrdenNoEncontrada } from '../../domain/errores';

function mapearError(error: unknown): never {
  if (error instanceof OrdenNoEncontrada) {
    throw new HttpException({ title: 'No encontrado', detail: error.message }, 404);
  }
  throw error;
}

@Controller('pedidos')
@UseGuards(AuthGuard)
export class HistorialController {
  constructor(private readonly verHistorial: VerHistorial) {}

  @Get()
  async listar(
    @Req() req: RequestAutenticada,
    @Query(new ZodValidationPipe(FiltroHistorialSchema)) filtro: FiltroHistorialDto,
  ) {
    try {
      return await this.verHistorial.ejecutar(req.autenticado!.id, filtro as any);
    } catch (error) {
      mapearError(error);
    }
  }

  @Get(':id')
  async detalle(
    @Req() req: RequestAutenticada,
    @Param('id') pedidoId: string,
  ) {
    try {
      return await this.verHistorial.detalle(req.autenticado!.id, pedidoId);
    } catch (error) {
      mapearError(error);
    }
  }
}
