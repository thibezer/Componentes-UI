/**
 * Preenchimento programático seguro: só campos vazios, com Desfazer (Camadas B/C do AGENTS.md).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import '../components/ui-campo-texto';
import '../components/ui-checkbox';
import { preencherCampos } from './form-preenchimento';

function montar(html: string): HTMLElement {
  const raiz = document.createElement('div');
  raiz.innerHTML = html;
  document.body.appendChild(raiz);
  return raiz;
}
const valor = (raiz: HTMLElement, id: string) => (raiz.querySelector<any>(`#${id}`)).value as string;

afterEach(() => {
  document.body.innerHTML = '';
});

describe('preencherCampos', () => {
  it('preenche campos vazios e não toca nos já preenchidos (conflitos)', () => {
    const raiz = montar('<ui-campo-texto id="nome"></ui-campo-texto><ui-campo-texto id="rg" value="123"></ui-campo-texto>');
    const r = preencherCampos(raiz, { nome: 'Ana', rg: '999' });
    expect(valor(raiz, 'nome')).toBe('Ana');
    expect(valor(raiz, 'rg')).toBe('123');
    expect(r.aplicados).toEqual(['nome']);
    expect(r.conflitos).toEqual(['rg']);
  });

  it('desfazer devolve os valores anteriores e é idempotente', () => {
    const raiz = montar('<ui-campo-texto id="nome"></ui-campo-texto>');
    const r = preencherCampos(raiz, { nome: 'Ana' });
    r.desfazer();
    r.desfazer();
    expect(valor(raiz, 'nome')).toBe('');
  });

  it('substituirConflitos aplica os valores pendentes e o desfazer volta tudo', () => {
    const raiz = montar('<ui-campo-texto id="nome"></ui-campo-texto><ui-campo-texto id="rg" value="123"></ui-campo-texto>');
    const r = preencherCampos(raiz, { nome: 'Ana', rg: '999' });
    r.substituirConflitos();
    expect(valor(raiz, 'rg')).toBe('999');
    r.desfazer();
    expect(valor(raiz, 'nome')).toBe('');
    expect(valor(raiz, 'rg')).toBe('123');
  });

  it('vazioSe permite tratar valores padrão (ex.: "brasileiro(a)") como vazios', () => {
    const raiz = montar('<ui-campo-texto id="nac" value="brasileiro(a)"></ui-campo-texto>');
    const r = preencherCampos(raiz, { nac: 'argentino' }, {
      vazioSe: (chave, atual) => chave === 'nac' ? atual === 'brasileiro(a)' : atual.trim() === ''
    });
    expect(valor(raiz, 'nac')).toBe('argentino');
    expect(r.conflitos).toEqual([]);
  });

  it('somenteVazios=false sobrescreve tudo', () => {
    const raiz = montar('<ui-campo-texto id="rg" value="123"></ui-campo-texto>');
    const r = preencherCampos(raiz, { rg: '999' }, { somenteVazios: false });
    expect(valor(raiz, 'rg')).toBe('999');
    expect(r.aplicados).toEqual(['rg']);
  });

  it('valor novo vazio/nulo nunca apaga o que o usuário digitou', () => {
    const raiz = montar('<ui-campo-texto id="rg" value="123"></ui-campo-texto>');
    const r = preencherCampos(raiz, { rg: '' }, { somenteVazios: false });
    preencherCampos(raiz, { rg: null as unknown as string });
    expect(valor(raiz, 'rg')).toBe('123');
    expect(r.aplicados).toEqual([]);
  });

  it('valor igual ao atual não conta como aplicado nem conflito', () => {
    const raiz = montar('<ui-campo-texto id="rg" value="123"></ui-campo-texto>');
    const r = preencherCampos(raiz, { rg: '123' });
    expect(r.aplicados).toEqual([]);
    expect(r.conflitos).toEqual([]);
  });

  it('chaves sem campo vão para semAlvo; resolve por name ou id', () => {
    const raiz = montar('<ui-campo-texto name="cpf"></ui-campo-texto>');
    const r = preencherCampos(raiz, { cpf: '1', fantasma: 'x' });
    expect(r.aplicados).toEqual(['cpf']);
    expect(r.semAlvo).toEqual(['fantasma']);
  });

  it('suporta checkbox (booleano)', () => {
    const raiz = montar('<input id="chk" type="checkbox">');
    const r = preencherCampos(raiz, { chk: true }, { vazioSe: () => true });
    expect((raiz.querySelector('#chk') as HTMLInputElement).checked).toBe(true);
    r.desfazer();
    expect((raiz.querySelector('#chk') as HTMLInputElement).checked).toBe(false);
  });

  it('dispara ui-campos-preenchidos ao aplicar e ao desfazer', () => {
    const raiz = montar('<ui-campo-texto id="nome"></ui-campo-texto>');
    const ouvinte = vi.fn();
    raiz.addEventListener('ui-campos-preenchidos', ouvinte);
    const r = preencherCampos(raiz, { nome: 'Ana' });
    r.desfazer();
    expect(ouvinte).toHaveBeenCalledTimes(2);
  });

  it('entradas hostis não lançam exceção', () => {
    expect(() => preencherCampos(null as unknown as HTMLElement, { a: 'b' })).not.toThrow();
    const raiz = montar('<ui-campo-texto id="nome"></ui-campo-texto>');
    expect(() => preencherCampos(raiz, null as unknown as Record<string, string>)).not.toThrow();
    expect(() => preencherCampos(raiz, { __proto__: 'x', constructor: 'y', nome: '<b>x</b>' } as any)).not.toThrow();
    expect(valor(raiz, 'nome')).toBe('<b>x</b>');
  });
});
