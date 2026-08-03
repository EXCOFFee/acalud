import { z } from 'zod';

/** Cuerpo de PUT /admin/products/:product_id/demo (CU-19 A8.4). */
export const asignarDemoSchema = z.object({
  configuracion_json: z.record(z.string(), z.unknown()), // A8.7/RN-008: JSON válido (ya lo garantiza el parseo del body)
  url_unity_webgl: z.string().trim().url().nullish(),
});

export type AsignarDemoBody = z.infer<typeof asignarDemoSchema>;
