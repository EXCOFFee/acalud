import { RecursoNoAutorizado, RecursoNoEncontrado } from '../domain/errores';
import type { DescargasRepository } from '../domain/ports/descargas.repository';
import type { RecursosAutorizacionPort } from '../domain/ports/recursos-autorizacion.port';
import type { RecursosRepository } from '../domain/ports/recursos.repository';
import type { StorageProvider } from '../../../platform/storage/storage-provider.port';
import { UnauthorizedException } from '@nestjs/common';

export class DescargarRecurso {
  constructor(
    private readonly recursosRepo: RecursosRepository,
    private readonly descargasRepo: DescargasRepository,
    private readonly autorizacionPort: RecursosAutorizacionPort,
    private readonly storageProvider: StorageProvider
  ) {}

  async ejecutar(recursoId: string, usuarioId: string | null): Promise<{ url_firmada: string; expira_en?: string }> {
    // 1. Obtener recurso
    const recurso = await this.recursosRepo.obtener(recursoId);
    if (!recurso) {
      throw new RecursoNoEncontrado();
    }

    // 2. Verificar autorización (CU-08 y CU-09)
    if (recurso.isLicensed) {
      if (!usuarioId) {
        // CU-09 RN-001: Requiere autenticación
        throw new UnauthorizedException('Debe iniciar sesión para descargar este recurso licenciado');
      }

      const tieneDerecho = await this.autorizacionPort.tieneDerechoAlJuego(usuarioId, recurso.productoId);
      if (!tieneDerecho) {
        throw new RecursoNoAutorizado();
      }
    }

    // 3. Generar enlace
    let urlFinal = recurso.url || '';
    let expiraEn: Date | undefined;

    if (recurso.type === 'link') {
      // Si es un enlace externo, se devuelve directamente
      urlFinal = recurso.url || '';
    } else if (recurso.type === 'pdf') {
      // CU-08 RN-003: Descarga directa firmada
      const expiracionSegundos = 300; // 5 minutos (CU-09 RN-004)
      urlFinal = await this.storageProvider.generarUrlFirmada('recursos', recurso.url || '', expiracionSegundos);
      expiraEn = new Date(Date.now() + expiracionSegundos * 1000);
    }

    // 4. Registrar descarga (auditoría en 'downloads' y evento 'audit_log')
    await this.descargasRepo.registrarDescarga(recurso.id, usuarioId);

    // 5. Incremento de métrica (CU-08 RN-006)
    await this.recursosRepo.incrementarDescargas(recurso.id);

    const result: { url_firmada: string; expira_en?: string } = { url_firmada: urlFinal };
    if (expiraEn) {
      result.expira_en = expiraEn.toISOString();
    }
    return result;
  }
}
