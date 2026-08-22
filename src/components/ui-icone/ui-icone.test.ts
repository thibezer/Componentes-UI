import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './ui-icone';

describe('UIIcone', () => {
  let element: any;

  beforeEach(() => {
    element = document.createElement('ui-icone');
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (document.body.contains(element)) document.body.removeChild(element);
  });

  it('deve registrar o custom element <ui-icone>', () => {
    expect(customElements.get('ui-icone')).toBeDefined();
  });

  it('deve renderizar ícone nativo SVG conhecido', () => {
    element.setAttribute('nome', 'search');
    const svg = element.shadowRoot.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('deve prevenir injeção XSS através do atributo nome', () => {
    const xssPayload = '"><img src=x onerror="alert(1)">';
    element.setAttribute('nome', xssPayload);

    // Como o nome não existe na whitelist interna de SVG nativo, nenhum HTML/script deve ser gerado
    const img = element.shadowRoot.querySelector('img');
    const script = element.shadowRoot.querySelector('script');
    expect(img).toBeNull();
    expect(script).toBeNull();
  });

  it('deve aplicar tamanhos padronizados via variável CSS', () => {
    element.setAttribute('tamanho', 'lg');
    expect(element.style.getPropertyValue('--ui-tamanho-icone')).toBe('24px');

    element.setAttribute('tamanho', '36');
    expect(element.style.getPropertyValue('--ui-tamanho-icone')).toBe('36px');
  });
});
