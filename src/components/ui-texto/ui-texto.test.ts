import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './ui-texto';

describe('UITexto', () => {
  let element: any;

  beforeEach(() => {
    element = document.createElement('ui-texto');
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (document.body.contains(element)) document.body.removeChild(element);
  });

  it('deve registrar o custom element <ui-texto>', () => {
    expect(customElements.get('ui-texto')).toBeDefined();
  });

  it('deve renderizar tag semântica correta de acordo com a variante', () => {
    element.setAttribute('variante', 'h1');
    let innerTag = element.shadowRoot.querySelector('h1');
    expect(innerTag).not.toBeNull();

    element.setAttribute('variante', 'codigo');
    innerTag = element.shadowRoot.querySelector('code');
    expect(innerTag).not.toBeNull();
  });

  it('deve aplicar classes de cor, peso e alinhamento', () => {
    element.setAttribute('cor', 'primaria');
    element.setAttribute('peso', 'negrito');
    element.setAttribute('alinhamento', 'centro');

    const inner = element.shadowRoot.querySelector('.ui-texto');
    expect(inner.classList.contains('ui-texto--cor-primaria')).toBe(true);
    expect(inner.classList.contains('ui-texto--peso-negrito')).toBe(true);
    expect(inner.classList.contains('ui-texto--alinhamento-centro')).toBe(true);
  });

  it('deve utilizar fallback sem quebrar caso tag inválida ou insegura seja passada', () => {
    element.setAttribute('tag', '<script>');
    element.setAttribute('variante', 'h2');
    const inner = element.shadowRoot.querySelector('h2');
    expect(inner).not.toBeNull();
  });
});
