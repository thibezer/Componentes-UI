/**
 * Regressão e robustez de <ui-card> (Camada C do AGENTS.md).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import './ui-card';
import type { UICard } from './ui-card';

function montar(atributos: Record<string, string> = {}, conteudo = 'Corpo'): UICard {
  const el = document.createElement('ui-card') as UICard;
  Object.entries(atributos).forEach(([k, v]) => el.setAttribute(k, v));
  el.innerHTML = conteudo;
  document.body.appendChild(el);
  return el;
}
const base = (el: UICard) => el.shadowRoot!.querySelector('.ui-card') as HTMLElement;

afterEach(() => { document.body.innerHTML = ''; });

describe('acessibilidade do card clicável', () => {
  it('é um botão focável por teclado (falhava antes: tabindex sem role)', () => {
    const el = montar({ clicavel: '' });
    expect(base(el).getAttribute('role')).toBe('button');
    expect(base(el).getAttribute('tabindex')).toBe('0');
  });

  it('não clicável: sem role nem tabindex', () => {
    const el = montar();
    expect(base(el).hasAttribute('role')).toBe(false);
    expect(base(el).hasAttribute('tabindex')).toBe(false);
  });

  it('desabilitado: aria-disabled e fora da ordem de Tab (falhava antes)', () => {
    const el = montar({ clicavel: '', disabled: '' });
    expect(base(el).getAttribute('aria-disabled')).toBe('true');
    expect(base(el).getAttribute('tabindex')).toBe('-1');
  });

  it('reabilitar e remover clicável limpam os atributos', () => {
    const el = montar({ clicavel: '', disabled: '' });
    el.disabled = false;
    expect(base(el).hasAttribute('aria-disabled')).toBe(false);
    expect(base(el).getAttribute('tabindex')).toBe('0');
    el.clicavel = false;
    expect(base(el).hasAttribute('role')).toBe(false);
  });
});

describe('eventos', () => {
  it('clique emite ui-click e ui-clique com o id', () => {
    const el = montar({ clicavel: '', id: 'c1' });
    const a = vi.fn();
    const b = vi.fn();
    el.addEventListener('ui-click', a);
    el.addEventListener('ui-clique', b);
    base(el).click();
    expect(a).toHaveBeenCalledTimes(1);
    expect((b.mock.calls[0][0] as CustomEvent).detail).toEqual({ id: 'c1' });
  });

  it.each(['Enter', ' '])('a tecla %s ativa o card clicável', (tecla) => {
    const el = montar({ clicavel: '' });
    const a = vi.fn();
    el.addEventListener('ui-click', a);
    base(el).dispatchEvent(new KeyboardEvent('keydown', { key: tecla, bubbles: true, cancelable: true }));
    expect(a).toHaveBeenCalledTimes(1);
  });

  it('desabilitado ou não clicável não emite', () => {
    const a = vi.fn();
    const off = montar({ clicavel: '', disabled: '' });
    off.addEventListener('ui-click', a);
    base(off).click();
    base(off).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    const comum = montar();
    comum.addEventListener('ui-click', a);
    base(comum).click();
    expect(a).not.toHaveBeenCalled();
  });

  it('clique num controle interno não ativa o card', () => {
    const el = montar({ clicavel: '' }, '<button id="b">x</button>');
    const a = vi.fn();
    el.addEventListener('ui-click', a);
    (el.querySelector('#b') as HTMLElement).click();
    expect(a).not.toHaveBeenCalled();
  });

  it('reconectar não duplica ouvintes', () => {
    const el = montar({ clicavel: '' });
    el.remove();
    document.body.appendChild(el);
    const a = vi.fn();
    el.addEventListener('ui-click', a);
    base(el).click();
    expect(a).toHaveBeenCalledTimes(1);
  });
});

describe('entradas hostis', () => {
  it('elevação e variante com espaços/aspas não injetam classes (falhava antes)', () => {
    const el = montar({ elevacao: 'alta x"y', variante: 'destaque z onclick=1' });
    const classes = base(el).className.split(/\s+/).sort();
    expect(classes).toEqual(['ui-card', 'ui-card--plano'].sort());
  });

  it('valores válidos continuam aplicados', () => {
    const el = montar({ elevacao: 'elevado', variante: 'destaque' });
    expect(base(el).classList.contains('ui-card--elevado')).toBe(true);
    expect(base(el).classList.contains('ui-card--destaque')).toBe(true);
  });

  it('seções sem conteúdo ficam ocultas e aparecem ao receber slot', () => {
    const el = montar();
    const cab = el.shadowRoot!.querySelector('.ui-card__header') as HTMLElement;
    expect(cab.style.display).toBe('none');
    const h = document.createElement('h3');
    h.slot = 'cabecalho';
    h.textContent = 'T';
    el.appendChild(h);
    (el as unknown as { syncState(): void }).syncState();
    expect(cab.style.display).toBe('flex');
  });
});
