import { describe, it, expect } from 'vitest';
import {
  aplicarAlturaControle,
  alturaDoTamanho,
  normalizarAltura,
  normalizarTamanhoControle,
  resolverAlturaControle,
  VARIAVEL_ALTURA_CONTROLE
} from './altura-controle';

describe('altura-controle (puro)', () => {
  it('reconhece sm|md|lg e os sinônimos de densidade', () => {
    expect(normalizarTamanhoControle('sm')).toBe('sm');
    expect(normalizarTamanhoControle(' Compacta ')).toBe('sm');
    expect(normalizarTamanhoControle('padrao')).toBe('md');
    expect(normalizarTamanhoControle('normal')).toBe('md');
    expect(normalizarTamanhoControle('relaxada')).toBe('lg');
  });

  it('devolve null para nomes desconhecidos, vazios ou nulos', () => {
    for (const v of ['enorme', '', '  ', null, undefined, 'constructor', '__proto__', 'toString']) {
      expect(normalizarTamanhoControle(v as string | null | undefined)).toBeNull();
    }
  });

  it('o tamanho nomeado vira var() do token com fallback literal', () => {
    expect(alturaDoTamanho('sm')).toBe('var(--ui-altura-sm, 26px)');
    expect(alturaDoTamanho('md')).toBe('var(--ui-altura-md, 34px)');
    expect(alturaDoTamanho('lg')).toBe('var(--ui-altura-lg, 42px)');
  });

  it('altura explícita aceita número, px, rem e em', () => {
    expect(normalizarAltura(40)).toBe('40px');
    expect(normalizarAltura('38')).toBe('38px');
    expect(normalizarAltura('38px')).toBe('38px');
    expect(normalizarAltura('2.5rem')).toBe('2.5rem');
    expect(normalizarAltura('2em')).toBe('2em');
    expect(normalizarAltura('.5rem')).toBe('0.5rem');
  });

  it('altura em px é limitada a [15, 200] e em rem a no máximo 12.5', () => {
    expect(normalizarAltura(1)).toBe('15px');
    expect(normalizarAltura('99999')).toBe('200px');
    expect(normalizarAltura('999rem')).toBe('12.5rem');
  });

  it('altura hostil devolve null (nunca vira CSS arbitrário)', () => {
    for (const v of ['abc', '-5', '0', 'NaN', 'Infinity', '10px; color:red', 'calc(10px)', 'var(--x)', '1e3', '', null, undefined]) {
      expect(normalizarAltura(v as string | null | undefined)).toBeNull();
    }
  });

  it('precedência: altura explícita vence o tamanho', () => {
    expect(resolverAlturaControle({ altura: '50', tamanho: 'sm' })).toBe('50px');
    expect(resolverAlturaControle({ altura: 'lixo', tamanho: 'sm' })).toBe('var(--ui-altura-sm, 26px)');
    expect(resolverAlturaControle({})).toBeNull();
  });
});

describe('aplicarAlturaControle (DOM)', () => {
  const novo = () => document.createElement('div');
  const lerVar = (el: HTMLElement) => el.style.getPropertyValue(VARIAVEL_ALTURA_CONTROLE);

  it('lê tamanho, size e densidade', () => {
    for (const attr of ['tamanho', 'size', 'densidade']) {
      const el = novo();
      el.setAttribute(attr, 'lg');
      aplicarAlturaControle(el);
      expect(lerVar(el)).toBe('var(--ui-altura-lg, 42px)');
    }
  });

  it('lê altura e height e prefere altura a tamanho', () => {
    const el = novo();
    el.setAttribute('height', '44');
    el.setAttribute('tamanho', 'sm');
    aplicarAlturaControle(el);
    expect(lerVar(el)).toBe('44px');
  });

  it('remove a variável ao limpar os atributos', () => {
    const el = novo();
    el.setAttribute('tamanho', 'sm');
    aplicarAlturaControle(el);
    el.removeAttribute('tamanho');
    aplicarAlturaControle(el);
    expect(lerVar(el)).toBe('');
  });

  it('preserva a variável inline que é do consumidor', () => {
    const el = novo();
    el.style.setProperty(VARIAVEL_ALTURA_CONTROLE, '60px');
    aplicarAlturaControle(el);
    expect(lerVar(el)).toBe('60px');
  });

  it('é idempotente', () => {
    const el = novo();
    el.setAttribute('tamanho', 'md');
    aplicarAlturaControle(el);
    aplicarAlturaControle(el);
    expect(lerVar(el)).toBe('var(--ui-altura-md, 34px)');
  });

  it('atributo hostil não escreve nada', () => {
    const el = novo();
    el.setAttribute('altura', 'url(javascript:alert(1))');
    el.setAttribute('tamanho', '<img>');
    aplicarAlturaControle(el);
    expect(lerVar(el)).toBe('');
  });
});
