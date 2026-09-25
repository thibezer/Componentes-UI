import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './ui-lista-flutuante';

describe('UIListaFlutuante', () => {
  let element: any;

  beforeEach(() => {
    element = document.createElement('ui-lista-flutuante');
    document.body.appendChild(element);
  });

  afterEach(() => {
    if (document.body.contains(element)) document.body.removeChild(element);
  });

  it('should re-render list when dynamic options are added', async () => {
    const opt1 = document.createElement('option');
    opt1.value = '1';
    opt1.textContent = 'Option 1';

    element.appendChild(opt1);

    // Wait for mutation observer
    await new Promise(r => setTimeout(r, 50));

    const items = element.shadowRoot.querySelectorAll('li');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toBe('Option 1');
  });

  it('should navigate and select with keyboard', () => {
    const opt1 = document.createElement('option');
    opt1.value = 'val1';
    opt1.textContent = 'Val 1';

    const opt2 = document.createElement('option');
    opt2.value = 'val2';
    opt2.textContent = 'Val 2';

    element.appendChild(opt1);
    element.appendChild(opt2);

    // Call manually since mutation observer is async
    element.carregarItensFilhos();

    // Open the list via keyboard on button
    element.button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(element.hasAttribute('aberta')).toBe(true);

    // Focus first item manually
    element.button.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    // Select the currently focused item (which should be index 0)
    element.content.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(element.value).toBe('val1');
    expect(element.hasAttribute('aberta')).toBe(false);
  });

  it('should support ElementInternals and dispatch standard change and input events', () => {
    const form = document.createElement('form');
    const field = document.createElement('ui-lista-flutuante') as any;
    field.setAttribute('name', 'testList');

    const changeSpy = vi.fn();
    const inputSpy = vi.fn();
    const uiSelecionarSpy = vi.fn();

    field.addEventListener('change', changeSpy);
    field.addEventListener('input', inputSpy);
    field.addEventListener('ui-selecionar', uiSelecionarSpy);

    const opt1 = document.createElement('option');
    opt1.value = 'selectedVal';
    opt1.textContent = 'Selected Label';
    field.appendChild(opt1);

    form.appendChild(field);
    document.body.appendChild(form);

    field.carregarItensFilhos();
    field.selecionarItem({ id: 'selectedVal', label: 'Selected Label' });

    expect(uiSelecionarSpy).toHaveBeenCalled();
    expect(changeSpy).toHaveBeenCalled();
    expect(inputSpy).toHaveBeenCalled();

    const formData = new FormData(form);
    expect(formData.get('testList')).toBe('selectedVal');

    document.body.removeChild(form);
  });
});
