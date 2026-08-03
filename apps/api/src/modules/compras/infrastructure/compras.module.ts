import { Module } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../../../platform/db/pg.module';
import { CalcularEnvio } from '../application/calcular-envio';
import { IniciarCheckout } from '../application/iniciar-checkout';
import { PonerLinea } from '../application/poner-linea';
import { ProcesarPago } from '../application/procesar-pago';
import { QuitarLinea } from '../application/quitar-linea';
import { VerCarrito } from '../application/ver-carrito';
import { CARRITO_REPOSITORY, type CarritoRepository } from '../domain/ports/carrito.repository';
import { ENVIO_REPOSITORY, type EnvioRepository } from '../domain/ports/envio.repository';
import {
  UNIDAD_DE_TRABAJO_COMPRAS,
  type UnidadDeTrabajoCompras,
} from '../domain/ports/checkout.repository';
import { PAYMENT_PROVIDER, type PaymentProvider } from '../domain/ports/payment-provider.port';
import { CarritoController } from './http/carrito.controller';
import { CheckoutController } from './http/checkout.controller';
import { EnvioController } from './http/envio.controller';
import { crearPaymentProvider } from './payment-provider.factory';
import { CarritoRepositoryPg } from './persistencia/carrito.repository.pg';
import { EnvioRepositoryPg } from './persistencia/envio.repository.pg';
import { UnidadDeTrabajoComprasPg } from './persistencia/unidad-de-trabajo.pg';
import { VerHistorial } from '../application/ver-historial';
import { HistorialController } from './http/historial.controller';
import { HistorialRepositoryPg } from './persistencia/historial.repository.pg';
import { HistorialRepository } from '../domain/ports/historial.repository';
import { VerSeguimientoPedido } from '../application/ver-seguimiento-pedido';
import type { TrackingRepository } from '../domain/ports/tracking.repository';
import { TrackingRepositoryPg } from './persistencia/tracking.repository.pg';
import { SHIPPING_PROVIDER, type ShippingProvider } from '../domain/ports/shipping-provider.port';
import { crearShippingProvider } from './shipping-provider.factory';

export const HISTORIAL_REPOSITORY = Symbol('HistorialRepository');
export const TRACKING_REPOSITORY = Symbol('TrackingRepository');

/**
 * BC3 · Compras. Carrito (CU-010) con cálculo de precios server-side + los puertos de pago y
 * envío (fakes en Etapa 1). Los casos de uso son clases framework-agnósticas cableadas por
 * useFactory. `ShippingProvider` vive acá mismo (no en un módulo `logistica` aparte): la regla
 * de fronteras (ADR-002) prohíbe que otro BC lo importe, y ningún otro BC lo necesita hoy.
 */
@Module({
  controllers: [CarritoController, CheckoutController, HistorialController, EnvioController],
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
    {
      provide: HISTORIAL_REPOSITORY,
      useFactory: (pool: Pool): HistorialRepository => new HistorialRepositoryPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: VerHistorial,
      useFactory: (repo: HistorialRepository): VerHistorial => new VerHistorial(repo),
      inject: [HISTORIAL_REPOSITORY],
    },
    {
      provide: TRACKING_REPOSITORY,
      useFactory: (pool: Pool): TrackingRepository => new TrackingRepositoryPg(pool),
      inject: [PG_POOL],
    },
    // Singleton simple: sin estado propio, pero coherente con el resto de los adapters fake.
    { provide: SHIPPING_PROVIDER, useFactory: () => crearShippingProvider() },
    {
      provide: VerSeguimientoPedido,
      useFactory: (repo: TrackingRepository, shipping: ShippingProvider): VerSeguimientoPedido =>
        new VerSeguimientoPedido(repo, shipping),
      inject: [TRACKING_REPOSITORY, SHIPPING_PROVIDER],
    },
    {
      provide: ENVIO_REPOSITORY,
      useFactory: (pool: Pool): EnvioRepository => new EnvioRepositoryPg(pool),
      inject: [PG_POOL],
    },
    {
      provide: CalcularEnvio,
      useFactory: (repo: EnvioRepository, shipping: ShippingProvider): CalcularEnvio =>
        new CalcularEnvio(repo, shipping),
      inject: [ENVIO_REPOSITORY, SHIPPING_PROVIDER],
    },
  ],
  exports: [PAYMENT_PROVIDER],
})
export class ComprasModule {}
