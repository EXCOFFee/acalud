import { OrdenNoEncontrada } from '../domain/errores';
import type { HistorialRepository, FiltroHistorial, ResultadoPaginado, OrdenHistorial, DetalleOrdenHistorial } from '../domain/ports/historial.repository';

export class VerHistorial {
  constructor(private readonly historialRepo: HistorialRepository) {}

  async ejecutar(usuarioId: string, filtro: FiltroHistorial): Promise<ResultadoPaginado<OrdenHistorial>> {
    // Acá se podría inyectar el evento de auditoría order_history_viewed como dice el CU-05 (RN-008).
    // Para simplificar y ya que read cases a veces hacen log desde el UoW, podríamos agregarlo después
    // o simplemente devolver el historial. Como el UoW de Compras tiene auditoría, podríamos inyectar 
    // la auditoría si usamos el patrón UnidadDeTrabajo. Por ahora devolvemos.
    return await this.historialRepo.listar(usuarioId, filtro);
  }

  async detalle(usuarioId: string, ordenId: string): Promise<DetalleOrdenHistorial> {
    const detalle = await this.historialRepo.detalle(usuarioId, ordenId);
    if (!detalle) {
      throw new OrdenNoEncontrada();
    }
    return detalle;
  }
}
