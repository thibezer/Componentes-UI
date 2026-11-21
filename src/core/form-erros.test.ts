/**
 * Validação inline por campo (Camadas B/C/D do AGENTS.md).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../components/ui-campo-texto';
import { validarCampos, limparErros, observarLimpezaDeErros } from './form-erros';

function montar(html: string): HTMLElement {
  const raiz = document.createElement('form');
  raiz.innerHTML = html;
  document.body.appendChild(raiz);
  return raiz;
}
const campo = (raiz: HTMLElement, id: string) => raiz.querySelector<any>(`#${id}`)!;
const obrigatorio = (v: string) => (v.trim() ? null : 'Informe o nome.');

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('validarCampos', () => {
  it('marca o campo inválido com erro + mensagem-erro e devolve a lista', () => {
    const raiz = montar('<ui-campo-texto id="nome"></ui-campo-texto>');
    const r = validarCampos(raiz, { nome: obrigatorio });
    expect(r.valido).toBe(false);
    expect(r.erros).toHaveLength(1);
    expect(r.erros[0]).toMatchObject({ chave: 'nome', mensagem: 'Informe o nome.' });
    expect(campo(raiz, 'nome').getAttribute('mensagem-erro')).toBe('Informe o nome.');
    expect(campo(raiz, 'nome').hasAttribute('erro')).toBe(true);
  });

  it('o campo exibe o erro com aria-invalid no input interno', () => {
    const raiz = montar('<ui-campo-texto id="nome"></ui-campo-texto>');
    validarCampos(raiz, { nome: obrigatorio });
    expect(campo(raiz, 'nome').shadowRoot.querySelector('input').getAttribute('aria-invalid')).toBe('true');
  });

  it('campo válido não recebe erro e limpa erro anterior', () => {
    const raiz = montar('<ui-campo-texto id="nome" value="Ana"></ui-campo-texto>');
    campo(raiz, 'nome').setAttribute('mensagem-erro', 'antigo');
    campo(raiz, 'nome').setAttribute('erro', '');
    const r = validarCampos(raiz, { nome: obrigatorio });
    expect(r.valido).toBe(true);
    expect(campo(raiz, 'nome').hasAttribute('mensagem-erro')).toBe(false);
    expect(campo(raiz, 'nome').hasAttribute('erro')).toBe(false);
  });

  it('foca o primeiro campo inválido na ordem do DOM', () => {
    const raiz = montar('<ui-campo-texto id="a"></ui-campo-texto><ui-campo-texto id="b"></ui-campo-texto>');
    const focoB = vi.spyOn(campo(raiz, 'b'), 'focus');
    const focoA = vi.spyOn(campo(raiz, 'a'), 'focus');
    validarCampos(raiz, { b: obrigatorio, a: obrigatorio });
    expect(focoA).toHaveBeenCalledTimes(1);
    expect(focoB).not.toHaveBeenCalled();
  });

  it('focarPrimeiro=false não move o foco', () => {
    const raiz = montar('<ui-campo-texto id="a"></ui-campo-texto>');
    const foco = vi.spyOn(campo(raiz, 'a'), 'focus');
    validarCampos(raiz, { a: obrigatorio }, { focarPrimeiro: false });
    expect(foco).not.toHaveBeenCalled();
  });

  it('ignora campos que a aplicação marca como fora de uso (ex.: ocultos)', () => {
    const raiz = montar('<div hidden><ui-campo-texto id="conj"></ui-campo-texto></div>');
    const r = validarCampos(raiz, { conj: obrigatorio }, { ignorar: (el) => el.closest('[hidden]') !== null });
    expect(r.valido).toBe(true);
  });

  it('regra que lança vira erro genérico e não derruba a validação', () => {
    const raiz = montar('<ui-campo-texto id="a"></ui-campo-texto><ui-campo-texto id="b"></ui-campo-texto>');
    const r = validarCampos(raiz, { a: () => { throw new Error('boom'); }, b: obrigatorio });
    expect(r.erros.map((e) => e.chave)).toEqual(['a', 'b']);
  });

  it('regra para chave inexistente é ignorada; entradas hostis não lançam', () => {
    const raiz = montar('<ui-campo-texto id="a"></ui-campo-texto>');
    expect(validarCampos(raiz, { fantasma: obrigatorio }).valido).toBe(true);
    expect(() => validarCampos(null as unknown as HTMLElement, { a: obrigatorio })).not.toThrow();
    expect(() => validarCampos(raiz, null as unknown as Record<string, never>)).not.toThrow();
  });

  it('mensagem com HTML é tratada como texto (atributo), nunca como marcação', () => {
    const raiz = montar('<ui-campo-texto id="a"></ui-campo-texto>');
    validarCampos(raiz, { a: () => '<img src=x onerror=alert(1)>' });
    const helper = campo(raiz, 'a').shadowRoot.querySelector('.ui-campo-texto__helper');
    expect(helper.querySelector('img')).toBeNull();
  });
});

describe('limparErros / observarLimpezaDeErros', () => {
  it('limparErros remove erro de todos os campos', () => {
    const raiz = montar('<ui-campo-texto id="a"></ui-campo-texto><ui-campo-texto id="b"></ui-campo-texto>');
    validarCampos(raiz, { a: obrigatorio, b: obrigatorio });
    limparErros(raiz);
    expect(raiz.querySelectorAll('[mensagem-erro], [erro]')).toHaveLength(0);
  });

  it('o erro some do campo ao digitar nele, sem afetar os outros', () => {
    const raiz = montar('<ui-campo-texto id="a"></ui-campo-texto><ui-campo-texto id="b"></ui-campo-texto>');
    const parar = observarLimpezaDeErros(raiz);
    validarCampos(raiz, { a: obrigatorio, b: obrigatorio });
    campo(raiz, 'a').value = 'x';
    campo(raiz, 'a').dispatchEvent(new CustomEvent('ui-input', { bubbles: true, composed: true }));
    expect(campo(raiz, 'a').hasAttribute('mensagem-erro')).toBe(false);
    expect(campo(raiz, 'b').hasAttribute('mensagem-erro')).toBe(true);
    parar();
  });

  it('parar remove o ouvinte', () => {
    const raiz = montar('<ui-campo-texto id="a"></ui-campo-texto>');
    const parar = observarLimpezaDeErros(raiz);
    validarCampos(raiz, { a: obrigatorio });
    parar();
    campo(raiz, 'a').dispatchEvent(new CustomEvent('ui-input', { bubbles: true, composed: true }));
    expect(campo(raiz, 'a').hasAttribute('mensagem-erro')).toBe(true);
  });
});
