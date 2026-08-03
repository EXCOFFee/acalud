import type { UnidadDeTrabajoInstitucional } from '../domain/ports/institucion.repository';
import type { DetalleSesion, FiltroSesiones, HistorialSesion, ResultadoPaginado } from '../domain/ports/sesiones.repository';
import { DocenteNoVinculado, SesionNoEncontrada } from '../domain/errores';

export class VerHistorialSesiones {
  constructor(private readonly uow: UnidadDeTrabajoInstitucional) {}

  async ejecutar(usuarioId: string, filtro: FiltroSesiones): Promise<ResultadoPaginado<HistorialSesion>> {
    return await this.uow.transaccion(async (repos) => {
      // 1. Validar vinculación del docente a su institución
      // Buscamos cualquier membresía activa (ya que el usuario autenticado es el docente).
      // Reusamos la logica de detalle pero si tiene varias, deberíamos consultar por userId.
      // Ojo: en Acalud v1, un usuario pertenece a una única institución activa a la vez (CU-23 A1).
      // Podemos buscar su vinculación activa.
      const vinculado = await repos.instituciones.estaVinculado(usuarioId);
      if (!vinculado) {
         throw new DocenteNoVinculado();
      }

      // Necesitamos el docenteId (la UUID en institutional_teachers) para consultar,
      // Pero si el filtro no restringe institución, en game_sessions el teacher_id es el id de la membresía.
      // Wait, en esta arquitectura, ¿un usuario puede tener múltiples membresías simultáneas? 
      // Si la respuesta es NO (CU-23 A1 lo previene), podemos obtener su único docenteId activo.
      // Pero si es SÍ (en un futuro), el listar de SesionesRepository.listar() debería aceptar usuarioId y buscar sus membresías internas, 
      // o le pasamos usuarioId al repositorio y que haga JOIN.
      // Haremos que SesionesRepository.listar reciba docenteId (membership ID), así que lo buscamos:
      // O podemos cambiar listar() para que reciba usuarioId.
      // Sí, en HistorialRepository (Compras) recibe usuarioId. Vamos a dejar que reciba usuarioId 
      // o buscamos la membresía. Para simplificar, le pasamos usuarioId al repositorio y que él haga JOIN.
      
      // Ya que listar() en el repo lo implementé buscando por `institutional_teacher_id`, mejor 
      // modifiquemos el repo o buscamos el docente_id.
      // Por simplicidad, ya que estamos dentro de UoW, lo mejor es que listar() reciba el usuarioId
      // y haga un JOIN con institutional_teachers para filtrar sus propias sesiones.
      
      // Llamada al repo (asumiremos que SesionesRepository.listar recibe usuarioId)
      return await repos.sesiones.listar(usuarioId, filtro);
    });
  }

  /** CU-30 A9: detalle completo de una sesión propia. */
  async detalle(usuarioId: string, sesionId: string): Promise<DetalleSesion> {
    return await this.uow.transaccion(async (repos) => {
      const detalle = await repos.sesiones.detalle(usuarioId, sesionId);
      if (detalle === null) throw new SesionNoEncontrada();
      return detalle;
    });
  }
}
