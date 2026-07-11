import { HttpException, type PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

/**
 * Validación de entrada con **Zod en el borde** (CLAUDE.md §Estilo / 2.4 / 5.1). Un fallo
 * responde 422 (regla de negocio, convención 2.4 §4) con el detalle de los campos inválidos.
 */
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const resultado = this.schema.safeParse(value);
    if (!resultado.success) {
      const detalle = resultado.error.issues
        .map((issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
        .join('; ');
      throw new HttpException({ title: 'Entrada inválida', detail: detalle }, 422);
    }
    return resultado.data;
  }
}
