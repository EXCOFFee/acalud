import { describe, expect, it } from 'vitest';
import { tokenizarAprendizajes } from '../../src/modules/institucional/domain/nube-de-palabras';

describe('tokenizarAprendizajes (CU-31 RN-006)', () => {
  it('cuenta frecuencia de palabras repetidas entre varios textos', () => {
    const resultado = tokenizarAprendizajes(
      ['Trabajo en equipo y resolución de conflictos', 'El trabajo en equipo mejoró notablemente'],
      10,
    );
    const trabajo = resultado.find((r) => r.palabra === 'trabajo');
    expect(trabajo?.frecuencia).toBe(2);
    const equipo = resultado.find((r) => r.palabra === 'equipo');
    expect(equipo?.frecuencia).toBe(2);
  });

  it('filtra stopwords y palabras cortas', () => {
    const resultado = tokenizarAprendizajes(['El de la y un por con no'], 10);
    expect(resultado).toEqual([]);
  });

  it('normaliza mayúsculas y tildes: "matemática" y "MATEMATICA" cuentan como la misma palabra', () => {
    const resultado = tokenizarAprendizajes(['Aprendieron matemática básica', 'Repasaron MATEMATICA avanzada'], 10);
    const matematica = resultado.find((r) => r.palabra === 'matematica');
    expect(matematica?.frecuencia).toBe(2);
  });

  it('respeta el límite y ordena por frecuencia descendente', () => {
    const resultado = tokenizarAprendizajes(
      ['comunicacion comunicacion comunicacion liderazgo liderazgo colaboracion'],
      2,
    );
    expect(resultado).toHaveLength(2);
    expect(resultado[0]).toEqual({ palabra: 'comunicacion', frecuencia: 3 });
    expect(resultado[1]).toEqual({ palabra: 'liderazgo', frecuencia: 2 });
  });

  it('devuelve una lista vacía si no hay textos', () => {
    expect(tokenizarAprendizajes([], 10)).toEqual([]);
  });
});
