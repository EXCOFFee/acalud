import { ErrorDeDominio } from '../../../shared/errors/problem-details';

/** El juego no existe, no está publicado o fue eliminado: no se puede poner en el carrito. → 404. */
export class JuegoNoDisponible extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('El juego no está disponible');
  }
}

/** Compra en contexto institucional: el módulo Institucional (BC7) aún no está. → 422. */
export class ContextoInstitucionalNoDisponible extends ErrorDeDominio {
  readonly clase = 'VALIDATION' as const;
  constructor() {
    super('La compra institucional todavía no está disponible');
  }
}
