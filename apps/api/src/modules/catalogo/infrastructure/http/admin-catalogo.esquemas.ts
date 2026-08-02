import { z } from 'zod';

/**
 * Cuerpo de POST /admin/products y PUT /admin/products/:id (CU-19 p6/A1.5: la edición reenvía
 * el formulario completo, "mismo que pasos 10-14").
 */
export const productoAdminSchema = z
  .object({
    titulo: z.string().trim().min(1, 'El título es obligatorio').max(200), // A3
    descripcion: z.string().trim().min(1, 'La descripción es obligatoria'), // A3
    precio: z.number().min(0, 'El precio debe ser mayor o igual a 0'), // RN-006
    stock: z.number().int().min(0, 'El stock debe ser mayor o igual a 0'), // RN-007
    marca_propia: z.boolean(),
    url_externa: z.string().trim().url().nullish(),
    categoria_id: z.string().uuid().nullish(),
    umbral_mayorista: z.number().int().positive().nullish(),
    descuento_mayorista_porcentaje: z.number().min(0).max(100).nullish(),
    imagen_url: z.string().trim().url().nullish(),
  })
  .refine((v) => (v.marca_propia ? !v.url_externa : !!v.url_externa), {
    // A4 / RN-003 / RN-004
    message: 'Los productos de terceros deben tener una URL externa válida; los propios no deben tenerla',
    path: ['url_externa'],
  })
  .refine((v) => (v.umbral_mayorista == null) === (v.descuento_mayorista_porcentaje == null), {
    // A5 / RN-005
    message: 'Si configurás descuento mayorista, debés completar tanto el umbral como el porcentaje',
    path: ['umbral_mayorista'],
  });

export type ProductoAdminBody = z.infer<typeof productoAdminSchema>;
