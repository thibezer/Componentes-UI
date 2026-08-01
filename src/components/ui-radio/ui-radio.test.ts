import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import './ui-radio';

describe('UIRadio', () => {
  let form: HTMLFormElement;
  let radio1: any;
  let radio2: any;

  beforeEach(() => {
    form = document.createElement('form');

    radio1 = document.createElement('ui-radio');
    radio1.setAttribute('name', 'group1');
    radio1.setAttribute('value', 'v1');

    radio2 = document.createElement('ui-radio');
    radio2.setAttribute('name', 'group1');
    radio2.setAttribute('value', 'v2');

    form.appendChild(radio1);
    form.appendChild(radio2);
    document.body.appendChild(form);
  });

  afterEach(() => {
    if (document.body.contains(form)) {
      document.body.removeChild(form);
    }
  });

  it('should deselect other radios in the same group', () => {
    radio1.selecionar();
    expect(radio1.marcado).toBe(true);
    expect(radio2.marcado).toBe(false);

    radio2.selecionar();
    expect(radio1.marcado).toBe(false);
    expect(radio2.marcado).toBe(true);
  });

  it('should reflect form association and reset', async () => {
    radio1.selecionar();

    let formData = new FormData(form);
    expect(formData.get('group1')).toBe('v1');

    radio2.selecionar();
    formData = new FormData(form);
    expect(formData.get('group1')).toBe('v2');

    form.reset();

    // In Happy DOM and some polyfills, formResetCallback may not fire automatically
    // on form.reset(). We manually trigger the callback for the purpose of the test
    // to verify the logic inside it works as expected.
    if (radio1.formResetCallback) radio1.formResetCallback();
    if (radio2.formResetCallback) radio2.formResetCallback();

    // Some polyfills and custom elements might be slightly asynchronous with reset callbacks
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(radio1.marcado).toBe(false);
    expect(radio2.marcado).toBe(false);

    formData = new FormData(form);
    expect(formData.get('group1')).toBeNull();
  });

  it('should add visual focus states', () => {
    const container = radio1.shadowRoot.querySelector('.ui-radio');
    radio1.containerElement.dispatchEvent(new Event('focus'));
    expect(container.classList.contains('ui-radio--foco')).toBe(true);

    radio1.containerElement.dispatchEvent(new Event('blur'));
    expect(container.classList.contains('ui-radio--foco')).toBe(false);
  });
});
