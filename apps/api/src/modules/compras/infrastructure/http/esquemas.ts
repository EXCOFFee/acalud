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
  modalidad_envio: z.enum(['domicilio', 'sucursal']),
  codigo_postal: z.string().min(1),
  domicilio: domicilioSchema,
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Webhook fake de MP: el payload trae el payment_id (Etapa 3: firma + payload real de MP). */
export const webhookSchema = z.object({
  payment_id: z.string().min(1),
});
export type WebhookInput = z.infer<typeof webhookSchema>;
