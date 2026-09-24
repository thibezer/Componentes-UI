import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './ui-card';

describe('UICard', () => {
  let element: any;

  beforeEach(() => {
    element = document.createElement('ui-card');
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (document.body.contains(element)) document.body.removeChild(element);
  });

  it('deve registrar o custom element <ui-card>', () => {
    expect(customElements.get('ui-card')).toBeDefined();
  });

  it('deve aplicar elevação, variante e estado clicável', () => {
    element.setAttribute('elevacao', 'elevado');
    element.setAttribute('variante', 'destaque');
    element.setAttribute('clicavel', '');

    const card = element.shadowRoot.querySelector('.ui-card');
    expect(card.classList.contains('ui-card--elevado')).toBe(true);
    expect(card.classList.contains('ui-card--destaque')).toBe(true);
    expect(card.classList.contains('ui-card--clicavel')).toBe(true);
  });

  it('deve disparar evento de clique quando configurado como clicável', () => {
    element.setAttribute('clicavel', '');
    const spy = vi.fn();
    element.addEventListener('ui-clique', spy);

    const card = element.shadowRoot.querySelector('.ui-card');
    card.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('não deve disparar clique se estiver desabilitado', () => {
    element.setAttribute('clicavel', '');
    element.setAttribute('disabled', '');
    const spy = vi.fn();
    element.addEventListener('ui-clique', spy);

    const card = element.shadowRoot.querySelector('.ui-card');
    card.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(spy).not.toHaveBeenCalled();
  });

  it('deve disparar evento de clique ao pressionar Enter ou Espaço quando clicável', () => {
    element.setAttribute('clicavel', '');
    const spy = vi.fn();
    element.addEventListener('ui-clique', spy);

    const card = element.shadowRoot.querySelector('.ui-card');
    card.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    card.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));

    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('não deve disparar clique do card se o clique originou de um botão ou link interno', () => {
    element.setAttribute('clicavel', '');
    const spy = vi.fn();
    element.addEventListener('ui-clique', spy);

    const btn = document.createElement('button');
    btn.textContent = 'Ação Interna';
    element.appendChild(btn);

    const card = element.shadowRoot.querySelector('.ui-card');
    card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(spy).toHaveBeenCalledTimes(1);

    // Agora simula clique vindo do botão interno
    const innerClick = new MouseEvent('click', { bubbles: true });
    Object.defineProperty(innerClick, 'target', { value: btn, enumerable: true });
    card.dispatchEvent(innerClick);

    // O contador de chamadas não deve ter subido
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
