import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './ui-tooltip';

describe('UITooltip', () => {
  let element: any;

  beforeEach(() => {
    element = document.createElement('ui-tooltip');
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (document.body.contains(element)) document.body.removeChild(element);
  });

  it('deve registrar o custom element <ui-tooltip>', () => {
    expect(customElements.get('ui-tooltip')).toBeDefined();
  });

  it('deve renderizar o texto do tooltip com segurança contra XSS', () => {
    const xssPayload = '"><img src=x onerror="alert(1)">';
    element.setAttribute('texto', xssPayload);

    const textoSpan = element.shadowRoot.querySelector('.ui-tooltip__texto');
    expect(textoSpan.textContent).toBe(xssPayload);
    expect(textoSpan.querySelector('img')).toBeNull();
  });

  it('deve alternar estado de visibilidade ao chamar mostrar() e ocultar()', () => {
    element.setAttribute('texto', 'Dica explicativa');
    element.mostrar();
    expect(element.aberto).toBe(true);

    element.ocultar();
    expect(element.aberto).toBe(false);
  });
});
