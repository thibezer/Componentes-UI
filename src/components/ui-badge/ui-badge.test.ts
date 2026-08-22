import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './ui-badge';

describe('UIBadge / UIChip / UITag', () => {
  let element: any;

  beforeEach(() => {
    element = document.createElement('ui-badge');
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (document.body.contains(element)) document.body.removeChild(element);
  });

  it('deve registrar os custom elements de badge, chip e tag', () => {
    expect(customElements.get('ui-badge')).toBeDefined();
    expect(customElements.get('ui-chip')).toBeDefined();
    expect(customElements.get('ui-tag')).toBeDefined();
  });

  it('deve aplicar variantes e estilos corretamente', () => {
    element.setAttribute('variante', 'sucesso');
    element.setAttribute('estilo', 'solido');

    const badge = element.shadowRoot.querySelector('.ui-badge');
    expect(badge.classList.contains('ui-badge--sucesso')).toBe(true);
    expect(badge.classList.contains('ui-badge--solido')).toBe(true);
  });

  it('deve renderizar label com segurança contra injeção XSS', () => {
    const xssPayload = '"><img src=x onerror="alert(1)">';
    element.setAttribute('label', xssPayload);

    const labelSpan = element.shadowRoot.querySelector('.ui-badge__label');
    expect(labelSpan.textContent).toBe(xssPayload);
    expect(labelSpan.querySelector('img')).toBeNull();
  });

  it('deve disparar evento ui-remove ao clicar no botão de fechar quando removível', () => {
    element.setAttribute('removivel', '');
    element.setAttribute('value', 'item-123');

    const spy = vi.fn();
    element.addEventListener('ui-remove', spy);

    const closeBtn = element.shadowRoot.querySelector('.ui-badge__close');
    closeBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.value).toBe('item-123');
  });
});
