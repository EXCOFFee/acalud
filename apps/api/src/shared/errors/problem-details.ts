/**
 * RFC 9457 — Problem Details for HTTP APIs (convención 2.4 §4).
 * Toda respuesta no-2xx de la API usa este formato, con `trace_id`.
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  trace_id?: string;
}

/**
 * Clases de error de dominio (ADR-002 §Modelo de errores).
 * La capa de infraestructura las traduce a ProblemDetails con el status HTTP correcto.
 */
export type ClaseError = 'VALIDATION' | 'BUSINESS_RULE' | 'INVARIANT';

/**
 * Jerarquía base de excepciones de dominio. `retryable` distingue fallas transient de
 * permanentes (política de retry de ADR-006). El dominio lanza estas excepciones; nunca
 * conoce HTTP ni el ORM.
 */
export abstract class ErrorDeDominio extends Error {
  abstract readonly clase: ClaseError;
  readonly retryable: boolean = false;

  protected constructor(mensaje: string) {
    super(mensaje);
    this.name = new.target.name;
  }
}
