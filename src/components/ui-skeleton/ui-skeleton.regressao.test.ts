/**
 * Regressão e robustez de <ui-skeleton> (Camada C do AGENTS.md).
 */
import { describe, it, expect, afterEach } from 'vitest';
import './ui-skeleton';
import type { UISkeleton } from './ui-skeleton';

function montar(atributos: Record<string, string> = {}): UISkeleton {
  const el = document.createElement('ui-skeleton') as UISkeleton;
  Object.entries(atributos).forEach(([k, v]) => el.setAttribute(k, v));
  document.body.appendChild(el);
  return el;
}
const itens = (el: UISkeleton) => el.shadowRoot!.querySelectorAll('.ui-skeleton');

afterEach(() => { document.body.innerHTML = ''; });

describe('robustez', () => {
  it('linhas absurdas não criam milhões de nós (falhava antes: sem limite)', () => {
    const el = montar({ linhas: '100000000' });
    expect(itens(el).length).toBeLessThanOrEqual(100);
  });

  it.each(['abc', '-5', '0', ''])('linhas inválidas (%s) caem em 1 sem lançar', (v) => {
    const el = montar({ linhas: v });
    expect(el.linhas).toBe(1);
    expect(itens(el).length).toBe(1);
  });

  it('variante e animação desconhecidas caem nos padrões', () => {
    const el = montar({ variante: 'xyz', animado: 'quantico' });
    expect(el.variante).toBe('texto');
    expect(el.animado).toBe('shimmer');
  });

  it('dimensões numéricas ganham px; com unidade são mantidas', () => {
    const el = montar({ variante: 'retangular', largura: '120', altura: '3rem' });
    const alvo = el.shadowRoot!.querySelector('.ui-skeleton--retangular') as HTMLElement;
    expect(alvo.style.width).toBe('120px');
    expect(alvo.style.height).toBe('3rem');
  });

  it('a variante card renderiza mídia, cabeçalho e duas linhas', () => {
    const el = montar({ variante: 'card' });
    expect(el.shadowRoot!.querySelector('.ui-skeleton__card-media')).not.toBeNull();
    expect(el.shadowRoot!.querySelectorAll('.ui-skeleton--texto').length).toBe(2);
  });

  it('re-renderizar não acumula nós', () => {
    const el = montar({ linhas: '3' });
    for (let i = 0; i < 5; i++) el.setAttribute('linhas', String(3 + (i % 2)));
    expect(itens(el).length).toBeLessThanOrEqual(4);
  });
});

describe('acessibilidade', () => {
  it('é decorativo por padrão: o host fica aria-hidden e não há role=status contraditório dentro (falhava antes)', () => {
    const el = montar();
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.shadowRoot!.querySelector('[role="status"]')).toBeNull();
  });

  it('com aria-label vira uma região de status anunciável (sem aria-hidden)', () => {
    const el = montar({ 'aria-label': 'Carregando tabela' });
    expect(el.hasAttribute('aria-hidden')).toBe(false);
    expect(el.getAttribute('role')).toBe('status');
  });

  it('aria-hidden definido pelo consumidor é preservado', () => {
    const el = document.createElement('ui-skeleton') as UISkeleton;
    el.setAttribute('aria-hidden', 'false');
    document.body.appendChild(el);
    expect(el.getAttribute('aria-hidden')).toBe('false');
  });

  it('remover o rótulo volta ao modo decorativo', () => {
    const el = montar({ 'aria-label': 'Carregando' });
    el.removeAttribute('aria-label');
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.hasAttribute('role')).toBe(false);
  });
});
