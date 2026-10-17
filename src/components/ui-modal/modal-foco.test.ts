import { describe, it, expect, afterEach } from 'vitest';
import { contemFoco, ehFocavel, elementoAtivoProfundo } from './modal-foco';

afterEach(() => { document.body.innerHTML = ''; });

describe('contemFoco', () => {
  it('é verdadeiro para o próprio elemento e para ancestrais', () => {
    const pai = document.createElement('div');
    const filho = document.createElement('button');
    pai.appendChild(filho);
    document.body.appendChild(pai);
    expect(contemFoco(filho, filho)).toBe(true);
    expect(contemFoco(pai, filho)).toBe(true);
    expect(contemFoco(filho, pai)).toBe(false);
  });

  it('sobe pelos hosts de Shadow DOM (foco no botão interno de um componente)', () => {
    const host = document.createElement('div');
    const raiz = host.attachShadow({ mode: 'open' });
    const interno = document.createElement('button');
    raiz.appendChild(interno);
    document.body.appendChild(host);
    expect(contemFoco(host, interno)).toBe(true);
    expect(contemFoco(document.body, interno)).toBe(true);
  });

  it('é falso para nulo e para elementos não relacionados', () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    expect(contemFoco(a, null)).toBe(false);
    expect(contemFoco(a, b)).toBe(false);
  });
});

describe('ehFocavel', () => {
  it('exclui disabled e aria-hidden=true', () => {
    const b = document.createElement('button');
    expect(ehFocavel(b)).toBe(true);
    b.setAttribute('disabled', '');
    expect(ehFocavel(b)).toBe(false);
    const c = document.createElement('button');
    c.setAttribute('aria-hidden', 'true');
    expect(ehFocavel(c)).toBe(false);
  });
});

describe('elementoAtivoProfundo', () => {
  it('atravessa Shadow DOMs até o elemento realmente focado', () => {
    const host = document.createElement('div');
    const raiz = host.attachShadow({ mode: 'open' });
    const interno = document.createElement('button');
    raiz.appendChild(interno);
    document.body.appendChild(host);
    interno.focus();
    expect(elementoAtivoProfundo()).toBe(interno);
  });
});
