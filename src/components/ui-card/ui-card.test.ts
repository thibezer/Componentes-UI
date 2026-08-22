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
});
