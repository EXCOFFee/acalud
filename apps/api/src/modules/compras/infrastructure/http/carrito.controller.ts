import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpException,
  Param,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../../../../platform/auth/auth.guard';
import type { RequestAutenticada } from '../../../../platform/auth/autenticado';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { PonerLinea } from '../../application/poner-linea';
import { QuitarLinea } from '../../application/quitar-linea';
import { VerCarrito } from '../../application/ver-carrito';
import type { CarritoView } from '../../domain/carrito';
import { ContextoInstitucionalNoDisponible, JuegoNoDisponible } from '../../domain/errores';
import {
  type CantidadInput,
  cantidadSchema,
  type ContextoQuery,
  contextoQuerySchema,
} from './esquemas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapearError(error: unknown): never {
  if (error instanceof JuegoNoDisponible) {
    throw new HttpException({ title: 'No disponible', detail: error.message }, 404);
  }
  if (error instanceof ContextoInstitucionalNoDisponible) {
    throw new HttpException({ title: 'No disponible aún', detail: error.message }, 422);
  }
  throw error;
}

/** BC Compras · Carrito (CU-010). Requiere sesión; el carrito es por (cuenta, contexto). */
@Controller('carrito')
@UseGuards(AuthGuard)
export class CarritoController {
  constructor(
    private readonly ver: VerCarrito,
    private readonly poner: PonerLinea,
    private readonly quitar: QuitarLinea,
  ) {}

  @Get()
  async verCarrito(
    @Req() req: RequestAutenticada,
    @Query(new ZodValidationPipe(contextoQuerySchema)) query: ContextoQuery,
  ): Promise<CarritoView> {
    try {
      return await this.ver.ejecutar(this.cuentaId(req), this.contexto(query));
    } catch (error) {
      mapearError(error);
    }
  }

  @Put('lineas/:juego_id')
  @HttpCode(200)
  async ponerLinea(
    @Req() req: RequestAutenticada,
    @Param('juego_id') juegoId: string,
    @Body(new ZodValidationPipe(cantidadSchema)) body: CantidadInput,
    @Query(new ZodValidationPipe(contextoQuerySchema)) query: ContextoQuery,
  ): Promise<CarritoView> {
    try {
      if (!UUID_RE.test(juegoId)) throw new JuegoNoDisponible();
      return await this.poner.ejecutar(
        this.cuentaId(req),
        this.contexto(query),
        juegoId,
        body.cantidad,
      );
    } catch (error) {
      mapearError(error);
    }
  }

  @Delete('lineas/:juego_id')
  @HttpCode(200)
  async quitarLinea(
    @Req() req: RequestAutenticada,
    @Param('juego_id') juegoId: string,
    @Query(new ZodValidationPipe(contextoQuerySchema)) query: ContextoQuery,
  ): Promise<CarritoView> {
    try {
      return await this.quitar.ejecutar(this.cuentaId(req), this.contexto(query), juegoId);
    } catch (error) {
      mapearError(error);
    }
  }

  private cuentaId(req: RequestAutenticada): string {
    if (req.autenticado === undefined) throw new UnauthorizedException();
    return req.autenticado.id;
  }

  /** Etapa 1: solo carrito personal. El contexto institucional (BC7) llega en Etapa 2. */
  private contexto(query: ContextoQuery): string | null {
    if (query.contexto !== undefined) throw new ContextoInstitucionalNoDisponible();
    return null;
  }
}
