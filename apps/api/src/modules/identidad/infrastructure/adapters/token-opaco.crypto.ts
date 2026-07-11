import { createHash, randomBytes } from 'node:crypto';
import type { GeneradorTokenOpaco, TokenOpaco } from '../../domain/ports/servicios';

/**
 * Token opaco = 32 bytes aleatorios en base64url; se persiste su **SHA-256**, nunca el valor
 * en claro (ADR-004). El SHA-256 basta porque el token ya es aleatorio de alta entropía.
 */
export class GeneradorTokenCrypto implements GeneradorTokenOpaco {
  generar(): TokenOpaco {
    const valor = randomBytes(32).toString('base64url');
    return { valor, hash: this.hashDe(valor) };
  }

  hashDe(valor: string): string {
    return createHash('sha256').update(valor).digest('hex');
  }
}
