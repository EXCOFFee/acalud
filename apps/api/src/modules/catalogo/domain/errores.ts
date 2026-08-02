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

/** El recurso solicitado no existe (CU-08, CU-09). → 404. */
export class RecursoNoEncontrado extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('Recurso no encontrado');
  }
}

/** El usuario no tiene permisos sobre el recurso licenciado (CU-09). → 403. */
export class RecursoNoAutorizado extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('No tiene permisos para descargar este recurso');
  }
}
