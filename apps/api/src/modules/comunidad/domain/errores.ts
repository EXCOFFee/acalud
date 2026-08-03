import { ErrorDeDominio } from '../../../shared/errors/problem-details';

/** CU-20 A2/A3/A1: la encuesta administrada no existe. → 404. */
export class EncuestaAdminNoEncontrada extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('Encuesta no encontrada');
  }
}

/** CU-20 A2.2/A2.3 / RN-005: las encuestas activas no pueden editarse. → 409. */
export class EncuestaActivaNoEditable extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('Las encuestas activas no pueden editarse. Desactivá la encuesta primero');
  }
}

/** CU-20 p9 / RN-008: el nivel educativo objetivo (si se indica) no existe en `levels`. → 422. */
export class NivelEducativoInvalido extends ErrorDeDominio {
  readonly clase = 'VALIDATION' as const;
  constructor() {
    super('El nivel educativo seleccionado no es válido');
  }
}
