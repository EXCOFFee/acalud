/** Hashing de contraseñas: argon2id (ADR-004). */
export interface HasherContrasena {
  hash(contrasena: string): Promise<string>;
  verificar(hash: string, contrasena: string): Promise<boolean>;
  /** Hash constante para igualar el tiempo de respuesta cuando la cuenta no existe (CU-002). */
  hashDummy(): Promise<string>;
}
export const HASHER = Symbol('HasherContrasena');

export interface TokenOpaco {
  valor: string; // se envía al cliente / al email
  hash: string; // se persiste (nunca el valor en claro)
}

/** Genera tokens opacos aleatorios y su hash (sesiones y tokens de verificación, ADR-004). */
export interface GeneradorTokenOpaco {
  generar(): TokenOpaco;
  hashDe(valor: string): string;
}
export const GENERADOR_TOKEN = Symbol('GeneradorTokenOpaco');

/** Chequeo de contraseñas filtradas (PA-01 / ASVS 2.1.7). */
export interface VerificadorContrasenaFiltrada {
  esFiltrada(contrasena: string): Promise<boolean>;
}
export const VERIFICADOR_FILTRADA = Symbol('VerificadorContrasenaFiltrada');

/** Reloj inyectable (tests deterministas de ventanas de bloqueo/expiración). */
export interface Reloj {
  ahora(): Date;
}
export const RELOJ = Symbol('Reloj');
