import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './ui-campo-texto';

describe('UICampoTexto', () => {
  let element: any; // using any to access internals

  beforeEach(() => {
    element = document.createElement('ui-campo-texto');
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  it('should emit ui-input event on input and preserve cursor position (not reset HTML attribute)', async () => {
    const spy = vi.fn();
    element.addEventListener('ui-input', spy);

    const input = element.shadowRoot.querySelector('input');
    input.value = 'test';

    // Simulate input event
    const event = new Event('input', { bubbles: true });
    input.dispatchEvent(event);

    expect(spy).toHaveBeenCalled();
    const customEvent = spy.mock.calls[0][0];
    expect(customEvent.detail.value).toBe('test');

    // Ensure we are not directly setting the attribute, which would cause DOM refresh
    // (We updated the code to remove this.setAttribute('value', val))
    expect(element.getAttribute('value')).toBeNull();
  });

  it('should allow typing when input is prefilled with a value attribute without reverting on blur', () => {
    element.setAttribute('value', 'initial');

    const input = element.shadowRoot.querySelector('input');
    expect(input.value).toBe('initial');

    // Simulate focusing and typing
    input.dispatchEvent(new Event('focus'));
    input.value = 'initial text';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(input.value).toBe('initial text');

    // On blur, the edited value MUST be preserved (not reverted to attribute value 'initial')
    input.dispatchEvent(new Event('blur'));
    expect(input.value).toBe('initial text');
    expect(element.value).toBe('initial text');
  });

  it('should reflect disabled state', () => {
    element.setAttribute('disabled', '');
    const input = element.shadowRoot.querySelector('input');
    expect(input.disabled).toBe(true);

    element.removeAttribute('disabled');
    expect(input.disabled).toBe(false);
  });

  it('should toggle password visibility', () => {
    element.setAttribute('tipo', 'password');
    element.setAttribute('alternar-senha', '');

    const input = element.shadowRoot.querySelector('input');
    expect(input.type).toBe('password');

    element.alternarVisibilidadeSenha();
    expect(input.type).toBe('text');

    element.alternarVisibilidadeSenha();
    expect(input.type).toBe('password');
  });

  it('should support ElementInternals and update FormData after editing prefilled value', () => {
    const form = document.createElement('form');
    const field = document.createElement('ui-campo-texto');
    field.setAttribute('name', 'testField');
    field.setAttribute('value', 'initial');
    form.appendChild(field);
    document.body.appendChild(form);

    const input = field.shadowRoot!.querySelector('input')!;
    input.dispatchEvent(new Event('focus'));
    input.value = 'updated value';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('blur'));

    const formData = new FormData(form);
    expect(formData.get('testField')).toBe('updated value');

    document.body.removeChild(form);
  });
});
