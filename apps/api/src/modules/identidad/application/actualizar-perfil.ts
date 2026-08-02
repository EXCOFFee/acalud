import type { PerfilCuenta } from '../domain/cuenta';
import type { UnidadDeTrabajo } from '../domain/ports/unidad-de-trabajo';

export interface ActualizarPerfilInput {
  id: string;
  nombre: string;
  apellido: string;
  nivelEducativo?: string | null;
  materia?: string | null;
  institucion?: string | null;
}

export class ActualizarPerfil {
  constructor(private readonly uow: UnidadDeTrabajo) {}

  async ejecutar(input: ActualizarPerfilInput): Promise<PerfilCuenta> {
    const nombre = input.nombre.trim();
    const apellido = input.apellido.trim();
    if (!nombre || !apellido) {
      throw new Error('El nombre y el apellido son obligatorios');
    }

    return this.uow.transaccion(async (repos) => {
      await repos.cuentas.actualizarPerfil(input.id, {
        nombre,
        apellido,
        nivelEducativo: input.nivelEducativo?.trim() || null,
        materia: input.materia?.trim() || null,
        institucion: input.institucion?.trim() || null,
      });

      await repos.auditoria.registrar({
        tipo: 'PerfilActualizado',
        sujetoTipo: 'cuenta',
        sujetoId: input.id,
        actorId: input.id,
        datos: {
          nombre,
          apellido,
          nivelEducativo: input.nivelEducativo?.trim() || null,
          materia: input.materia?.trim() || null,
          institucion: input.institucion?.trim() || null,
        },
      });

      const perfilPersistido = await repos.cuentas.buscarPerfil(input.id);
      const cuenta = await repos.cuentas.buscarPorId(input.id);
      if (!cuenta) throw new Error('Cuenta no encontrada');

      return {
        ...cuenta.aPerfil(),
        nivel_educativo: perfilPersistido?.nivelEducativo ?? null,
        materia: perfilPersistido?.materia ?? null,
        institucion: perfilPersistido?.institucion ?? null,
      };
    });
  }
}
