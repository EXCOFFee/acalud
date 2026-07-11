import { hash as argonHash, verify as argonVerify } from '@node-rs/argon2';
import type { HasherContrasena } from '../../domain/ports/servicios';

/** Hashing con **argon2id** (ADR-004), parámetros por defecto de la librería. */
export class Argon2Hasher implements HasherContrasena {
  private dummy: string | null = null;

  async hash(contrasena: string): Promise<string> {
    return argonHash(contrasena);
  }

  async verificar(hash: string, contrasena: string): Promise<boolean> {
    try {
      return await argonVerify(hash, contrasena);
    } catch {
      return false; // hash malformado → credencial inválida, no error 500
    }
  }

  async hashDummy(): Promise<string> {
    this.dummy ??= await argonHash('cuenta-inexistente-timing-dummy');
    return this.dummy;
  }
}
