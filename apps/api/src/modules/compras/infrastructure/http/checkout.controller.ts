import {
  Body,
  Controller,
  HttpCode,
  HttpException,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../../../platform/auth/auth.guard';
import type { RequestAutenticada } from '../../../../platform/auth/autenticado';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { type CheckoutIniciado, IniciarCheckout } from '../../application/iniciar-checkout';
import { ProcesarPago } from '../../application/procesar-pago';
import {
  CarritoNoCheckouteable,
  PagoIndisponible,
  PedidoPendienteExistente,
  SinPermisosInstitucionales,
} from '../../domain/errores';
import type { ResultadoPago } from '../../domain/pedido';
import { type CheckoutInput, checkoutSchema, type WebhookInput, webhookSchema } from './esquemas';

function mapearError(error: unknown): never {
  if (error instanceof PedidoPendienteExistente) {
    throw new HttpException({ title: 'Pago en curso', detail: error.message }, 409);
  }
  if (error instanceof CarritoNoCheckouteable) {
    throw new HttpException({ title: 'No se puede continuar', detail: error.message }, 422);
  }
  if (error instanceof SinPermisosInstitucionales) {
    throw new HttpException({ title: 'No encontrado', detail: error.message }, 404);
  }
  if (error instanceof PagoIndisponible) {
    throw new HttpException({ title: 'Pago indisponible', detail: error.message }, 503);
  }
  throw error;
}

/** BC Compras · Checkout (CU-012). POST /checkout (autenticado) + webhook de pago. */
@Controller()
export class CheckoutController {
  constructor(
    private readonly iniciar: IniciarCheckout,
    private readonly procesar: ProcesarPago,
  ) {}

  @Post('checkout')
  @UseGuards(AuthGuard)
  @HttpCode(201)
  async checkout(
    @Req() req: RequestAutenticada,
    @Body(new ZodValidationPipe(checkoutSchema)) body: CheckoutInput,
  ): Promise<CheckoutIniciado> {
    if (req.autenticado === undefined) throw new UnauthorizedException();
    try {
      return await this.iniciar.ejecutar({
        cuentaId: req.autenticado.id,
        contexto: body.contexto ?? null, // CU-24: institution_id si es compra institucional
        modalidadEnvio: body.modalidad_envio,
        codigoPostal: body.codigo_postal,
        domicilio: body.domicilio,
      });
    } catch (error) {
      mapearError(error);
    }
  }

  /**
   * Webhook de pago. Idempotente y siempre 200 (MP no debe reintentar). FAKE en Etapa 1: sin
   * verificación de firma (Etapa 3 agrega x-signature + payload real de MP).
   */
  @Post('webhooks/mercadopago')
  @HttpCode(200)
  async webhook(
    @Body(new ZodValidationPipe(webhookSchema)) body: WebhookInput,
  ): Promise<{ resultado: ResultadoPago }> {
    const resultado = await this.procesar.ejecutar(body.payment_id);
    return { resultado };
  }
}
