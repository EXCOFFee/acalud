import { randomUUID } from 'node:crypto';
import { ArchivoInvalido } from '../domain/errores';
import type { StorageProvider } from '../../../platform/storage/storage-provider.port';

const BUCKET = 'recursos';
const TAMANIO_MAXIMO_BYTES = 20 * 1024 * 1024;
const TIPO_PERMITIDO = 'application/pdf';

export interface PdfSubido {
  /** Path interno del bucket — `descargar-recurso.ts` ya trata `resources.url` como esto. */
  url: string;
}

/** CU-19 A9 (recursos tipo pdf): sube al bucket privado `recursos`, no una URL pegada a mano. */
export class SubirPdfRecurso {
  constructor(private readonly storage: StorageProvider) {}

  async ejecutar(contenido: Buffer, mimetype: string, tamanio: number): Promise<PdfSubido> {
    if (mimetype !== TIPO_PERMITIDO) {
      throw new ArchivoInvalido('El archivo debe ser un PDF');
    }
    if (tamanio > TAMANIO_MAXIMO_BYTES) {
      throw new ArchivoInvalido('El PDF no puede superar los 20 MB');
    }

    const path = `pdfs/${randomUUID()}.pdf`;
    const { path: pathGuardado } = await this.storage.subirArchivo(BUCKET, path, contenido, mimetype);
    return { url: pathGuardado };
  }
}
