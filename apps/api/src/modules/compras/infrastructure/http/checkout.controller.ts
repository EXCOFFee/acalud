import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpException,
  Logger,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../../../platform/auth/auth.guard';
import type { RequestAutenticada } from '../../../../platform/auth/autenticado';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { firmaWebhookMpEsValida } from '../../../../platform/security/mp-webhook-signature';
import { type CheckoutIniciado, IniciarCheckout } from '../../application/iniciar-checkout';
import { ProcesarPago } from '../../application/procesar-pago';
import {
  CarritoNoCheckouteable,
  PagoIndisponible,
  PedidoPendienteExistente,
  SinPermisosInstitucionales,
} from '../../domain/errores';
import type { ResultadoPago } from '../../domain/pedido';
import { type CheckoutInput, checkoutSchema, type WebhookQuery, webhookQuerySchema } from './esquemas';

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
  private readonly logger = new Logger(CheckoutController.name);

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
   * Webhook de pago (CU-12 RN-004/RNF-002). Idempotente y siempre 200 si la firma es válida (MP
   * no debe reintentar). La firma (`x-signature`) NO cubre el body — se verifica contra
   * `data.id` (query), `x-request-id` y el `ts` del propio header (A7: firma inválida → 401, se
   * descarta la notificación sin tocar ningún pedido).
   */
  @Post('webhooks/mercadopago')
  @HttpCode(200)
  async webhook(
    @Query(new ZodValidationPipe(webhookQuerySchema)) query: WebhookQuery,
    @Headers('x-signature') xSignature: string | undefined,
    @Headers('x-request-id') xRequestId: string | undefined,
  ): Promise<{ resultado: ResultadoPago }> {
    const dataId = query['data.id'];
    const valida = firmaWebhookMpEsValida({
      xSignature,
      xRequestId,
      dataId,
      secret: process.env.MP_WEBHOOK_SECRET ?? '',
    });
    if (!valida) {
      this.logger.warn(`Webhook MP con firma inválida descartado (x-request-id=${xRequestId ?? '?'})`);
      throw new UnauthorizedException('Firma de webhook inválida');
    }
    const resultado = await this.procesar.ejecutar(dataId);
    return { resultado };
  }
}
