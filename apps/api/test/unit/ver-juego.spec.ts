import { describe, expect, it } from 'vitest';
import { VerJuego } from '../../src/modules/catalogo/application/ver-juego';
import { JuegoNoEncontrado } from '../../src/modules/catalogo/domain/errores';
import type { JuegoDetalle, PaginaJuegos } from '../../src/modules/catalogo/domain/juego';
import type { CatalogoRepository } from '../../src/modules/catalogo/domain/ports/catalogo.repository';
import type { RecursosAutorizacionPort } from '../../src/modules/catalogo/domain/ports/recursos-autorizacion.port';

const JUEGO = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function ficha(recursos: JuegoDetalle['recursos']): JuegoDetalle {
  return {
    id: JUEGO,
    nombre: 'Fracciones',
    precio_lista: 100,
    area: null,
    imagen_url: null,
    tiene_demo_publica: false,
    descripcion: 'd',
    peso_gramos: null,
    stock_disponible: true,
    imagenes: [],
    demos: [],
    recursos,
    tramos: [],
  };
}

class CatalogoFake implements CatalogoRepository {
  constructor(private readonly juego: JuegoDetalle | null) {}
  async listarPublicados(): Promise<PaginaJuegos> {
    return { datos: [], total: 0 };
  }
  async verPublicado(): Promise<JuegoDetalle | null> {
    return this.juego;
  }
}

/** Puerto falso que cuenta las consultas, para verificar cuándo NO se consulta. */
class AutorizacionFake implements RecursosAutorizacionPort {
  consultas = 0;
  constructor(private readonly tieneDerecho: boolean) {}
  async tieneDerechoAlJuego(): Promise<boolean> {
    this.consultas++;
    return this.tieneDerecho;
  }
}

const LIBRE = { id: 'r1', nombre: 'Guía', tipo: 'libre' as const, desbloqueado: true };
const LIC = { id: 'r2', nombre: 'Fichas', tipo: 'licenciado' as const, desbloqueado: false };

describe('VerJuego · desbloqueo de recursos según el derecho del usuario (CU-09)', () => {
  it('anónimo: devuelve la ficha tal cual y no consulta el derecho', async () => {
    const auth = new AutorizacionFake(true);
    const r = await new VerJuego(new CatalogoFake(ficha([LIBRE, LIC])), auth).ejecutar(JUEGO, null);
    expect(r.recursos.find((x) => x.id === 'r2')?.desbloqueado).toBe(false);
    expect(auth.consultas).toBe(0);
  });

  it('con sesión y sin nada bloqueado: no consulta (evita una query inútil)', async () => {
    const auth = new AutorizacionFake(true);
    await new VerJuego(new CatalogoFake(ficha([LIBRE])), auth).ejecutar(JUEGO, 'u1');
    expect(auth.consultas).toBe(0);
  });

  it('con sesión y derecho: desbloquea los licenciados con UNA sola consulta', async () => {
    const auth = new AutorizacionFake(true);
    const otroLic = { ...LIC, id: 'r3' };
    const r = await new VerJuego(new CatalogoFake(ficha([LIBRE, LIC, otroLic])), auth).ejecutar(
      JUEGO,
      'u1',
    );
    expect(r.recursos.every((x) => x.desbloqueado)).toBe(true);
    expect(auth.consultas).toBe(1);
  });

  it('con sesión y sin derecho: los licenciados siguen bloqueados', async () => {
    const r = await new VerJuego(
      new CatalogoFake(ficha([LIBRE, LIC])),
      new AutorizacionFake(false),
    ).ejecutar(JUEGO, 'u1');
    expect(r.recursos.find((x) => x.id === 'r2')?.desbloqueado).toBe(false);
  });

  it('juego inexistente: JuegoNoEncontrado', async () => {
    await expect(
      new VerJuego(new CatalogoFake(null), new AutorizacionFake(true)).ejecutar(JUEGO, 'u1'),
    ).rejects.toBeInstanceOf(JuegoNoEncontrado);
  });
});
