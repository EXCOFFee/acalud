/**
 * Read-model del catálogo (BC2). Solo lectura: el catálogo se consume público (CU-006) y no
 * expone cantidad de stock, solo un booleano `stock_disponible` (2.4: no filtrar inventario).
 */
export interface JuegoResumen {
  id: string;
  nombre: string;
  precio_lista: number;
  area: string | null;
  edad_objetivo: string | null;
  imagen_url: string | null;
  tiene_demo_publica: boolean;
}

export interface DemoResumen {
  tipo: 'publica' | 'completa';
  formato: 'html5' | 'pdf' | 'video';
}

export interface RecursoResumen {
  id: string;
  nombre: string;
  tipo: 'libre' | 'licenciado';
  desbloqueado: boolean;
}

export interface Tramo {
  cantidad_minima: number;
  descuento_pct: number;
}

export interface JuegoDetalle extends JuegoResumen {
  descripcion: string;
  peso_gramos: number;
  stock_disponible: boolean;
  imagenes: string[];
  demos: DemoResumen[];
  recursos: RecursoResumen[];
  tramos: Tramo[];
}

export interface FiltroCatalogo {
  q: string | undefined;
  area: string | undefined;
  pagina: number;
  tamanio: number;
}

export interface PaginaJuegos {
  datos: JuegoResumen[];
  total: number;
}
