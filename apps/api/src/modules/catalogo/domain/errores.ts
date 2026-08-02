import { ErrorDeDominio } from '../../../shared/errors/problem-details';

/** El juego no existe, no está publicado o fue eliminado (CU-006). → 404 (recurso ajeno = 404). */
export class JuegoNoEncontrado extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('Juego no encontrado');
  }
}

/** La demo solicitada (pública o completa) no existe para el juego (CU-006, CU-007). → 404. */
export class DemoNoEncontrada extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('Demo no encontrada para el juego solicitado');
  }
}
