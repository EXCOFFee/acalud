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

/** El carrito está vacío o alguna línea no está disponible (stock/publicación). → 422 (CU-012). */
export class CarritoNoCheckouteable extends ErrorDeDominio {
  readonly clase = 'VALIDATION' as const;
  constructor(mensaje = 'El carrito está vacío o tiene líneas sin stock') {
    super(mensaje);
  }
}

/** Cuenta no verificada intentando checkout (PA-06). → 403. */
export class CuentaNoVerificada extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('Verificá tu cuenta para poder comprar');
  }
}

/** Ya hay un pedido pendiente_pago para este carrito (idempotencia por pedido). → 409 (CU-012). */
export class PedidoPendienteExistente extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('Ya tenés un pago en curso para este carrito');
  }
}

/** El adaptador de pago no está disponible (sin fallback por diseño, ADR-006). → 503. */
export class PagoIndisponible extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  readonly retryable = true;
  constructor() {
    super('El medio de pago no está disponible en este momento');
  }
}

/** Señal interna (CU-012 E2): alguna línea no tenía stock al aprobar → rollback total. */
export class StockInsuficiente extends ErrorDeDominio {
  readonly clase = 'INVARIANT' as const;
  constructor() {
    super('Stock insuficiente al aprobar el pago');
  }
}
