import {
  EncuestaAdminNoEncontrada,
  EncuestaFinalizada,
  EncuestaNoFinalizable,
} from '../domain/errores';
import type { UnidadDeTrabajoComunidadAdmin } from '../domain/ports/comunidad-admin.uow';
import type { EncuestaAdmin } from '../domain/encuesta-admin';

/**
 * CU-20 A11 (propuesto) · Finalizar encuesta — decisiones D2/D3 aceptadas el 2026-11-16.
 * active → closed, con fecha de cierre. Es definitivo: una finalizada no se reabre ni se edita,
 * y sigue visible en público con sus resultados (CU-16 "Finalizada").
 */
export class FinalizarEncuesta {
  constructor(private readonly uow: UnidadDeTrabajoComunidadAdmin) {}

  async ejecutar(id: string, adminId: string): Promise<EncuestaAdmin> {
    return this.uow.transaccion(async (repos) => {
      const actual = await repos.encuestas.obtener(id);
      if (actual === null) throw new EncuestaAdminNoEncontrada();
      if (actual.status === 'closed') throw new EncuestaFinalizada();
      if (actual.status !== 'active') throw new EncuestaNoFinalizable();

      // null = otro admin la cambió entre la lectura y el UPDATE (el guard de estado lo detecta).
      const encuesta = await repos.encuestas.finalizar(id);
      if (encuesta === null) throw new EncuestaNoFinalizable();

      await repos.auditoria.registrar({
        tipo: 'close',
        sujetoTipo: 'poll',
        sujetoId: encuesta.id,
        actorId: adminId,
      });

      return encuesta;
    });
  }
}
