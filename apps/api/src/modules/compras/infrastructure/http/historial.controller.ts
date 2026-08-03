import { Controller, Get, HttpException, Param, Query, Req, UseGuards } from '@nestjs/common';
import { VerHistorial } from '../../application/ver-historial';
import { VerSeguimientoPedido } from '../../application/ver-seguimiento-pedido';
import { AuthGuard } from '../../../../platform/auth/auth.guard';
import type { RequestAutenticada } from '../../../../platform/auth/autenticado';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { FiltroHistorialSchema, FiltroHistorialDto } from './esquemas';
import {
  OrdenNoEncontrada,
  PedidoNoDespachado,
  PedidoSinTracking,
  ProveedorLogisticoNoDisponible,
} from '../../domain/errores';

function mapearError(error: unknown): never {
  if (error instanceof OrdenNoEncontrada) {
    throw new HttpException({ title: 'No encontrado', detail: error.message }, 404);
  }
  if (error instanceof PedidoSinTracking || error instanceof PedidoNoDespachado) {
    throw new HttpException({ title: 'Conflicto', detail: error.message }, 409);
  }
  if (error instanceof ProveedorLogisticoNoDisponible) {
    throw new HttpException({ title: 'Servicio no disponible', detail: error.message }, 503);
  }
  throw error;
}

@Controller('pedidos')
@UseGuards(AuthGuard)
export class HistorialController {
  constructor(
    private readonly verHistorial: VerHistorial,
    private readonly verSeguimiento: VerSeguimientoPedido,
  ) {}

  @Get()
  async listar(
    @Req() req: RequestAutenticada,
    @Query(new ZodValidationPipe(FiltroHistorialSchema)) filtro: FiltroHistorialDto,
  ) {
    try {
      return await this.verHistorial.ejecutar(req.autenticado!.id, filtro);
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

  // CU-13: RNF-009 — el código de tracking no va en la URL, se resuelve server-side desde order_id.
  @Get(':id/tracking')
  async tracking(@Req() req: RequestAutenticada, @Param('id') pedidoId: string) {
    try {
      const seguimiento = await this.verSeguimiento.ejecutar(req.autenticado!.id, pedidoId);
      return {
        estado_actual: seguimiento.estadoActual,
        eventos: seguimiento.eventos.map((e) => ({
          estado: e.estado,
          ubicacion: e.ubicacion,
          descripcion: e.descripcion,
          fecha: e.fecha,
        })),
        fecha_estimada_entrega: seguimiento.fechaEstimadaEntrega,
        direccion_entrega: seguimiento.direccionEntrega,
        ultima_actualizacion: seguimiento.ultimaActualizacion,
        desde_cache: seguimiento.desdeCache,
      };
    } catch (error) {
      mapearError(error);
    }
  }
}
