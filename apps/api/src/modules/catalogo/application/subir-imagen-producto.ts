import { randomUUID } from 'node:crypto';
import { ArchivoInvalido } from '../domain/errores';
import type { StorageProvider } from '../../../platform/storage/storage-provider.port';

const BUCKET = 'productos';
const TAMANIO_MAXIMO_BYTES = 5 * 1024 * 1024;
const EXTENSION_POR_TIPO: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export interface ImagenSubida {
  imagen_url: string;
}

/**
 * CU-19 ("Imagen del producto: subida de archivo"): sube al bucket público `productos` y
 * devuelve la URL pública lista para guardar en `products.image_url`.
 */
export class SubirImagenProducto {
  constructor(private readonly storage: StorageProvider) {}

  async ejecutar(contenido: Buffer, mimetype: string, tamanio: number): Promise<ImagenSubida> {
    const extension = EXTENSION_POR_TIPO[mimetype];
    if (!extension) {
      throw new ArchivoInvalido('La imagen debe ser PNG, JPEG o WEBP');
    }
    if (tamanio > TAMANIO_MAXIMO_BYTES) {
      throw new ArchivoInvalido('La imagen no puede superar los 5 MB');
    }

    const path = `${randomUUID()}.${extension}`;
    const { urlPublica } = await this.storage.subirArchivo(BUCKET, path, contenido, mimetype);
    if (!urlPublica) {
      throw new Error('El bucket de productos no devolvió una URL pública');
    }
    return { imagen_url: urlPublica };
  }
}
