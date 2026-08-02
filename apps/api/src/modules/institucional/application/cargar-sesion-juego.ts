import { JuegoNoAsignado } from '../domain/errores';
import type { UnidadDeTrabajoInstitucional } from '../domain/ports/institucion.repository';
import { SesionJuego } from '../domain/sesion-juego';

export interface CargarSesionJuegoInput {
  productoId: string;
  fechaUso: Date;
  grupo: string;
  estudiantes: number;
  duracionMinutos: number;
  satisfaccionDocente: number;
  aprendizajesClave: string;
  dificultades: string | null;
  reutilizaria: boolean;
}

export class CargarSesionJuego {
  constructor(private readonly uow: UnidadDeTrabajoInstitucional) {}

  async ejecutar(usuarioId: string, input: CargarSesionJuegoInput): Promise<{ sessionId: string }> {
    return await this.uow.transaccion(async (repos) => {
      // 1. Validar vinculación del docente a su institución y si tiene stock/asignación
      const membresia = await repos.docentes.buscarMembresiaConJuegoAsignado(usuarioId, input.productoId);
      
      // Si no hay membresía con ese juego, lanzamos JuegoNoAsignado que abarca ambos casos (no vinculado a ninguna inst o sin juego).
      // Si es estricto, podríamos distinguir, pero CU-29 A7 dice "El docente no tiene asignado el producto -> JuegoNoAsignado".
      if (!membresia) {
        throw new JuegoNoAsignado();
      }

      // 3. Crear el comando a partir de la máquina de estados de SesionJuego (ADR-002)
      const comando = SesionJuego.crear(
        {
          productoId: input.productoId,
          fecha: input.fechaUso,
          grupo: input.grupo,
          estudiantes: input.estudiantes,
          duracion: input.duracionMinutos,
          satisfaccion: input.satisfaccionDocente,
          aprendizajes: input.aprendizajesClave,
          dificultades: input.dificultades,
          reutilizaria: input.reutilizaria,
        },
        membresia.institucionId,
        membresia.docenteId
      );

      // 4. Persistir a través del repositorio ejecutando el comando de transición
      const sessionId = await repos.sesiones.ejecutarComando(comando);

      // 5. Auditoría (Etapa 0 - luego pasará a outbox/eventbus)
      await repos.auditoria.registrar({
        tipo: 'game_session_registered',
        sujetoId: sessionId,
        sujetoTipo: 'session',
        actorId: usuarioId,
        datos: {
          product_id: input.productoId,
          teacher_id: membresia.docenteId,
          institution_id: membresia.institucionId,
          student_count: input.estudiantes,
          teacher_satisfaction: input.satisfaccionDocente,
          timestamp: new Date().toISOString()
        }
      });

      return { sessionId };
    });
  }
}
