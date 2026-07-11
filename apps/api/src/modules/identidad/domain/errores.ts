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
