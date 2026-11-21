/**
 * Rascunho de formulário: detecção de alterações não salvas (Camadas B/C/D do AGENTS.md).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../components/ui-campo-texto';
import '../components/ui-lista-flutuante';
import '../components/ui-checkbox';
import { criarRascunhoFormulario } from './form-rascunho';

function montar(html: string): HTMLElement {
  const raiz = document.createElement('form');
  raiz.innerHTML = html;
  document.body.appendChild(raiz);
  return raiz;
}
const campo = (raiz: HTMLElement, id: string) => raiz.querySelector<any>(`#${id}`)!;
const digitar = (el: any, valor: string) => {
  el.value = valor;
  el.dispatchEvent(new CustomEvent('ui-input', { bubbles: true, composed: true, detail: { value: valor } }));
};

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('criarRascunhoFormulario', () => {
  it('começa limpo e fica sujo ao digitar num campo', () => {
    const raiz = montar('<ui-campo-texto id="nome" value="Ana"></ui-campo-texto>');
    const r = criarRascunhoFormulario(raiz);
    expect(r.sujo).toBe(false);
    digitar(campo(raiz, 'nome'), 'Ana Maria');
    expect(r.sujo).toBe(true);
  });

  it('voltar ao valor original deixa o rascunho limpo de novo', () => {
    const raiz = montar('<ui-campo-texto id="nome" value="Ana"></ui-campo-texto>');
    const r = criarRascunhoFormulario(raiz);
    digitar(campo(raiz, 'nome'), 'Ana Maria');
    digitar(campo(raiz, 'nome'), 'Ana');
    expect(r.sujo).toBe(false);
  });

  it('marcarLimpo adota o estado atual como nova linha de base', () => {
    const raiz = montar('<ui-campo-texto id="nome"></ui-campo-texto>');
    const r = criarRascunhoFormulario(raiz);
    digitar(campo(raiz, 'nome'), 'Bia');
    expect(r.sujo).toBe(true);
    r.marcarLimpo();
    expect(r.sujo).toBe(false);
    digitar(campo(raiz, 'nome'), 'Bianca');
    expect(r.sujo).toBe(true);
  });

  it('avisa aoMudar só quando o estado sujo muda', () => {
    const raiz = montar('<ui-campo-texto id="nome"></ui-campo-texto>');
    const aoMudar = vi.fn();
    criarRascunhoFormulario(raiz, { aoMudar });
    digitar(campo(raiz, 'nome'), 'a');
    digitar(campo(raiz, 'nome'), 'ab');
    digitar(campo(raiz, 'nome'), '');
    expect(aoMudar.mock.calls.map((c) => c[0])).toEqual([true, false]);
  });

  it('enxerga checkbox, select nativo e ui-lista-flutuante', () => {
    const raiz = montar(`
      <input id="chk" type="checkbox" checked>
      <select id="sel"><option value="a" selected>A</option><option value="b">B</option></select>
      <ui-checkbox id="uic"></ui-checkbox>`);
    const r = criarRascunhoFormulario(raiz);
    campo(raiz, 'chk').checked = false;
    campo(raiz, 'chk').dispatchEvent(new Event('change', { bubbles: true }));
    expect(r.sujo).toBe(true);
    r.marcarLimpo();
    campo(raiz, 'sel').value = 'b';
    campo(raiz, 'sel').dispatchEvent(new Event('change', { bubbles: true }));
    expect(r.sujo).toBe(true);
  });

  it('inclui o estado externo (listas dinâmicas) na comparação', () => {
    const raiz = montar('<ui-campo-texto id="nome"></ui-campo-texto>');
    let lista: string[] = [];
    const r = criarRascunhoFormulario(raiz, { estadoExterno: () => lista });
    lista = ['coproprietário'];
    expect(r.avaliar()).toBe(true);
    r.marcarLimpo();
    expect(r.sujo).toBe(false);
  });

  it('ignora input de arquivo e campos ocultos (type=hidden)', () => {
    const raiz = montar('<input id="arq" type="file"><input id="oculto" type="hidden" value="1">');
    const r = criarRascunhoFormulario(raiz);
    campo(raiz, 'oculto').value = '2';
    expect(r.avaliar()).toBe(false);
  });

  it('reage ao evento ui-campos-preenchidos (preenchimento programático)', () => {
    const raiz = montar('<ui-campo-texto id="nome"></ui-campo-texto>');
    const r = criarRascunhoFormulario(raiz);
    campo(raiz, 'nome').value = 'Preenchido';
    raiz.dispatchEvent(new CustomEvent('ui-campos-preenchidos', { bubbles: true }));
    expect(r.sujo).toBe(true);
  });

  it('destruir remove os ouvintes (sem vazamento) e é idempotente', () => {
    const raiz = montar('<ui-campo-texto id="nome"></ui-campo-texto>');
    const aoMudar = vi.fn();
    const r = criarRascunhoFormulario(raiz, { aoMudar });
    r.destruir();
    r.destruir();
    digitar(campo(raiz, 'nome'), 'x');
    expect(aoMudar).not.toHaveBeenCalled();
  });

  it('é resistente a entradas hostis: raiz nula, estadoExterno que lança, seletor inválido', () => {
    expect(() => criarRascunhoFormulario(null as unknown as HTMLElement)).not.toThrow();
    const raiz = montar('<ui-campo-texto id="nome"></ui-campo-texto>');
    const r = criarRascunhoFormulario(raiz, {
      estadoExterno: () => { throw new Error('falhou'); },
      seletor: '###invalido'
    });
    expect(() => r.avaliar()).not.toThrow();
    expect(r.sujo).toBe(false);
  });

  it('campos sem name/id continuam diferenciados pela posição', () => {
    const raiz = montar('<input><input>');
    const r = criarRascunhoFormulario(raiz);
    const [a] = Array.from(raiz.querySelectorAll('input'));
    a.value = 'x';
    a.dispatchEvent(new Event('input', { bubbles: true }));
    expect(r.sujo).toBe(true);
  });
});
