import type { EstadoPedido } from '../pedido';

export interface FiltroHistorial {
  estado?: EstadoPedido | undefined;
  orden_por?: 'created_at' | 'total_amount' | undefined;
  orden_dir?: 'asc' | 'desc' | undefined;
  pagina?: number | undefined;
  limite?: number | undefined;
}

export interface OrdenHistorial {
  id: string;
  numero: string;
  fecha: Date;
  total: number;
  estado: EstadoPedido;
  tracking_code: string | null;
}

export interface ResultadoPaginado<T> {
  items: T[];
  total_items: number;
  total_paginas: number;
  pagina_actual: number;
}

export interface DetalleOrdenHistorial {
  id: string;
  numero: string;
  fecha: Date;
  estado: EstadoPedido;
  subtotal: number;
  envio_costo: number;
  total: number;
  tracking_code: string | null;
  domicilio: {
    calle: string | null;
    numero: string | null;
    localidad: string | null;
    provincia: string | null;
    codigo_postal: string | null;
  };
  lineas: {
    juego_id: string;
    nombre: string;
    cantidad: number;
    precio_unitario: number;
    descuento_pct: number;
  }[];
}

export interface HistorialRepository {
  listar(usuarioId: string, filtro: FiltroHistorial): Promise<ResultadoPaginado<OrdenHistorial>>;
  detalle(usuarioId: string, ordenId: string): Promise<DetalleOrdenHistorial | null>;
}
