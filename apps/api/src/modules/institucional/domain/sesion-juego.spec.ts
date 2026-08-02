import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SesionJuego } from './sesion-juego';

describe('SesionJuego (Dominio)', () => {
  const institucionId = 'inst-123';
  const docenteId = 'doc-123';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-02T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('crear()', () => {
    it('debe devolver un comando insert válido y establecer el estado a completada', () => {
      const datos = {
        productoId: 'prod-123',
        fecha: new Date('2026-08-01T10:00:00Z'),
        grupo: '4°B',
        estudiantes: 28,
        duracion: 45,
        satisfaccion: 5,
        aprendizajes: 'Aprendimos a sumar fracciones.',
        dificultades: null,
        reutilizaria: true
      };

      const comando = SesionJuego.crear(datos, institucionId, docenteId);

      expect(comando.tipo).toBe('insert');
      expect(comando.estado).toBe('completada');
      expect(comando.datos.docenteId).toBe(docenteId);
      expect(comando.datos.institucionId).toBe(institucionId);
      expect(comando.datos.productoId).toBe('prod-123');
      expect(comando.datos.estudiantes).toBe(28);
      expect(comando.datos.duracion).toBe(45);
    });
  });
});
