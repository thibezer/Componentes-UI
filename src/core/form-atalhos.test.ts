/**
 * Atalhos de formulário: Ctrl/Cmd+S salva e Esc cancela (Camadas B/C/D do AGENTS.md).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../components/ui-campo-texto';
import { ligarAtalhosFormulario } from './form-atalhos';

function montar(): HTMLElement {
  const raiz = document.createElement('form');
  raiz.innerHTML = '<ui-campo-texto id="nome"></ui-campo-texto><button id="b" type="button">x</button>';
  document.body.appendChild(raiz);
  return raiz;
}
const tecla = (alvo: EventTarget, key: string, init: KeyboardEventInit = {}) => {
  const e = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true, ...init });
  alvo.dispatchEvent(e);
  return e;
};

afterEach(() => {
  document.body.innerHTML = '';
});

describe('ligarAtalhosFormulario', () => {
  it('Ctrl+S e Cmd+S chamam salvar e bloqueiam o "salvar página" do navegador', () => {
    const raiz = montar();
    const salvar = vi.fn();
    ligarAtalhosFormulario(raiz, { salvar });
    const e1 = tecla(raiz.querySelector('#b')!, 's', { ctrlKey: true });
    const e2 = tecla(raiz.querySelector('#b')!, 'S', { metaKey: true });
    expect(salvar).toHaveBeenCalledTimes(2);
    expect(e1.defaultPrevented).toBe(true);
    expect(e2.defaultPrevented).toBe(true);
  });

  it('Ctrl+S funciona com o foco dentro de um campo de texto (input no shadow)', () => {
    const raiz = montar();
    const salvar = vi.fn();
    ligarAtalhosFormulario(raiz, { salvar });
    const input = raiz.querySelector('ui-campo-texto')!.shadowRoot!.querySelector('input')!;
    tecla(input, 's', { ctrlKey: true });
    expect(salvar).toHaveBeenCalledTimes(1);
  });

  it('"s" sozinho, Ctrl+Shift+S e Ctrl+Alt+S não disparam', () => {
    const raiz = montar();
    const salvar = vi.fn();
    ligarAtalhosFormulario(raiz, { salvar });
    tecla(raiz, 's');
    tecla(raiz, 's', { ctrlKey: true, shiftKey: true });
    tecla(raiz, 's', { ctrlKey: true, altKey: true });
    expect(salvar).not.toHaveBeenCalled();
  });

  it('Esc chama cancelar', () => {
    const raiz = montar();
    const cancelar = vi.fn();
    ligarAtalhosFormulario(raiz, { cancelar });
    tecla(raiz.querySelector('#b')!, 'Escape');
    expect(cancelar).toHaveBeenCalledTimes(1);
  });

  it('Esc já tratado por um filho (ex.: lista aberta fechando) não cancela o formulário', () => {
    const raiz = montar();
    const cancelar = vi.fn();
    ligarAtalhosFormulario(raiz, { cancelar });
    raiz.querySelector('#b')!.addEventListener('keydown', (e) => e.preventDefault());
    tecla(raiz.querySelector('#b')!, 'Escape');
    expect(cancelar).not.toHaveBeenCalled();
  });

  it('Esc durante composição de texto (IME) é ignorado', () => {
    const raiz = montar();
    const cancelar = vi.fn();
    ligarAtalhosFormulario(raiz, { cancelar });
    tecla(raiz, 'Escape', { isComposing: true });
    expect(cancelar).not.toHaveBeenCalled();
  });

  it('Esc com modificador não cancela', () => {
    const raiz = montar();
    const cancelar = vi.fn();
    ligarAtalhosFormulario(raiz, { cancelar });
    tecla(raiz, 'Escape', { shiftKey: true });
    expect(cancelar).not.toHaveBeenCalled();
  });

  it('opções ausentes não bloqueiam as teclas do navegador', () => {
    const raiz = montar();
    ligarAtalhosFormulario(raiz, {});
    expect(tecla(raiz, 's', { ctrlKey: true }).defaultPrevented).toBe(false);
    expect(tecla(raiz, 'Escape').defaultPrevented).toBe(false);
  });

  it('o retorno remove os ouvintes (sem vazamento) e é idempotente', () => {
    const raiz = montar();
    const salvar = vi.fn();
    const parar = ligarAtalhosFormulario(raiz, { salvar });
    parar();
    parar();
    tecla(raiz, 's', { ctrlKey: true });
    expect(salvar).not.toHaveBeenCalled();
  });

  it('exceção do handler do consumidor não derruba o evento', () => {
    const raiz = montar();
    ligarAtalhosFormulario(raiz, { salvar: () => { throw new Error('falhou'); } });
    expect(() => tecla(raiz, 's', { ctrlKey: true })).not.toThrow();
  });

  it('entradas hostis: raiz nula devolve função inócua', () => {
    expect(() => ligarAtalhosFormulario(null, { salvar: () => {} })()).not.toThrow();
  });
});
