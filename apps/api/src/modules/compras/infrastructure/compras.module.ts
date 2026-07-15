import { Module } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../platform/db/pg.module';
import { PonerLinea } from '../application/poner-linea';
import { QuitarLinea } from '../application/quitar-linea';
import { VerCarrito } from '../application/ver-carrito';
import { CARRITO_REPOSITORY, type CarritoRepository } from '../domain/ports/carrito.repository';
import { PAYMENT_PROVIDER } from '../domain/ports/payment-provider.port';
import { CarritoController } from './http/carrito.controller';
import { crearPaymentProvider } from './payment-provider.factory';
import { CarritoRepositoryPg } from './persistencia/carrito.repository.pg';

/**
 * BC3 · Compras. Carrito (CU-010) con cálculo de precios server-side + el puerto de pago
 * (fake en Etapa 1). Los casos de uso son clases framework-agnósticas cableadas por useFactory.
 */
@Module({
  controllers: [CarritoController],
  providers: [
    { provide: PAYMENT_PROVIDER, useFactory: () => crearPaymentProvider() },
    {
      provide: CARRITO_REPOSITORY,
      useFactory: (pool: Pool): CarritoRepository => new CarritoRepositoryPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: VerCarrito,
      useFactory: (repo: CarritoRepository): VerCarrito => new VerCarrito(repo),
      inject: [CARRITO_REPOSITORY],
    },
    {
      provide: PonerLinea,
      useFactory: (repo: CarritoRepository): PonerLinea => new PonerLinea(repo),
      inject: [CARRITO_REPOSITORY],
    },
    {
      provide: QuitarLinea,
      useFactory: (repo: CarritoRepository): QuitarLinea => new QuitarLinea(repo),
      inject: [CARRITO_REPOSITORY],
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class ComprasModule {}
