import type { PerfilCuenta } from '../domain/cuenta';
import { MateriaInvalida, NivelEducativoInvalido } from '../domain/errores';
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

    const nivelEducativo = input.nivelEducativo?.trim() || null;
    const materia = input.materia?.trim() || null;

    return this.uow.transaccion(async (repos) => {
      // CU-04: nivel y materia se resuelven por nombre contra los catálogos. Un nombre que no
      // existe se rechaza: antes el UPDATE lo convertía en null y el dato se perdía en silencio.
      if (nivelEducativo !== null && !(await repos.cuentas.existeNivel(nivelEducativo))) {
        throw new NivelEducativoInvalido();
      }
      if (materia !== null && !(await repos.cuentas.existeMateria(materia))) {
        throw new MateriaInvalida();
      }

      await repos.cuentas.actualizarPerfil(input.id, {
        nombre,
        apellido,
        nivelEducativo,
        materia,
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
          nivelEducativo,
          materia,
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
