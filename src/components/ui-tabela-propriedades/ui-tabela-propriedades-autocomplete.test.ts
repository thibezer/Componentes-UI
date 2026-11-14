import { describe, it, expect, beforeEach, vi } from 'vitest';
import './ui-tabela-propriedades';
import { UITabelaPropriedades } from './ui-tabela-propriedades';
import { sugerirEntradas, aplicarEntrada, CATALOGO_EXPRESSAO } from './avaliador-catalogo';
import { avaliarExpressaoMatematica } from './avaliador-expressao';

describe('avaliador-catalogo — lógica pura', () => {
  it('"m" sugere max, min e mod', () => {
    const s = sugerirEntradas('m', 1)!;
    expect(s.entradas.map(e => e.nome)).toEqual(['max', 'min', 'mod']);
    expect([s.inicio, s.fim]).toEqual([0, 1]);
  });

  it('usa só a palavra antes do cursor, depois de operadores', () => {
    const s = sugerirEntradas('=2*(si', 6)!;
    expect(s.entradas.map(e => e.nome)).toEqual(['sign', 'sin']);
    expect(s.inicio).toBe(4);
  });

  it('não sugere em situações sem sentido', () => {
    expect(sugerirEntradas('', 0)).toBeNull();
    expect(sugerirEntradas('12', 2)).toBeNull();
    expect(sugerirEntradas('2e', 2)).toBeNull(); // notação científica
    expect(sugerirEntradas('2x', 2)).toBeNull(); // multiplicação
    expect(sugerirEntradas('max(', 4)).toBeNull();
    expect(sugerirEntradas('pi', 2)).toBeNull(); // constante já completa
    expect(sugerirEntradas('zzz', 3)).toBeNull();
    expect(sugerirEntradas('max(1)', 2)).toBeNull(); // cursor no meio da palavra
    expect(sugerirEntradas('m', NaN)).toBeNull();
    expect(sugerirEntradas(null as unknown as string, 0)).toBeNull();
  });

  it('função completa sem "(" continua sugerindo, para inserir o parêntese', () => {
    expect(sugerirEntradas('max', 3)!.entradas.map(e => e.nome)).toEqual(['max']);
    expect(sugerirEntradas('max(1', 3)).toBeNull(); // cursor no meio de uma palavra seguida de "("? só se "(" vem logo após
  });

  it('aceitar uma função insere "(" e posiciona o cursor depois dela', () => {
    const s = sugerirEntradas('2+m', 3)!;
    const max = s.entradas[0];
    expect(aplicarEntrada('2+m', s, max)).toEqual({ texto: '2+max(', cursor: 6 });
    const p = sugerirEntradas('2*p', 3)!;
    const pi = p.entradas.find(e => e.nome === 'pi')!;
    expect(aplicarEntrada('2*p', p, pi)).toEqual({ texto: '2*pi', cursor: 4 });
  });

  it('todo nome do catálogo é aceito pelo avaliador (catálogo e parser não divergem)', () => {
    for (const e of CATALOGO_EXPRESSAO) {
      if (e.tipo === 'constante') {
        expect(avaliarExpressaoMatematica(e.nome)).not.toBeNull();
      } else {
        // aridade mínima de cada função: 1 argumento, ou 2 para as binárias
        const args = ['atan2', 'hypot', 'mod', 'pow'].includes(e.nome) ? '1; 2' : '1';
        expect(avaliarExpressaoMatematica(`${e.nome}(${args})`), e.nome).not.toBeNull();
      }
    }
  });
});

describe('ui-tabela-propriedades — guia de funções no campo numérico', () => {
  let painel: UITabelaPropriedades;
  let input: HTMLInputElement;

  const digitar = (texto: string) => {
    input.focus();
    input.value = texto;
    input.setSelectionRange(texto.length, texto.length);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const tecla = (key: string) => {
    const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    input.dispatchEvent(ev);
    return ev;
  };
  const lista = () => painel.shadowRoot!.querySelector('.ui-prop__ac');
  const nomes = () => Array.from(painel.shadowRoot!.querySelectorAll('.ui-prop__ac-nome')).map(e => e.textContent);

  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
    painel = document.createElement('ui-tabela-propriedades') as UITabelaPropriedades;
    document.body.appendChild(painel);
    painel.categorias = [{
      id: 'g',
      titulo: 'G',
      propriedades: [
        { id: 'a', rotulo: 'A', tipo: 'numero', valor: 10 },
        { id: 'b', rotulo: 'B', tipo: 'numero', valor: 20 }
      ]
    }];
    input = painel.shadowRoot!.querySelector('[data-prop-id="a"] input') as HTMLInputElement;
  });

  it('digitar "m" abre a lista com max, min e mod e explica a opção ativa', () => {
    digitar('m');
    expect(lista()).not.toBeNull();
    expect(nomes()).toEqual(['max', 'min', 'mod']);
    expect(painel.shadowRoot!.querySelector('.ui-prop__ac-dica')!.textContent).toContain('Maior');
    expect(input.getAttribute('aria-expanded')).toBe('true');
  });

  it('passar o mouse sobre uma opção mostra a explicação dela', () => {
    digitar('m');
    const itens = painel.shadowRoot!.querySelectorAll('.ui-prop__ac-item');
    itens[1].dispatchEvent(new MouseEvent('mouseenter'));
    expect(painel.shadowRoot!.querySelector('.ui-prop__ac-dica')!.textContent).toContain('Menor');
    expect(itens[1].getAttribute('aria-selected')).toBe('true');
    expect(input.getAttribute('aria-activedescendant')).toBe(itens[1].id);
  });

  it('setas navegam, Enter aceita (sem confirmar o campo) e a prévia recalcula', () => {
    digitar('m');
    tecla('ArrowDown');
    const ev = tecla('Enter');
    expect(ev.defaultPrevented).toBe(true);
    expect(input.value).toBe('min(');
    expect(lista()).toBeNull();
    expect(painel.obterValor('a')).toBe(10); // Enter aceitou a sugestão, não confirmou o valor
    expect(input.selectionStart).toBe(4);
  });

  it('clicar numa opção insere a função', () => {
    digitar('2*s');
    (painel.shadowRoot!.querySelectorAll('.ui-prop__ac-item')[2] as HTMLElement).click();
    expect(input.value).toBe('2*sqrt(');
  });

  it('Esc fecha só a lista; o segundo Esc volta ao valor', () => {
    digitar('m');
    tecla('Escape');
    expect(lista()).toBeNull();
    expect(input.value).toBe('m');
    tecla('Escape');
    expect(input.value).toBe('10');
  });

  it('ArrowUp/ArrowDown com a lista aberta não incrementam o número', () => {
    digitar('m');
    tecla('ArrowUp');
    expect(painel.obterValor('a')).toBe(10);
  });

  it('sem a lista, o campo numérico funciona como antes (Enter confirma a conta)', () => {
    digitar('2*(2+5');
    expect(lista()).toBeNull();
    tecla('Enter');
    expect(painel.obterValor('a')).toBe(14);
  });

  it('blur fecha a lista e re-renderizar não deixa lista órfã', () => {
    digitar('m');
    input.dispatchEvent(new Event('blur'));
    expect(lista()).toBeNull();
    digitar('m');
    painel.categorias = painel.categorias;
    expect(lista()).toBeNull();
  });

  it('desconectar o painel remove a lista aberta', () => {
    digitar('m');
    painel.remove();
    expect(painel.shadowRoot!.querySelector('.ui-prop__ac')).toBeNull();
  });

  it('entradas hostis não quebram o campo', () => {
    const erro = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const t of ['(((m', 'm'.repeat(500), 'π', '<img src=x onerror=1>', 'a;b;', '2e', 'x']) {
      expect(() => digitar(t)).not.toThrow();
    }
    expect(erro).not.toHaveBeenCalled();
    erro.mockRestore();
  });
});
