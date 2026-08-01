import { describe, it, expect, beforeEach } from 'vitest';
import './ui-checkbox';
import { UICheckbox } from './ui-checkbox';

describe('Web Component: <ui-checkbox>', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('deve inicializar desmarcado e alternar para marcado', () => {
    const checkbox = document.createElement('ui-checkbox') as UICheckbox;
    document.body.appendChild(checkbox);

    expect(checkbox.marcado).toBe(false);

    checkbox.marcado = true;
    expect(checkbox.hasAttribute('marcado')).toBe(true);
  });

  it('deve disparar o evento ui-change ao alternar estado', () => {
    return new Promise<void>((resolve) => {
      const checkbox = document.createElement('ui-checkbox') as UICheckbox;
      document.body.appendChild(checkbox);

      checkbox.addEventListener('ui-change', (e: Event) => {
        const customEvent = e as CustomEvent;
        expect(customEvent.detail.marcado).toBe(true);
        resolve();
      });

      const container = checkbox.shadowRoot?.querySelector('.ui-checkbox');
      (container as HTMLElement)?.click();
    });
  });
});
