import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './ui-drawer';
import { UIDrawer } from './ui-drawer';

describe('Web Component: <ui-drawer>', () => {
  let drawer: UIDrawer;

  beforeEach(() => {
    document.body.innerHTML = '';
    drawer = document.createElement('ui-drawer') as UIDrawer;
    document.body.appendChild(drawer);
  });

  afterEach(() => {
    if (drawer.aberto) {
      drawer.fechar();
    }
    if (document.body.contains(drawer)) {
      document.body.removeChild(drawer);
    }
  });

  it('deve registrar o elemento <ui-drawer> e os aliases W3C', () => {
    expect(customElements.get('ui-drawer')).toBeDefined();
    expect(customElements.get('ui-sheet')).toBeDefined();
    expect(customElements.get('ui-painel-lateral')).toBeDefined();
    expect(customElements.get('ui-gaveta')).toBeDefined();
  });

  it('deve abrir e fechar o drawer via métodos imperativos e emitir eventos', () => {
    const spyAbrir = vi.fn();
    const spyFechar = vi.fn();
    drawer.addEventListener('ui-abrir', spyAbrir);
    drawer.addEventListener('ui-fechar', spyFechar);

    expect(drawer.aberto).toBe(false);

    drawer.abrir();
    expect(drawer.aberto).toBe(true);
    expect(spyAbrir).toHaveBeenCalledTimes(1);
    expect(document.body.style.overflow).toBe('hidden');

    drawer.fechar();
    expect(drawer.aberto).toBe(false);
    expect(spyFechar).toHaveBeenCalledTimes(1);
    expect(document.body.style.overflow).toBe('');
  });

  it('deve fechar ao clicar no backdrop se não for estático', () => {
    drawer.abrir();
    expect(drawer.aberto).toBe(true);

    const backdrop = drawer.shadowRoot?.querySelector('.ui-drawer__backdrop') as HTMLElement;
    backdrop.click();

    expect(drawer.aberto).toBe(false);
  });

  it('não deve fechar ao clicar no backdrop se tiver atributo estatico', () => {
    drawer.setAttribute('estatico', '');
    drawer.abrir();
    expect(drawer.aberto).toBe(true);

    const backdrop = drawer.shadowRoot?.querySelector('.ui-drawer__backdrop') as HTMLElement;
    backdrop.click();

    expect(drawer.aberto).toBe(true);
  });

  it('deve fechar ao pressionar a tecla Escape no drawer ativo', () => {
    drawer.abrir();
    expect(drawer.aberto).toBe(true);

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(drawer.aberto).toBe(false);
  });
});
