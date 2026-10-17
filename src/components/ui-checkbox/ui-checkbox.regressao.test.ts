/**
 * Regressão e robustez de <ui-checkbox> e <ui-switch> (Camada C do AGENTS.md).
 * Os dois compartilham contrato de formulário, foco e rótulo externo.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../ui-checkbox/ui-checkbox';
import '../ui-switch/ui-switch';
import type { UICheckbox } from './ui-checkbox';
import type { UISwitch } from '../ui-switch/ui-switch';

type Controle = UICheckbox | UISwitch;
const CASOS: Array<[string, string, string]> = [
  ['ui-checkbox', 'marcado', '.ui-checkbox'],
  ['ui-switch', 'ativo', '.ui-switch']
];

function criar(tag: string, atributos: Record<string, string> = {}): Controle {
  const el = document.createElement(tag) as Controle;
  Object.entries(atributos).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}
const caixa = (el: Controle, seletor: string) => el.shadowRoot!.querySelector(seletor) as HTMLElement;

afterEach(() => { document.body.innerHTML = ''; });

describe.each(CASOS)('%s', (tag, attrMarcado, seletor) => {
  const estado = (el: Controle) => (el as unknown as Record<string, boolean>)[attrMarcado];

  it('focus() no host foca o controle interno (falhava antes: o foco não ia a lugar nenhum)', () => {
    const el = criar(tag);
    document.body.appendChild(el);
    el.focus();
    expect(el.shadowRoot!.activeElement).toBe(caixa(el, seletor));
  });

  it('alterna por clique, Espaço e Enter, emitindo ui-change e change uma vez cada', () => {
    const el = criar(tag);
    document.body.appendChild(el);
    const ui = vi.fn();
    const nativo = vi.fn();
    el.addEventListener('ui-change', ui);
    el.addEventListener('change', nativo);
    caixa(el, seletor).click();
    expect(estado(el)).toBe(true);
    caixa(el, seletor).dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
    expect(estado(el)).toBe(false);
    caixa(el, seletor).dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(estado(el)).toBe(true);
    expect(ui).toHaveBeenCalledTimes(3);
    expect(nativo).toHaveBeenCalledTimes(3);
  });

  it('desabilitado não alterna, sai da ordem de Tab e informa aria-disabled', () => {
    const el = criar(tag, { disabled: '' });
    document.body.appendChild(el);
    caixa(el, seletor).click();
    expect(estado(el)).toBe(false);
    expect(caixa(el, seletor).getAttribute('tabindex')).toBe('-1');
    expect(caixa(el, seletor).getAttribute('aria-disabled')).toBe('true');
  });

  it('reconectar não duplica os ouvintes: um clique alterna uma vez', () => {
    const el = criar(tag);
    document.body.appendChild(el);
    el.remove();
    document.body.appendChild(el);
    caixa(el, seletor).click();
    expect(estado(el)).toBe(true);
  });

  it('obrigatório desmarcado é inválido (valueMissing) e vira válido ao marcar', () => {
    const el = criar(tag, { obrigatorio: '' });
    document.body.appendChild(el);
    expect(el.checkValidity()).toBe(false);
    expect(el.validity?.valueMissing).toBe(true);
    caixa(el, seletor).click();
    expect(el.checkValidity()).toBe(true);
  });

  it('setCustomValidity tem prioridade e pode ser limpo', () => {
    const el = criar(tag);
    document.body.appendChild(el);
    el.setCustomValidity('Erro do servidor');
    expect(el.validationMessage).toBe('Erro do servidor');
    expect(el.checkValidity()).toBe(false);
    el.setCustomValidity('');
    expect(el.checkValidity()).toBe(true);
  });

  it('formResetCallback volta ao estado inicial declarado', () => {
    const el = criar(tag, { [attrMarcado]: '' });
    document.body.appendChild(el);
    caixa(el, seletor).click();
    expect(estado(el)).toBe(false);
    el.formResetCallback();
    expect(estado(el)).toBe(true);
  });

  it('formStateRestoreCallback aceita string, boolean e ignora lixo', () => {
    const el = criar(tag, { value: 'sim' });
    document.body.appendChild(el);
    el.formStateRestoreCallback('sim', 'restore');
    expect(estado(el)).toBe(true);
    el.formStateRestoreCallback(false, 'restore');
    expect(estado(el)).toBe(false);
    el.formStateRestoreCallback({ x: 1 }, 'restore');
    expect(estado(el)).toBe(false);
  });

  it('label por atributo vira aria-labelledby; é texto, nunca HTML', () => {
    const el = criar(tag, { label: '<img src=x onerror=alert(1)>' });
    document.body.appendChild(el);
    expect(el.shadowRoot!.querySelector('img')).toBeNull();
    expect(caixa(el, seletor).getAttribute('aria-labelledby')).toBeTruthy();
  });

  it('<label for> dá o nome acessível (falhava antes no checkbox)', () => {
    const rotulo = document.createElement('label');
    rotulo.htmlFor = 'ctl';
    rotulo.textContent = 'Aceito os termos';
    const el = criar(tag, { id: 'ctl' });
    document.body.append(rotulo, el);
    (el as unknown as { syncState(): void }).syncState();
    expect(caixa(el, seletor).getAttribute('aria-label')).toBe('Aceito os termos');
  });

  it('<label> envolvente dá o nome e clicar no texto do rótulo alterna (falhava antes no checkbox)', () => {
    const rotulo = document.createElement('label');
    rotulo.append('Receber e-mails ');
    const el = criar(tag);
    rotulo.appendChild(el);
    document.body.appendChild(rotulo);
    (el as unknown as { syncState(): void }).syncState();
    expect(caixa(el, seletor).getAttribute('aria-label')).toBe('Receber e-mails');
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
    expect(estado(el)).toBe(true);
  });

  it('clicar dentro do controle não alterna duas vezes quando há <label> envolvente', () => {
    const rotulo = document.createElement('label');
    const el = criar(tag);
    rotulo.appendChild(el);
    document.body.appendChild(rotulo);
    caixa(el, seletor).click();
    expect(estado(el)).toBe(true);
  });
});

describe('ui-checkbox: indeterminado', () => {
  it('clicar em indeterminado marca e limpa o indeterminado; aria-checked é "mixed" enquanto indeterminado', () => {
    const el = criar('ui-checkbox', { indeterminado: '' }) as UICheckbox;
    document.body.appendChild(el);
    expect(caixa(el, '.ui-checkbox').getAttribute('aria-checked')).toBe('mixed');
    caixa(el, '.ui-checkbox').click();
    expect(el.marcado).toBe(true);
    expect(el.indeterminado).toBe(false);
    expect(caixa(el, '.ui-checkbox').getAttribute('aria-checked')).toBe('true');
  });

  it('formReset restaura marcado e indeterminado iniciais', () => {
    const el = criar('ui-checkbox', { indeterminado: '' }) as UICheckbox;
    document.body.appendChild(el);
    caixa(el, '.ui-checkbox').click();
    el.formResetCallback();
    expect(el.indeterminado).toBe(true);
    expect(el.marcado).toBe(false);
  });
});
