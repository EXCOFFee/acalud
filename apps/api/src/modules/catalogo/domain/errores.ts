import { ErrorDeDominio } from '../../../shared/errors/problem-details';

/** El juego no existe, no está publicado o fue eliminado (CU-006). → 404 (recurso ajeno = 404). */
export class JuegoNoEncontrado extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('Juego no encontrado');
  }
}
