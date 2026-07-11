import type { Reloj } from '../../domain/ports/servicios';

export class RelojSistema implements Reloj {
  ahora(): Date {
    return new Date();
  }
}
