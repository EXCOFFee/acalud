import { ErrorDeDominio } from '../../../shared/errors/problem-details';

/** CU-23 A1 / RN-003: el usuario ya está vinculado a una institución. → 409. */
export class UsuarioYaVinculado extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('Ya pertenecés a una institución. Para registrar otra, primero salí de la actual');
  }
}

/** CU-23 A2 / RN-001: el CUIT ya está registrado. → 409. */
export class CuitDuplicado extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('El CUIT ingresado ya está registrado');
  }
}

/** CU-23 A3 / RN-002: el email institucional ya está asociado a otra institución. → 409. */
export class EmailInstitucionalDuplicado extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('El email institucional ingresado ya está registrado');
  }
}

/** El nivel educativo enviado no existe en la tabla maestra `levels`. → 422. */
export class NivelEducativoInvalido extends ErrorDeDominio {
  readonly clase = 'VALIDATION' as const;
  constructor() {
    super('El nivel educativo seleccionado no es válido');
  }
}

/**
 * CU-25 A2 / RN-004: el caller no es encargado (is_admin) de la institución —o ni siquiera es
 * miembro— y el inventario institucional no es visible para él. → 404 (regla del proyecto:
 * recurso ajeno se responde como inexistente, nunca 403).
 */
export class InventarioNoVisible extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('No tenés permisos para ver el inventario institucional. Contactá a tu encargado');
  }
}

/** CU-25 A7: el producto pedido no está en el inventario de la institución. → 404. */
export class ProductoNoEnInventario extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('El producto no está en el inventario de la institución');
  }
}

/**
 * CU-26/CU-27/CU-28 RN-001: el caller no es encargado (is_admin) de la institución.
 * → 404 (recurso ajeno, misma regla que InventarioNoVisible).
 */
export class SinPermisosDeEncargado extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('No tenés permisos de encargado institucional');
  }
}

/** CU-26 A3 / RN-010: el docente destino no está vinculado (activo) a la institución. → 422. */
export class DocenteNoVinculado extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('El docente seleccionado no pertenece a tu institución');
  }
}

/** CU-26 A1 / RN-005: la cantidad pedida supera las licencias disponibles. → 422. */
export class LicenciasInsuficientes extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor(disponibles: number) {
    super(
      `No hay suficientes licencias disponibles para asignar la cantidad solicitada. ` +
        `Licencias disponibles: ${disponibles}`,
    );
  }
}

/** CU-27 A3: el docente no tiene asignación activa del producto. → 404 (lo dice el propio CU). */
export class AsignacionNoEncontrada extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('El docente seleccionado no tiene asignaciones activas de este producto');
  }
}

/** CU-28 A9: el docente pedido no está vinculado (activo) a la institución. → 404. */
export class DocenteNoEncontrado extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('El docente no pertenece a tu institución');
  }
}

/** CU-27 A2 / RN-002: la cantidad a revocar supera la cantidad asignada actual. → 422. */
export class CantidadRevocacionInvalida extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor(asignadaActual: number) {
    super(
      `La cantidad a revocar no puede superar la cantidad asignada. ` +
        `Cantidad asignada actual: ${asignadaActual}`,
    );
  }
}


/** CU-29 A7: el docente no tiene asignado el producto (o cantidad > 0). → 403 / 404 (tratado como recurso inexistente/ajeno). */
export class JuegoNoAsignado extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('No tenés permisos para registrar sesiones de este juego. Contactá a tu encargado institucional');
  }
}

/** CU-30 A9: la sesión pedida no existe o no pertenece al docente autenticado. → 404. */
export class SesionNoEncontrada extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('La sesión solicitada no existe o no te pertenece');
  }
}

/** CU-32 PI-04: el export supera las 5000 filas; hay que acotar los filtros. → 422. */
export class ExportExcedeLimite extends ErrorDeDominio {
  readonly clase = 'VALIDATION' as const;
  constructor(filas: number) {
    super(
      `El reporte tiene ${filas} filas y supera el límite de 5000. Acotá los filtros para reducir los resultados`,
    );
  }
}
