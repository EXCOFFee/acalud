import { Body, Controller, HttpException, Param, Put, Req, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../../../../platform/auth/admin.guard';
import { AuthGuard } from '../../../../platform/auth/auth.guard';
import type { RequestAutenticada } from '../../../../platform/auth/autenticado';
import { ZodValidationPipe } from '../../../../platform/http/zod-validation.pipe';
import { AsignarDemo } from '../../application/asignar-demo';
import { ProductoAdminNoEncontrado } from '../../domain/errores';
import { type AsignarDemoBody, asignarDemoSchema } from './admin-demos.esquemas';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** CU-19 A8 · Asignación de demo a producto (RN-001: solo `role = admin`). */
@Controller('admin/products/:product_id/demo')
@UseGuards(AuthGuard, AdminGuard)
export class AdminDemosController {
  constructor(private readonly asignarDemo: AsignarDemo) {}

  @Put()
  async asignar(
    @Param('product_id') productId: string,
    @Req() req: RequestAutenticada,
    @Body(new ZodValidationPipe(asignarDemoSchema)) body: AsignarDemoBody,
  ) {
    try {
      if (!UUID_RE.test(productId)) throw new ProductoAdminNoEncontrado();

      // A8.4: la URL de Unity WebGL no tiene columna propia; se guarda como una clave más del JSON.
      const configJson = {
        ...body.configuracion_json,
        ...(body.url_unity_webgl ? { unity_webgl_url: body.url_unity_webgl } : {}),
      };

      const demo = await this.asignarDemo.ejecutar({ productId, configJson, adminId: req.autenticado!.id });
      return { id: demo.id, producto_id: demo.productId, configuracion_json: demo.configJson };
    } catch (error) {
      if (error instanceof ProductoAdminNoEncontrado) {
        throw new HttpException({ title: 'No encontrado', detail: error.message }, 404);
      }
      throw error;
    }
  }
}
