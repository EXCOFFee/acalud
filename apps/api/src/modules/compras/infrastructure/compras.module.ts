import { Module } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../platform/db/pg.module';
import { IniciarCheckout } from '../application/iniciar-checkout';
import { PonerLinea } from '../application/poner-linea';
import { ProcesarPago } from '../application/procesar-pago';
import { QuitarLinea } from '../application/quitar-linea';
import { VerCarrito } from '../application/ver-carrito';
import { CARRITO_REPOSITORY, type CarritoRepository } from '../domain/ports/carrito.repository';
import {
  UNIDAD_DE_TRABAJO_COMPRAS,
  type UnidadDeTrabajoCompras,
} from '../domain/ports/checkout.repository';
import { PAYMENT_PROVIDER, type PaymentProvider } from '../domain/ports/payment-provider.port';
import { CarritoController } from './http/carrito.controller';
import { CheckoutController } from './http/checkout.controller';
import { crearPaymentProvider } from './payment-provider.factory';
import { CarritoRepositoryPg } from './persistencia/carrito.repository.pg';
import { UnidadDeTrabajoComprasPg } from './persistencia/unidad-de-trabajo.pg';

/**
 * BC3 · Compras. Carrito (CU-010) con cálculo de precios server-side + el puerto de pago
 * (fake en Etapa 1). Los casos de uso son clases framework-agnósticas cableadas por useFactory.
 */
@Module({
  controllers: [CarritoController, CheckoutController],
  providers: [
    // Singleton: el fake de MP es stateful (guarda el monto por pedido entre crear y consultar).
    { provide: PAYMENT_PROVIDER, useFactory: () => crearPaymentProvider() },
    {
      provide: CARRITO_REPOSITORY,
      useFactory: (pool: Pool): CarritoRepository => new CarritoRepositoryPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: UNIDAD_DE_TRABAJO_COMPRAS,
      useFactory: (pool: Pool): UnidadDeTrabajoCompras => new UnidadDeTrabajoComprasPg(pool),
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
    {
      provide: IniciarCheckout,
      useFactory: (uow: UnidadDeTrabajoCompras, pagos: PaymentProvider): IniciarCheckout =>
        new IniciarCheckout(uow, pagos),
      inject: [UNIDAD_DE_TRABAJO_COMPRAS, PAYMENT_PROVIDER],
    },
    {
      provide: ProcesarPago,
      useFactory: (uow: UnidadDeTrabajoCompras, pagos: PaymentProvider): ProcesarPago =>
        new ProcesarPago(uow, pagos),
      inject: [UNIDAD_DE_TRABAJO_COMPRAS, PAYMENT_PROVIDER],
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class ComprasModule {}
