import { z } from 'zod';

/** Cuerpo de POST /favorites (CU-18 p6 / RN-002/RN-003: exactamente un elemento). */
export const guardarFavoritoSchema = z
  .object({
    producto_id: z.string().uuid().nullish(),
    recurso_id: z.string().uuid().nullish(),
    editorial_id: z.string().uuid().nullish(),
  })
  .refine(
    (v) => [v.producto_id, v.recurso_id, v.editorial_id].filter((x) => x != null).length === 1,
    { message: 'Debés especificar el elemento a guardar como favorito (producto, recurso o editorial)' }, // A3
  );
export type GuardarFavoritoBody = z.infer<typeof guardarFavoritoSchema>;
