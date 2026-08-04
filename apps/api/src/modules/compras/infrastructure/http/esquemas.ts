import { z } from 'zod';

/** Cuerpo del upsert de línea: el cliente manda SOLO la cantidad, jamás precios (CU-010). */
export const cantidadSchema = z.object({
  cantidad: z.number().int().min(1).max(99),
});
export type CantidadInput = z.infer<typeof cantidadSchema>;

/** `contexto` = institucion_id (compra institucional) o ausente = personal. */
export const contextoQuerySchema = z.object({
  contexto: z.string().uuid().optional(),
});
export type ContextoQuery = z.infer<typeof contextoQuerySchema>;

const domicilioSchema = z.object({
  calle: z.string().min(1),
  numero: z.string().min(1),
  codigo_postal: z.string().min(1),
  provincia: z.string().min(1),
  localidad: z.string().min(1),
});

/** Cuerpo de POST /checkout (CU-012): domicilio + envío; el cliente NO manda precios. */
export const checkoutSchema = z.object({
  contexto: z.string().uuid().optional(),
  modalidad_envio: z.enum(['home_delivery', 'branch_pickup']),
  codigo_postal: z.string().min(1),
  domicilio: domicilioSchema,
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/**
 * Query string real del webhook de Mercado Pago (CU-12): `data.id` es el payment_id, y es lo
 * que entra en el manifest de la firma (RN-004) — el body no participa de la verificación.
 */
export const webhookQuerySchema = z.object({
  'data.id': z.string().min(1),
});
export type WebhookQuery = z.infer<typeof webhookQuerySchema>;

/** CU-11 A1: código postal argentino, 4 dígitos (ej: 1425). A4: al menos un ítem. */
export const calcularEnvioSchema = z.object({
  codigo_postal: z.string().regex(/^\d{4}$/, 'El código postal debe tener 4 dígitos'),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid(),
        quantity: z.number().int().min(1),
      }),
    )
    .min(1),
});
export type CalcularEnvioInput = z.infer<typeof calcularEnvioSchema>;

export const FiltroHistorialSchema = z.object({
  estado: z.enum(['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'under_review']).optional(),
  orden_por: z.enum(['created_at', 'total_amount']).optional(),
  orden_dir: z.enum(['asc', 'desc']).optional(),
  pagina: z.coerce.number().int().min(1).optional(),
  limite: z.coerce.number().int().min(1).max(100).optional(),
});
export type FiltroHistorialDto = z.infer<typeof FiltroHistorialSchema>;
