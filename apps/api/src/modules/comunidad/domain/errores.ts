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

/** CU-16 A2: la encuesta no existe o está en `draft` (no publicada, no visible). → 404. */
export class EncuestaNoEncontrada extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('La encuesta que buscás no está disponible');
  }
}

/** CU-14 A1: el usuario ya participó en esta encuesta (UNIQUE poll_id+user_id). → 409. */
export class EncuestaYaVotada extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('Ya has votado en esta encuesta');
  }
}

/** La opción enviada no pertenece a esta encuesta. → 422. */
export class OpcionInvalida extends ErrorDeDominio {
  readonly clase = 'VALIDATION' as const;
  constructor() {
    super('La opción seleccionada no pertenece a esta encuesta');
  }
}

/** CU-15 p9 / A8: la materia seleccionada (si se indica) no existe en `subjects`. → 422. */
export class MateriaInvalida extends ErrorDeDominio {
  readonly clase = 'VALIDATION' as const;
  constructor() {
    super('La materia seleccionada no es válida');
  }
}

/**
 * CU-15 A3 / RN-006: mismo usuario + mismo título dentro de las últimas 24 h (D-51: heurística
 * simple, el CU no precisa algoritmo de similitud ni ventana temporal). → 409.
 */
export class PropuestaDuplicada extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('Ya enviaste una propuesta similar recientemente. Revisá tus propuestas enviadas');
  }
}

