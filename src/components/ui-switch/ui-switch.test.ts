import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './ui-switch';

describe('UISwitch', () => {
  let form: HTMLFormElement;
  let toggle: any;

  beforeEach(() => {
    form = document.createElement('form');

    toggle = document.createElement('ui-switch');
    toggle.setAttribute('name', 'testSwitch');
    toggle.setAttribute('value', 'activeValue');

    form.appendChild(toggle);
    document.body.appendChild(form);
  });

  afterEach(() => {
    if (document.body.contains(form)) {
      document.body.removeChild(form);
    }
  });

  it('should toggle on interaction', () => {
    expect(toggle.ativo).toBe(false);

    toggle.alternar();
    expect(toggle.ativo).toBe(true);

    toggle.alternar();
    expect(toggle.ativo).toBe(false);
  });

  it('should not toggle when disabled', () => {
    toggle.setAttribute('disabled', '');
    expect(toggle.ativo).toBe(false);

    toggle.alternar();
    expect(toggle.ativo).toBe(false); // Still false
  });

  it('should apply size classes correctly', () => {
    const container = toggle.shadowRoot.querySelector('.ui-switch');
    expect(container.classList.contains('ui-switch--md')).toBe(true);

    toggle.setAttribute('tamanho', 'lg');
    expect(container.classList.contains('ui-switch--lg')).toBe(true);
    expect(container.classList.contains('ui-switch--md')).toBe(false);
  });

  it('should reflect form association and reset', async () => {
    toggle.alternar(); // Toggle ON

    let formData = new FormData(form);
    expect(formData.get('testSwitch')).toBe('activeValue');

    form.reset();

    // Trigger reset callback for happy-dom/polyfill environments manually
    if (toggle.formResetCallback) toggle.formResetCallback();

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(toggle.ativo).toBe(false);

    formData = new FormData(form);
    expect(formData.get('testSwitch')).toBeNull();
  });
});
