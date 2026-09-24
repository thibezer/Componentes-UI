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

  it('should isolate radio groups in separate forms with the same name', () => {
    const form2 = document.createElement('form');
    const radioForm2 = document.createElement('ui-radio') as any;
    radioForm2.setAttribute('name', 'group1');
    radioForm2.setAttribute('value', 'form2_v1');
    form2.appendChild(radioForm2);
    document.body.appendChild(form2);

    radio1.selecionar();
    radioForm2.selecionar();

    expect(radio1.marcado).toBe(true);
    expect(radioForm2.marcado).toBe(true);

    document.body.removeChild(form2);
  });

  it('deve restaurar radio marcado originalmente após reset do formulário', async () => {
    const f = document.createElement('form');
    const r1 = document.createElement('ui-radio') as any;
    r1.setAttribute('name', 'opcao');
    r1.setAttribute('value', 'a');
    r1.setAttribute('marcado', '');

    const r2 = document.createElement('ui-radio') as any;
    r2.setAttribute('name', 'opcao');
    r2.setAttribute('value', 'b');

    f.appendChild(r1);
    f.appendChild(r2);
    document.body.appendChild(f);

    expect(r1.marcado).toBe(true);
    expect(r2.marcado).toBe(false);

    // Usuário seleciona o segundo radio
    r2.selecionar();
    expect(r1.marcado).toBe(false);
    expect(r2.marcado).toBe(true);

    // Reset do formulário
    r1.formResetCallback();
    r2.formResetCallback();

    expect(r1.marcado).toBe(true);
    expect(r2.marcado).toBe(false);

    document.body.removeChild(f);
  });
});
