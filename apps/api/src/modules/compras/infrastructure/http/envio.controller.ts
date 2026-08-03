import { Body, Controller, HttpCode, HttpException, Post } from '@nestjs/common';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { CalcularEnvio, type OpcionEnvio } from '../../application/calcular-envio';
import { ProveedorLogisticoNoDisponible } from '../../domain/errores';
import { type CalcularEnvioInput, calcularEnvioSchema } from './esquemas';

interface RespuestaOpcionEnvio {
  modalidad: string;
  nombre_servicio: string;
  costo: number;
  plazo_estimado_dias: number;
  tracking_disponible: boolean;
}

function mapearError(error: unknown): never {
  if (error instanceof ProveedorLogisticoNoDisponible) {
    throw new HttpException({ title: 'Servicio no disponible', detail: error.message }, 503);
  }
  throw error;
}

function aRespuesta(o: OpcionEnvio): RespuestaOpcionEnvio {
  return {
    modalidad: o.modalidad,
    nombre_servicio: o.nombreServicio,
    costo: o.costo,
    plazo_estimado_dias: o.plazoEstimadoDias,
    tracking_disponible: o.trackingDisponible,
  };
}

/**
 * CU-11 · Calcular costo de envío. Sin autenticación (A8: también lo usa un usuario anónimo,
 * desde el carrito guardado en `localStorage`): el cliente manda los ítems en el cuerpo, no se
 * lee ningún carrito server-side acá.
 */
@Controller('shipping')
export class EnvioController {
  constructor(private readonly calcularEnvio: CalcularEnvio) {}

  @Post('calculate')
  @HttpCode(200)
  async calcular(
    @Body(new ZodValidationPipe(calcularEnvioSchema)) body: CalcularEnvioInput,
  ): Promise<{ opciones: RespuestaOpcionEnvio[] }> {
    try {
      const opciones = await this.calcularEnvio.ejecutar(
        body.codigo_postal,
        body.items.map((i) => ({ productoId: i.product_id, cantidad: i.quantity })),
      );
      return { opciones: opciones.map(aRespuesta) };
    } catch (error) {
      mapearError(error);
    }
  }
}
