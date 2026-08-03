import type { DatosPropuesta, Propuesta, PropuestaResumen } from '../propuesta';

export interface AdminDestino {
  id: string;
  email: string;
  nombre: string;
}

/** Puerto de propuestas (CU-15 por ahora; CU-21 sumará las operaciones de revisión admin). */
export interface PropuestasRepository {
  existeMateria(subjectId: string): Promise<boolean>;
  existeNivel(nivelId: string): Promise<boolean>;
  /** D-51: heurística — mismo usuario + mismo título (case-insensitive) en las últimas 24 h. */
  existeDuplicadaReciente(userId: string, title: string): Promise<boolean>;
  crear(userId: string, datos: DatosPropuesta): Promise<Propuesta>;
  /** CU-15 p2 / RN-004: las propuestas del propio usuario, más recientes primero. */
  listarPropias(userId: string): Promise<PropuestaResumen[]>;
  /** CU-15 RN-005: "el equipo editorial" son todos los usuarios con role = admin. */
  listarAdministradores(): Promise<AdminDestino[]>;
}
