export const DEMOS_REPOSITORY = Symbol('DEMOS_REPOSITORY');

export interface ContenidoDemo {
  juegoId: string;
  demoId: string;
  tipo: 'publica' | 'completa';
  formato: 'html5' | 'pdf' | 'video';
  urlEmbebido: string;
}

export interface DemosRepository {
  /**
   * Obtiene la información necesaria para embeber una demo.
   * Lanza JuegoNoEncontrado o equivalente si la demo no existe.
   */
  obtenerDemo(juegoId: string, tipo: 'publica' | 'completa'): Promise<ContenidoDemo>;

  /**
   * Registra el evento de que un docente probó una demo completa.
   * F6 indica usar la tabla `game_progress`.
   */
  registrarPrueba(docenteId: string, juegoId: string, demoId: string): Promise<void>;
}
