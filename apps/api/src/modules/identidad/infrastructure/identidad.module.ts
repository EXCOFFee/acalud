import { Module } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../platform/db/pg.module';
import { CerrarSesion } from '../application/cerrar-sesion';
import { IniciarSesion } from '../application/iniciar-sesion';
import { RegistrarDocente } from '../application/registrar-docente';
import { RestablecerContrasena } from '../application/restablecer-contrasena';
import { SolicitarRecuperacion } from '../application/solicitar-recuperacion';
import { VerificarEmail } from '../application/verificar-email';
import { CUENTA_REPOSITORY, type CuentaRepository } from '../domain/ports/cuenta.repository';
import { SESION_REPOSITORY, type SesionRepository } from '../domain/ports/sesion.repository';
import {
  GENERADOR_TOKEN,
  type GeneradorTokenOpaco,
  HASHER,
  type HasherContrasena,
  RELOJ,
  type Reloj,
  VERIFICADOR_FILTRADA,
  type VerificadorContrasenaFiltrada,
} from '../domain/ports/servicios';
import { UNIDAD_DE_TRABAJO, type UnidadDeTrabajo } from '../domain/ports/unidad-de-trabajo';
import { Argon2Hasher } from './adapters/argon2.hasher';
import { VerificadorFiltradaListaLocal } from './adapters/contrasena-filtrada.lista-local';
import { RelojSistema } from './adapters/reloj.sistema';
import { GeneradorTokenCrypto } from './adapters/token-opaco.crypto';
import { CuentaRepositoryPg } from './persistencia/cuenta.repository.pg';
import { AuthController } from './http/auth.controller';
import { AuthGuard } from './http/auth.guard';
import { MeController } from './http/me.controller';
import { SesionRepositoryPg } from './persistencia/sesion.repository.pg';
import { UnidadDeTrabajoPg } from './persistencia/unidad-de-trabajo.pg';

/**
 * BC1 · Identidad y Acceso. Cablea los puertos del dominio con sus adapters (argon2, tokens
 * opacos, lista de filtradas, PG) y expone la auth (registro/login/logout) + /me. Las clases de
 * dominio y aplicación son framework-agnósticas: acá se instancian por `useFactory`.
 */
@Module({
  controllers: [AuthController, MeController],
  providers: [
    { provide: HASHER, useClass: Argon2Hasher },
    { provide: GENERADOR_TOKEN, useClass: GeneradorTokenCrypto },
    { provide: VERIFICADOR_FILTRADA, useClass: VerificadorFiltradaListaLocal },
    { provide: RELOJ, useClass: RelojSistema },
    {
      provide: UNIDAD_DE_TRABAJO,
      useFactory: (pool: Pool): UnidadDeTrabajo => new UnidadDeTrabajoPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: SESION_REPOSITORY,
      useFactory: (pool: Pool): SesionRepository => new SesionRepositoryPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: CUENTA_REPOSITORY,
      useFactory: (pool: Pool): CuentaRepository => new CuentaRepositoryPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: RegistrarDocente,
      useFactory: (
        uow: UnidadDeTrabajo,
        hasher: HasherContrasena,
        gen: GeneradorTokenOpaco,
        filtrada: VerificadorContrasenaFiltrada,
        reloj: Reloj,
      ): RegistrarDocente => new RegistrarDocente(uow, hasher, gen, filtrada, reloj),
      inject: [UNIDAD_DE_TRABAJO, HASHER, GENERADOR_TOKEN, VERIFICADOR_FILTRADA, RELOJ],
    },
    {
      provide: IniciarSesion,
      useFactory: (
        cuentas: CuentaRepository,
        uow: UnidadDeTrabajo,
        hasher: HasherContrasena,
        gen: GeneradorTokenOpaco,
        reloj: Reloj,
      ): IniciarSesion => new IniciarSesion(cuentas, uow, hasher, gen, reloj),
      inject: [CUENTA_REPOSITORY, UNIDAD_DE_TRABAJO, HASHER, GENERADOR_TOKEN, RELOJ],
    },
    {
      provide: CerrarSesion,
      useFactory: (
        sesiones: SesionRepository,
        gen: GeneradorTokenOpaco,
        reloj: Reloj,
      ): CerrarSesion => new CerrarSesion(sesiones, gen, reloj),
      inject: [SESION_REPOSITORY, GENERADOR_TOKEN, RELOJ],
    },
    {
      provide: VerificarEmail,
      useFactory: (uow: UnidadDeTrabajo, gen: GeneradorTokenOpaco, reloj: Reloj): VerificarEmail =>
        new VerificarEmail(uow, gen, reloj),
      inject: [UNIDAD_DE_TRABAJO, GENERADOR_TOKEN, RELOJ],
    },
    {
      provide: SolicitarRecuperacion,
      useFactory: (
        uow: UnidadDeTrabajo,
        gen: GeneradorTokenOpaco,
        reloj: Reloj,
      ): SolicitarRecuperacion => new SolicitarRecuperacion(uow, gen, reloj),
      inject: [UNIDAD_DE_TRABAJO, GENERADOR_TOKEN, RELOJ],
    },
    {
      provide: RestablecerContrasena,
      useFactory: (
        uow: UnidadDeTrabajo,
        hasher: HasherContrasena,
        gen: GeneradorTokenOpaco,
        filtrada: VerificadorContrasenaFiltrada,
        reloj: Reloj,
      ): RestablecerContrasena => new RestablecerContrasena(uow, hasher, gen, filtrada, reloj),
      inject: [UNIDAD_DE_TRABAJO, HASHER, GENERADOR_TOKEN, VERIFICADOR_FILTRADA, RELOJ],
    },
    AuthGuard,
  ],
})
export class IdentidadModule {}
