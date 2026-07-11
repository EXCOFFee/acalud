import type { VerificadorContrasenaFiltrada } from '../../domain/ports/servicios';

/**
 * Verificador de contraseñas filtradas contra una lista local embebida (PA-01 / ASVS 2.1.7).
 * Determinista y sin red — apto para Testcontainers. En hardening se puede sumar la API de
 * Pwned Passwords (k-anonimato) detrás de este mismo puerto, sin tocar el dominio.
 */
const FILTRADAS = new Set<string>([
  '123456789012',
  '1234567890123',
  '123456789012345',
  'contrasena123',
  'password12345',
  'qwertyuiop12',
  'administrador',
  'aaaaaaaaaaaa',
  '111111111111',
]);

export class VerificadorFiltradaListaLocal implements VerificadorContrasenaFiltrada {
  async esFiltrada(contrasena: string): Promise<boolean> {
    return FILTRADAS.has(contrasena.toLowerCase());
  }
}
