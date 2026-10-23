import { describe, it, expect } from 'vitest';
import { calcularContador } from './area-texto-contador';

describe('calcularContador (Camada A)', () => {
  it('sem limite mostra só a contagem e nunca anuncia', () => {
    expect(calcularContador(42, null)).toEqual({ texto: '42', nivel: 'normal', anuncio: '' });
  });

  it('abaixo de 90% do limite fica normal', () => {
    expect(calcularContador(89, 100)).toEqual({ texto: '89 / 100', nivel: 'normal', anuncio: '' });
  });

  it('a partir de 90% avisa quantos caracteres restam', () => {
    const e = calcularContador(90, 100);
    expect(e.nivel).toBe('aviso');
    expect(e.anuncio).toBe('Restam 10 caracteres.');
  });

  it('no limite exato avisa que foi atingido', () => {
    const e = calcularContador(100, 100);
    expect(e.nivel).toBe('aviso');
    expect(e.anuncio).toBe('Limite de 100 caracteres atingido.');
  });

  it('acima do limite fica excedido', () => {
    const e = calcularContador(105, 100);
    expect(e.nivel).toBe('excedido');
    expect(e.anuncio).toContain('excedido em 5');
  });

  it.each([NaN, -3, -Infinity])('tamanho inválido %s conta como 0', (n) => {
    expect(calcularContador(n, 100).texto).toBe('0 / 100');
  });

  it.each([NaN, 0, -5, Infinity])('limite inválido %s é ignorado', (limite) => {
    expect(calcularContador(10, limite)).toEqual({ texto: '10', nivel: 'normal', anuncio: '' });
  });
});
