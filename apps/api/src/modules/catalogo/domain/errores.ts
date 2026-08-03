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

/** CU-19 A1/A2: el producto administrado no existe. → 404. */
export class ProductoAdminNoEncontrado extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('Producto no encontrado');
  }
}

/** CU-19 p6: la categoría elegida no existe en `categories`. → 422. */
export class CategoriaInvalida extends ErrorDeDominio {
  readonly clase = 'VALIDATION' as const;
  constructor() {
    super('La categoría seleccionada no existe');
  }
}

/** CU-19 A7: la categoría administrada no existe. → 404. */
export class CategoriaAdminNoEncontrada extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('Categoría no encontrada');
  }
}

/** CU-19 A7.5: ya existe una categoría con ese nombre. → 409. */
export class NombreCategoriaDuplicado extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('Ya existe una categoría con ese nombre');
  }
}

/** CU-19 A9: el recurso administrado no existe. → 404. */
export class RecursoAdminNoEncontrado extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('Recurso no encontrado');
  }
}

/** CU-19 A9.4: el producto relacionado (si se indica) no existe. → 422. */
export class ProductoRelacionadoInvalido extends ErrorDeDominio {
  readonly clase = 'VALIDATION' as const;
  constructor() {
    super('El producto relacionado seleccionado no existe');
  }
}

/** CU-17 A3: la editorial no existe o no está activa (recurso ajeno = 404). → 404. */
export class EditorialNoEncontrada extends ErrorDeDominio {
  readonly clase = 'BUSINESS_RULE' as const;
  constructor() {
    super('La editorial que buscás no está disponible');
  }
}
