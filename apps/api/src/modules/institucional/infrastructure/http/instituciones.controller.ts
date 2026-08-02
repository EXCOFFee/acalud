import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../../../platform/auth/auth.guard';
import type { RequestAutenticada } from '../../../../platform/auth/autenticado';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { AsignarLicencias, type LicenciasAsignadas } from '../../application/asignar-licencias';
import {
  type InstitucionRegistrada,
  RegistrarInstitucion,
} from '../../application/registrar-institucion';
import { type LicenciaRevocada, RevocarLicencias } from '../../application/revocar-licencias';
import {
  type DetalleDocenteAsignaciones,
  type ListadoDocentesAsignados,
  VerDocentesAsignados,
} from '../../application/ver-docentes-asignados';
import {
  type DetalleProductoInventario,
  type InventarioInstitucional,
  VerInventario,
} from '../../application/ver-inventario';
import {
  AsignacionNoEncontrada,
  CantidadRevocacionInvalida,
  CuitDuplicado,
  DocenteNoEncontrado,
  DocenteNoVinculado,
  EmailInstitucionalDuplicado,
  InventarioNoVisible,
  LicenciasInsuficientes,
  NivelEducativoInvalido,
  ProductoNoEnInventario,
  SinPermisosDeEncargado,
  UsuarioYaVinculado,
} from '../../domain/errores';
import {
  type AsignarLicenciasBody,
  asignarLicenciasSchema,
  type DocentesQuery,
  docentesQuerySchema,
  type InventarioQuery,
  inventarioQuerySchema,
  type RegistrarInstitucionInput,
  registrarInstitucionSchema,
  type RevocarLicenciasBody,
  revocarLicenciasSchema,
} from './esquemas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapearError(error: unknown): never {
  // Los tres conflictos de CU-23 (A1, A2, A3) responden 409 con su propio detalle.
  if (
    error instanceof UsuarioYaVinculado ||
    error instanceof CuitDuplicado ||
    error instanceof EmailInstitucionalDuplicado
  ) {
    throw new HttpException({ title: 'Conflicto', detail: error.message }, 409);
  }
  // CU-26 A1 (RN-005), CU-26 A3 (RN-010) y CU-27 A2 (RN-002): datos válidos en forma,
  // rechazados por la regla de negocio.
  if (
    error instanceof NivelEducativoInvalido ||
    error instanceof LicenciasInsuficientes ||
    error instanceof CantidadRevocacionInvalida
  ) {
    throw new HttpException({ title: 'Dato inválido', detail: error.message }, 422);
  }
  if (error instanceof DocenteNoVinculado) {
    throw new HttpException({ title: 'Dato inválido', detail: error.message }, 422);
  }
  // CU-25 A2 / A7, CU-26 RN-001 y CU-27 A3: lo que no es visible para el caller se responde
  // como inexistente (404). El 403 se retiró del proyecto.
  if (
    error instanceof InventarioNoVisible ||
    error instanceof ProductoNoEnInventario ||
    error instanceof SinPermisosDeEncargado ||
    error instanceof AsignacionNoEncontrada ||
    error instanceof DocenteNoEncontrado
  ) {
    throw new HttpException({ title: 'No encontrado', detail: error.message }, 404);
  }
  throw error;
}

/** BC Institucional · CU-23 Registrar Institución Educativa, CU-25 Inventario. */
@Controller('instituciones')
export class InstitucionesController {
  constructor(
    private readonly registrar: RegistrarInstitucion,
    private readonly verInventario: VerInventario,
    private readonly asignarLicencias: AsignarLicencias,
    private readonly revocarLicencias: RevocarLicencias,
    private readonly verDocentesAsignados: VerDocentesAsignados,
  ) {}

  @Post()
  @UseGuards(AuthGuard)
  @HttpCode(201)
  async crear(
    @Req() req: RequestAutenticada,
    @Body(new ZodValidationPipe(registrarInstitucionSchema)) body: RegistrarInstitucionInput,
  ): Promise<InstitucionRegistrada> {
    if (req.autenticado === undefined) throw new UnauthorizedException(); // CU-23 A9
    try {
      return await this.registrar.ejecutar({
        nombreLegal: body.nombre_legal,
        identificadorTributario: body.identificador_tributario,
        emailInstitucional: body.email_institucional,
        domicilio: {
          calle: body.domicilio.calle,
          numero: body.domicilio.numero,
          localidad: body.domicilio.localidad,
          provincia: body.domicilio.provincia,
          codigoPostal: body.domicilio.codigo_postal,
        },
        telefono: body.telefono ?? null,
        nivelEducativo: body.nivel_educativo ?? null,
        cantidadAlumnos: body.cantidad_alumnos ?? null,
        encargadoId: req.autenticado.id,
      });
    } catch (error) {
      mapearError(error);
    }
  }

  /** CU-25 · Ver Tenencia de Licencias Institucionales (grilla + resumen, A5/A6). */
  @Get(':institucion_id/inventario')
  @UseGuards(AuthGuard)
  async inventario(
    @Req() req: RequestAutenticada,
    @Param('institucion_id') institucionId: string,
    @Query(new ZodValidationPipe(inventarioQuerySchema)) query: InventarioQuery,
  ): Promise<InventarioInstitucional> {
    if (req.autenticado === undefined) throw new UnauthorizedException(); // CU-25 A4
    // Un id con formato inválido es un recurso inexistente, no un 500.
    if (!UUID_RE.test(institucionId)) {
      throw new HttpException({ title: 'No encontrado', detail: 'Recurso inexistente' }, 404);
    }
    try {
      return await this.verInventario.ejecutar(institucionId, req.autenticado.id, {
        productoId: query.producto_id,
        orden: query.orden,
        direccion: query.direccion,
      });
    } catch (error) {
      mapearError(error);
    }
  }

  /** CU-26 · Asignar licencias de un producto del inventario a docentes de la institución. */
  @Post(':institucion_id/asignaciones')
  @UseGuards(AuthGuard)
  @HttpCode(201)
  async asignar(
    @Req() req: RequestAutenticada,
    @Param('institucion_id') institucionId: string,
    @Body(new ZodValidationPipe(asignarLicenciasSchema)) body: AsignarLicenciasBody,
  ): Promise<LicenciasAsignadas> {
    if (req.autenticado === undefined) throw new UnauthorizedException(); // CU-26 A6
    if (!UUID_RE.test(institucionId)) {
      throw new HttpException({ title: 'No encontrado', detail: 'Recurso inexistente' }, 404);
    }
    try {
      return await this.asignarLicencias.ejecutar({
        institucionId,
        productoId: body.producto_id,
        lineas: body.asignaciones.map((a) => ({ docenteId: a.docente_id, cantidad: a.cantidad })),
        observaciones: body.observaciones ?? null,
        encargadoId: req.autenticado.id,
      });
    } catch (error) {
      mapearError(error);
    }
  }

  /**
   * CU-27 · Revocar licencias a un docente (parcial A9 o total A10).
   * No crea un recurso nuevo —cambia el estado de asignaciones existentes— así que responde
   * 200 con el resultado, no 201.
   */
  @Post(':institucion_id/revocaciones')
  @UseGuards(AuthGuard)
  @HttpCode(200)
  async revocar(
    @Req() req: RequestAutenticada,
    @Param('institucion_id') institucionId: string,
    @Body(new ZodValidationPipe(revocarLicenciasSchema)) body: RevocarLicenciasBody,
  ): Promise<LicenciaRevocada> {
    if (req.autenticado === undefined) throw new UnauthorizedException(); // CU-27 A5
    if (!UUID_RE.test(institucionId)) {
      throw new HttpException({ title: 'No encontrado', detail: 'Recurso inexistente' }, 404);
    }
    try {
      return await this.revocarLicencias.ejecutar({
        institucionId,
        docenteId: body.docente_id,
        productoId: body.producto_id,
        cantidadARevocar: body.cantidad_a_revocar,
        observaciones: body.observaciones ?? null,
        encargadoId: req.autenticado.id,
      });
    } catch (error) {
      mapearError(error);
    }
  }

  /**
   * CU-28 · Listado de docentes vinculados con sus asignaciones (A6/A7/A8: filtro/búsqueda/orden).
   * Ruta bajo `/docentes/asignaciones` (no `/docentes`) porque ese path ya está reservado, en
   * este mismo contrato, para el listado de membresías de CU-23 A12 (sin implementar todavía).
   */
  @Get(':institucion_id/docentes/asignaciones')
  @UseGuards(AuthGuard)
  async docentesAsignados(
    @Req() req: RequestAutenticada,
    @Param('institucion_id') institucionId: string,
    @Query(new ZodValidationPipe(docentesQuerySchema)) query: DocentesQuery,
  ): Promise<ListadoDocentesAsignados> {
    if (req.autenticado === undefined) throw new UnauthorizedException(); // CU-28 A4
    if (!UUID_RE.test(institucionId)) {
      throw new HttpException({ title: 'No encontrado', detail: 'Recurso inexistente' }, 404);
    }
    try {
      return await this.verDocentesAsignados.ejecutar(institucionId, req.autenticado.id, {
        productoId: query.producto_id,
        buscar: query.buscar,
        orden: query.orden,
        direccion: query.direccion,
      });
    } catch (error) {
      mapearError(error);
    }
  }

  /** CU-28 A9 · Detalle de asignaciones de un docente, incluidas las revocadas (RN-007/RN-008). */
  @Get(':institucion_id/docentes/asignaciones/:docente_id')
  @UseGuards(AuthGuard)
  async docenteDetalle(
    @Req() req: RequestAutenticada,
    @Param('institucion_id') institucionId: string,
    @Param('docente_id') docenteId: string,
  ): Promise<DetalleDocenteAsignaciones> {
    if (req.autenticado === undefined) throw new UnauthorizedException();
    if (!UUID_RE.test(institucionId) || !UUID_RE.test(docenteId)) {
      throw new HttpException({ title: 'No encontrado', detail: 'Recurso inexistente' }, 404);
    }
    try {
      return await this.verDocentesAsignados.detalle(institucionId, docenteId, req.autenticado.id);
    } catch (error) {
      mapearError(error);
    }
  }

  /** CU-25 A7 · Detalle de un producto del inventario con historial y asignaciones. */
  @Get(':institucion_id/inventario/:producto_id')
  @UseGuards(AuthGuard)
  async inventarioDetalle(
    @Req() req: RequestAutenticada,
    @Param('institucion_id') institucionId: string,
    @Param('producto_id') productoId: string,
  ): Promise<DetalleProductoInventario> {
    if (req.autenticado === undefined) throw new UnauthorizedException();
    if (!UUID_RE.test(institucionId) || !UUID_RE.test(productoId)) {
      throw new HttpException({ title: 'No encontrado', detail: 'Recurso inexistente' }, 404);
    }
    try {
      return await this.verInventario.detalle(institucionId, productoId, req.autenticado.id);
    } catch (error) {
      mapearError(error);
    }
  }
}
