/** CU-29 Cargar Sesiones de Juego / ADR-002 Máquina de Estados */

export type EstadoSesion = 'completada' | 'borrador';

export interface ComandoGuardarSesion {
  tipo: 'insert';
  estado: EstadoSesion;
  datos: {
    institucionId: string;
    docenteId: string;
    productoId: string;
    fecha: Date;
    grupo: string;
    estudiantes: number;
    duracion: number;
    satisfaccion: number;
    aprendizajes: string;
    dificultades: string | null;
    reutilizaria: boolean;
  };
}

/**
 * Entidad de dominio SesionJuego.
 * Solo puede ser mutada a través de comandos que garanticen su integridad de estado.
 */
export class SesionJuego {
  /** 
   * Transición de estado: Inicial → completada.
   * Emite el comando para ser persistido, garantizando el respeto de los guards.
   */
  static crear(
    datos: Omit<ComandoGuardarSesion['datos'], 'institucionId' | 'docenteId'>, 
    institucionId: string, 
    docenteId: string
  ): ComandoGuardarSesion {
    return {
      tipo: 'insert',
      estado: 'completada', // Se genera transición a estado válido inicial
      datos: { ...datos, institucionId, docenteId }
    };
  }
}
