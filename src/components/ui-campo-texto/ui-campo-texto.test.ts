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

  it('should allow typing when input is prefilled with a value attribute without reverting', () => {
    element.setAttribute('value', 'initial');

    const input = element.shadowRoot.querySelector('input');
    expect(input.value).toBe('initial');

    // Simulate focusing and typing
    input.dispatchEvent(new Event('focus'));
    input.value = 'initial text';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    // Because the component is focused, the syncState should not revert the value back to 'initial'
    expect(input.value).toBe('initial text');

    // Changing the attribute externally while NOT focused should update the input
    input.dispatchEvent(new Event('blur'));
    element.setAttribute('value', 'new initial');
    expect(input.value).toBe('new initial');
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

  it('should support ElementInternals and be form associated', () => {
    const form = document.createElement('form');
    const field = document.createElement('ui-campo-texto');
    field.setAttribute('name', 'testField');
    field.setAttribute('value', 'initial');
    form.appendChild(field);
    document.body.appendChild(form);

    const formData = new FormData(form);
    expect(formData.get('testField')).toBe('initial');

    document.body.removeChild(form);
  });
});
