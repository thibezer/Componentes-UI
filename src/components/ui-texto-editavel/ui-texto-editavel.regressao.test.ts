import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import './index';
import type { UITextoEditavel } from './ui-texto-editavel';

describe('<ui-texto-editavel> (Regressão & Robustez Adversarial)', () => {
  let el: UITextoEditavel;

  beforeEach(() => {
    el = document.createElement('ui-texto-editavel') as UITextoEditavel;
    document.body.appendChild(el);
  });

  afterEach(() => {
    if (el && el.parentNode) {
      el.parentNode.removeChild(el);
    }
  });

  it('não deve interpretar nem injetar tags HTML maliciosas como HTML (Prevenção XSS)', () => {
    const payloadXss = '<img src="x" onerror="alert(1)"><b>Ataque</b>';
    el.valor = payloadXss;

    const shadow = el.shadowRoot!;
    const texto = shadow.querySelector('.ui-texto-editavel__texto') as HTMLSpanElement;

    expect(texto.children.length).toBe(0);
    expect(texto.textContent).toBe(payloadXss);
    expect(shadow.querySelector('img')).toBeNull();
    expect(shadow.querySelector('b')).toBeNull();
  });

  it('deve tolerar múltiplos duplo cliques rápidos sem duplicar modo de edição ou quebrar estado', () => {
    el.valor = 'Teste Reentrância';
    const shadow = el.shadowRoot!;
    const botao = shadow.querySelector('.ui-texto-editavel__botao') as HTMLButtonElement;

    const spyModo = vi.fn();
    el.addEventListener('ui-modo-alterado', spyModo);

    // Dispara 5 duplo cliques consecutivos
    for (let i = 0; i < 5; i++) {
      botao.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    }

    expect(el.estaEditando()).toBe(true);
    // Deve ter disparado a mudança para edição apenas uma vez
    expect(spyModo).toHaveBeenCalledTimes(1);
  });

  it('deve lidar graciosamente com reconexão rápida no DOM sem duplicar listeners', () => {
    el.valor = 'Persistente';

    // Desconecta e reconecta rapidamente
    document.body.removeChild(el);
    document.body.appendChild(el);

    const shadow = el.shadowRoot!;
    const botao = shadow.querySelector('.ui-texto-editavel__botao') as HTMLButtonElement;

    const spyModo = vi.fn();
    el.addEventListener('ui-modo-alterado', spyModo);

    botao.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

    expect(el.estaEditando()).toBe(true);
    expect(spyModo).toHaveBeenCalledTimes(1);
  });

  it('deve lidar com valores null, undefined e números sem estourar exceções', () => {
    expect(() => {
      // @ts-expect-error teste de entrada hostil
      el.valor = null;
      // @ts-expect-error teste de entrada hostil
      el.valor = undefined;
      // @ts-expect-error teste de entrada hostil
      el.valor = 12345;
    }).not.toThrow();

    expect(el.valor).toBe('12345');
  });

  it('deve respeitar atributo maxlength no input interno', () => {
    el.setAttribute('maxlength', '10');
    el.editar();

    const shadow = el.shadowRoot!;
    const input = shadow.querySelector('.ui-texto-editavel__input') as HTMLInputElement;

    expect(input.maxLength).toBe(10);
  });

  it('não deve emitir ui-salvar se o valor permanecer inalterado ao dar Enter', () => {
    el.valor = 'Mesmo Valor';
    el.editar();

    const spySalvar = vi.fn();
    el.addEventListener('ui-salvar', spySalvar);

    const shadow = el.shadowRoot!;
    const input = shadow.querySelector('.ui-texto-editavel__input') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(el.estaEditando()).toBe(false);
    expect(spySalvar).not.toHaveBeenCalled();
  });
});
