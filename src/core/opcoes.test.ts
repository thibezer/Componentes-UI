import { describe, it, expect } from 'vitest';
import { escolherInteiro, inteiroOuNulo } from './opcoes';

describe('escolherInteiro', () => {
  it.each([
    ['5', 5], [' 7 ', 7], ['3.9', 3], [8, 8], ['0', 1], ['-4', 1], ['999', 20]
  ])('converte %j em %i dentro da faixa 1..20', (entrada, esperado) => {
    expect(escolherInteiro(entrada, 1, 20, 4)).toBe(esperado);
  });

  it.each([null, undefined, '', '   ', 'abc', 'NaN', 'Infinity', '-Infinity', NaN, Infinity, '1e999'])(
    'entrada hostil %j cai no padrão',
    (entrada) => {
      expect(escolherInteiro(entrada as never, 1, 20, 4)).toBe(4);
    }
  );
});

describe('inteiroOuNulo', () => {
  it.each([['10', 10], ['0', 0], ['2.7', 2], [' 3 ', 3]])('aceita %j', (entrada, esperado) => {
    expect(inteiroOuNulo(entrada)).toBe(esperado);
  });

  it.each([null, undefined, '', 'x', '-1', 'NaN', 'Infinity'])('rejeita %j', (entrada) => {
    expect(inteiroOuNulo(entrada as never)).toBeNull();
  });

  it('respeita o mínimo informado', () => {
    expect(inteiroOuNulo('0', 1)).toBeNull();
    expect(inteiroOuNulo('1', 1)).toBe(1);
  });
});
