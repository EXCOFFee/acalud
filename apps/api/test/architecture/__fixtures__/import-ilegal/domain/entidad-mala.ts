// Fixture de PRUEBA con una VIOLACIÓN DELIBERADA: una entidad de dominio que importa
// infraestructura. dependency-cruiser debe marcarlo como error (regla `no-domain-a-infra`).
// No es código real: vive bajo __fixtures__ y está excluido de build/typecheck/lint.
import { valorDeInfra } from '../infrastructure/repositorio-sucio';

export const entidadMala = valorDeInfra;
