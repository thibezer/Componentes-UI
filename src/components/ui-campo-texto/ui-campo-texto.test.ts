import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './ui-campo-texto';
import fs from 'fs';
import path from 'path';

describe('UICampoTexto', () => {
  let element: any; // using any to access internals

  beforeEach(() => {
    element = document.createElement('ui-campo-texto');
    document.body.appendChild(element);
  });

  afterEach(() => {
    document.body.removeChild(element);
  });

  it('should emit ui-input and native input/change events on input/change', async () => {
    const uiInputSpy = vi.fn();
    const nativeInputSpy = vi.fn();
    const uiChangeSpy = vi.fn();
    const nativeChangeSpy = vi.fn();

    element.addEventListener('ui-input', uiInputSpy);
    element.addEventListener('input', nativeInputSpy);
    element.addEventListener('ui-change', uiChangeSpy);
    element.addEventListener('change', nativeChangeSpy);

    const input = element.shadowRoot.querySelector('input');
    input.value = 'test';

    // Simulate input event
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(uiInputSpy).toHaveBeenCalled();
    expect(nativeInputSpy).toHaveBeenCalled();
    expect(uiInputSpy.mock.calls[0][0].detail.value).toBe('test');

    // Simulate change event
    input.dispatchEvent(new Event('change', { bubbles: true }));

    expect(uiChangeSpy).toHaveBeenCalled();
    expect(nativeChangeSpy).toHaveBeenCalled();
    expect(uiChangeSpy.mock.calls[0][0].detail.value).toBe('test');

    expect(element.getAttribute('value')).toBeNull();
  });

  it('should emit ui-input exactly once per input event without duplicate keyup handling', () => {
    const spy = vi.fn();
    element.addEventListener('ui-input', spy);

    const input = element.shadowRoot.querySelector('input');
    input.value = 'a';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { key: 'a', bubbles: true }));

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0].detail.value).toBe('a');
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

  it('should delegate focus and blur to the internal input element', () => {
    const input = element.shadowRoot.querySelector('input');
    const focusSpy = vi.spyOn(input, 'focus');
    const blurSpy = vi.spyOn(input, 'blur');

    element.focus();
    expect(focusSpy).toHaveBeenCalled();

    element.blur();
    expect(blurSpy).toHaveBeenCalled();
  });

  it('deve conter regras de alinhamento e precisão subpixel', () => {
    const css = fs.readFileSync(path.resolve(__dirname, './ui-campo-texto.css'), 'utf-8');
    expect(css).toContain('font-size: var(--ui-tamanho-corpo-sm, 13px);');
    expect(css).toContain('line-height: 1.2;');
    expect(css).toContain('shape-rendering: geometricPrecision;');
  });
});
