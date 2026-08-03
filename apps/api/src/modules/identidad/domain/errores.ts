import { ErrorDeDominio } from '../../../shared/errors/problem-details';

/** La contraseña figura en listas de contraseñas comprometidas (PA-01 / ASVS 2.1.7). → 422 */
export class ContrasenaFiltrada extends ErrorDeDominio {
  readonly clase = 'VALIDATION' as const;
  constructor() {
    super('La contraseña figura en listas de contraseñas comprometidas');
  }
}

/** Email o contraseña incorrectos (mensaje único anti-enumeración, CU-002 E1). → 401 */
export class CredencialesInvalidas extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('Email o contraseña incorrectos');
  }
}

/** Cuenta bloqueada temporalmente por fuerza bruta (PA-02 E2). → 423 */
export class CuentaBloqueada extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('Cuenta temporalmente bloqueada');
  }
}

/** Token de verificación/recuperación inexistente, vencido o ya usado (CU-E02 E1). → 410 */
export class TokenInvalido extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('Enlace inválido o vencido');
  }
}

/** La contraseña vigente ingresada no coincide (CU-34 A1, RN-006). → 401 */
export class ContrasenaIncorrecta extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('Contraseña incorrecta');
  }
}

/** El nuevo correo ya está registrado en otra cuenta (CU-34 A2, RN-005/RN-011). No revela la
 *  existencia de la otra cuenta: el mensaje es genérico. → 422 */
export class EmailYaRegistrado extends ErrorDeDominio {
  readonly clase = 'VALIDATION' as const;
  constructor() {
    super('El correo electrónico ingresado no está disponible');
  }
}

/** El nuevo correo es idéntico al actual (CU-34 A3). → 422 */
export class EmailIgualAlActual extends ErrorDeDominio {
  readonly clase = 'VALIDATION' as const;
  constructor() {
    super('El nuevo correo debe ser diferente al correo actual');
  }
}
