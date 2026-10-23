import { describe, it, expect } from 'vitest';
import { calcularAlturaAutomatica } from './area-texto-altura';

describe('calcularAlturaAutomatica (Camada A)', () => {
  it('conteúdo maior que a área visível pede altura igual ao conteúdo', () => {
    expect(calcularAlturaAutomatica(180, 96)).toBe(180);
  });

  it('arredonda para cima para não deixar rolagem de 1px', () => {
    expect(calcularAlturaAutomatica(180.2, 96)).toBe(181);
  });

  it('conteúdo que cabe devolve null (volta ao controle de rows)', () => {
    expect(calcularAlturaAutomatica(80, 96)).toBeNull();
    expect(calcularAlturaAutomatica(96, 96)).toBeNull();
  });

  it.each([[0, 0], [NaN, 96], [96, NaN], [Infinity, 96], [-10, 96]])('medidas inválidas (%s, %s) devolvem null', (a, b) => {
    expect(calcularAlturaAutomatica(a, b)).toBeNull();
  });
});
