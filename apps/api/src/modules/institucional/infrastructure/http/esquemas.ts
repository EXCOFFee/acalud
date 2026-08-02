import { z } from 'zod';

/** CU-23 A5: el CUIT debe tener formato válido (ej. 20-12345678-9, 11 dígitos). */
const cuitSchema = z
  .string()
  .min(1)
  .refine((v) => v.replace(/\D/g, '').length === 11, {
    message: 'El CUIT debe tener 11 dígitos (ej: 20-12345678-9)',
  });

const domicilioSchema = z.object({
  calle: z.string().min(1),
  numero: z.string().min(1),
  localidad: z.string().min(1),
  provincia: z.string().min(1),
  codigo_postal: z.string().min(1),
});

/** Cuerpo de POST /instituciones (CU-23 p3): obligatorios + los tres opcionales. */
export const registrarInstitucionSchema = z.object({
  nombre_legal: z.string().min(1).max(200),
  identificador_tributario: cuitSchema,
  email_institucional: z.string().email().max(255), // CU-23 A6
  domicilio: domicilioSchema,
  telefono: z.string().max(30).nullish(),
  nivel_educativo: z.string().max(100).nullish(),
  cantidad_alumnos: z.number().int().positive().nullish(),
});

export type RegistrarInstitucionInput = z.infer<typeof registrarInstitucionSchema>;

/** Query de GET /instituciones/:id/inventario (CU-25 A5/A6): filtro por producto y orden. */
export const inventarioQuerySchema = z.object({
  producto_id: z.string().uuid().optional(),
  orden: z
    .enum(['cantidad_adquirida', 'cantidad_asignada', 'cantidad_disponible', 'ultima_compra', 'nombre'])
    .optional(),
  direccion: z.enum(['asc', 'desc']).optional(),
});
export type InventarioQuery = z.infer<typeof inventarioQuerySchema>;

/**
 * Cuerpo de POST /instituciones/:id/asignaciones (CU-26 p12).
 * RN-004: la cantidad es un entero mayor a 0 — lo verifica el borde, no la base.
 */
export const asignarLicenciasSchema = z.object({
  producto_id: z.string().uuid(),
  asignaciones: z
    .array(
      z.object({
        docente_id: z.string().uuid(),
        cantidad: z.number().int().positive(),
      }),
    )
    .min(1)
    .refine(
      (lineas) => new Set(lineas.map((l) => l.docente_id)).size === lineas.length,
      // Dos líneas del mismo docente en un pedido son ambiguas (¿suma o reemplazo?); CU-26 p7
      // habla de una cantidad por docente. Se rechaza en vez de adivinar.
      { message: 'Cada docente puede aparecer una sola vez en la asignación' },
    ),
  observaciones: z.string().max(500).nullish(),
});
export type AsignarLicenciasBody = z.infer<typeof asignarLicenciasSchema>;

/**
 * Cuerpo de POST /instituciones/:id/revocaciones (CU-27 p12).
 * A1 / RN-002: la cantidad a revocar es un entero mayor a 0 — lo verifica el borde.
 */
export const revocarLicenciasSchema = z.object({
  docente_id: z.string().uuid(),
  producto_id: z.string().uuid(),
  cantidad_a_revocar: z.number().int().positive(),
  observaciones: z.string().max(500).nullish(),
});
export type RevocarLicenciasBody = z.infer<typeof revocarLicenciasSchema>;

/** Query de GET /instituciones/:id/docentes (CU-28 A6/A7/A8): filtro, búsqueda y orden. */
export const docentesQuerySchema = z.object({
  producto_id: z.string().uuid().optional(),
  buscar: z.string().max(200).optional(),
  orden: z.enum(['total_licencias', 'nombre']).optional(),
  direccion: z.enum(['asc', 'desc']).optional(),
});
export type DocentesQuery = z.infer<typeof docentesQuerySchema>;

/** CU-31: Query de GET /instituciones/:id/reportes/uso. Corte y filtros por fecha, juego o docente. */
export const reporteQuerySchema = z.object({
  corte: z.enum(['juego', 'docente']).default('juego'),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
  producto_id: z.string().uuid().optional(),
  docente_id: z.string().uuid().optional(),
});
export type ReporteQuery = z.infer<typeof reporteQuerySchema>;

/** CU-32: Query de GET /instituciones/:id/reportes/uso/exportar. Hereda filtros de CU-31. */
export const exportarQuerySchema = z.object({
  corte: z.enum(['juego', 'docente']).default('juego'),
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
  producto_id: z.string().uuid().optional(),
  docente_id: z.string().uuid().optional(),
});
export type ExportarQuery = z.infer<typeof exportarQuerySchema>;

/** CU-33: Query de GET /instituciones/:id/dashboard. Rango de fechas (default: últimos 30 días). */
export const dashboardQuerySchema = z.object({
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
});
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
