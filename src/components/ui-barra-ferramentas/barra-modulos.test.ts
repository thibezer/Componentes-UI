/**
 * Testes unitários dos módulos extraídos de <ui-ribbon> e <ui-paleta-ferramentas> (Fase 6).
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { acaoDaTeclaAba } from './ribbon-teclado';
import { criarBotaoAba, criarGrupoRibbon, MAX_BOTOES_POR_COLUNA } from './ribbon-render';
import { atalhoBloqueadoPeloContexto, paletaDonaDosAtalhos, resolverAtalho } from './paleta-atalhos';
import {
  PressaoLonga, TEMPO_PRESSAO_LONGA_MS, DISTANCIA_CANCELA_PRESSAO_PX, TEMPO_LIMPA_SUPRESSAO_MS
} from './paleta-pressao-longa';
import type { FerramentaItem, RibbonGrupo } from './tipos';

afterEach(() => { vi.useRealTimers(); });

describe('acaoDaTeclaAba', () => {
  it('setas navegam com volta circular; Home/End vão às pontas', () => {
    expect(acaoDaTeclaAba('ArrowRight', 0, 3, false)).toEqual({ tipo: 'ir-para', indice: 1 });
    expect(acaoDaTeclaAba('ArrowRight', 2, 3, false)).toEqual({ tipo: 'ir-para', indice: 0 });
    expect(acaoDaTeclaAba('ArrowLeft', 0, 3, false)).toEqual({ tipo: 'ir-para', indice: 2 });
    expect(acaoDaTeclaAba('Home', 2, 3, false)).toEqual({ tipo: 'ir-para', indice: 0 });
    expect(acaoDaTeclaAba('End', 0, 3, false)).toEqual({ tipo: 'ir-para', indice: 2 });
  });

  it('em RTL as setas se invertem', () => {
    expect(acaoDaTeclaAba('ArrowLeft', 0, 3, true)).toEqual({ tipo: 'ir-para', indice: 1 });
    expect(acaoDaTeclaAba('ArrowRight', 0, 3, true)).toEqual({ tipo: 'ir-para', indice: 2 });
  });

  it('seta para baixo desce ao painel; outras teclas, foco fora ou lista vazia não geram ação', () => {
    expect(acaoDaTeclaAba('ArrowDown', 1, 3, false)).toEqual({ tipo: 'descer' });
    expect(acaoDaTeclaAba('a', 1, 3, false)).toBeNull();
    expect(acaoDaTeclaAba('ArrowRight', -1, 3, false)).toBeNull();
    expect(acaoDaTeclaAba('ArrowRight', 0, 0, false)).toBeNull();
  });

  it('uma única aba continua nela mesma', () => {
    expect(acaoDaTeclaAba('ArrowRight', 0, 1, false)).toEqual({ tipo: 'ir-para', indice: 0 });
  });
});

describe('ribbon-render', () => {
  it('botão de aba: papel tab, selecionado e roving tabindex; aria-controls só na ativa', () => {
    const ativa = criarBotaoAba({ aba: { id: 'a', rotulo: 'Início', grupos: [] }, ativa: true, idBotao: 'b1', idPainel: 'p' });
    expect(ativa.getAttribute('role')).toBe('tab');
    expect(ativa.getAttribute('aria-selected')).toBe('true');
    expect(ativa.tabIndex).toBe(0);
    expect(ativa.getAttribute('aria-controls')).toBe('p');
    const inativa = criarBotaoAba({ aba: { id: 'b', rotulo: 'X', grupos: [], contextual: true }, ativa: false, idBotao: 'b2', idPainel: 'p' });
    expect(inativa.tabIndex).toBe(-1);
    expect(inativa.hasAttribute('aria-controls')).toBe(false);
    expect(inativa.classList.contains('ui-ribbon__aba--contextual')).toBe(true);
  });

  it('rótulo da aba é texto, nunca HTML', () => {
    const btn = criarBotaoAba({ aba: { id: 'a', rotulo: '<img src=x onerror=alert(1)>', grupos: [] }, ativa: false, idBotao: 'i', idPainel: 'p' });
    expect(btn.querySelector('img')).toBeNull();
  });

  const item = (id: string, extra: Partial<FerramentaItem> = {}): FerramentaItem => ({ id, rotulo: id, ...extra } as FerramentaItem);
  const fabrica = (item: FerramentaItem, variante: string) => {
    const b = document.createElement('button');
    b.dataset.id = item.id;
    b.dataset.variante = variante;
    return b;
  };

  it('grupo: botões pequenos formam colunas de até 3; grandes e separadores quebram a coluna', () => {
    const grupo: RibbonGrupo = {
      id: 'g', rotulo: 'Desenho',
      itens: [item('1'), item('2'), item('3'), item('4'), item('G', { tamanho: 'grande' }), item('5'), item('s', { tipo: 'separador' }), item('6')]
    };
    const el = criarGrupoRibbon(grupo, fabrica as never);
    const colunas = Array.from(el.querySelectorAll('.ui-ribbon__coluna')).map((c) => c.children.length);
    expect(colunas).toEqual([MAX_BOTOES_POR_COLUNA, 1, 1, 1]);
    expect(el.querySelector('[data-variante="grande"]')).not.toBeNull();
    expect(el.querySelector('[role="separator"]')).not.toBeNull();
    expect(el.getAttribute('role')).toBe('group');
    expect(el.getAttribute('aria-label')).toBe('Desenho');
    expect(el.querySelector('.ui-ribbon__grupo-rotulo')!.textContent).toBe('Desenho');
  });

  it('grupo sem itens não lança', () => {
    expect(() => criarGrupoRibbon({ id: 'g', rotulo: 'R', itens: [] }, fabrica as never)).not.toThrow();
  });
});

describe('paleta-atalhos', () => {
  const f = (id: string, atalho?: string, extra: Partial<FerramentaItem> = {}): FerramentaItem => ({ id, rotulo: id, atalho, ...extra } as FerramentaItem);

  it('resolve por letra sem diferenciar caixa e ignora desabilitadas', () => {
    const todas = [f('linha', 'L'), f('ponto', 'p', { disabled: true })];
    expect(resolverAtalho('l', todas, todas, '')?.alvo.id).toBe('linha');
    expect(resolverAtalho('p', todas, todas, '')).toBeNull();
  });

  it('teclas que não são uma letra (Enter, Escape, vazio) não resolvem', () => {
    const todas = [f('linha', 'L')];
    for (const tecla of ['Enter', 'Escape', '', 'ab']) expect(resolverAtalho(tecla, todas, todas, '')).toBeNull();
  });

  it('com várias candidatas, alterna a partir da ativa (circular)', () => {
    const todas = [f('a', 'X'), f('b', 'X'), f('c', 'X')];
    expect(resolverAtalho('x', todas, todas, '')?.alvo.id).toBe('a');
    expect(resolverAtalho('x', todas, todas, 'a')?.alvo.id).toBe('b');
    expect(resolverAtalho('x', todas, todas, 'c')?.alvo.id).toBe('a');
  });

  it('informa o grupo pai quando a ferramenta está dentro de um', () => {
    const filho = f('arco', 'A');
    const grupo = f('curvas', undefined, { filhos: [filho] });
    expect(resolverAtalho('a', [filho], [grupo], '')?.pai?.id).toBe('curvas');
  });

  it('bloqueia em campos de digitação, editáveis, papéis de entrada e modais', () => {
    const input = document.createElement('input');
    const ed = document.createElement('div');
    Object.defineProperty(ed, 'isContentEditable', { value: true });
    const caixa = document.createElement('div');
    caixa.setAttribute('role', 'textbox');
    const modal = document.createElement('div');
    modal.setAttribute('aria-modal', 'true');
    const botao = document.createElement('button');
    expect(atalhoBloqueadoPeloContexto([input])).toBe(true);
    expect(atalhoBloqueadoPeloContexto([ed])).toBe(true);
    expect(atalhoBloqueadoPeloContexto([botao, caixa])).toBe(true);
    expect(atalhoBloqueadoPeloContexto([botao, modal])).toBe(true);
    expect(atalhoBloqueadoPeloContexto([botao, document.body])).toBe(false);
    expect(atalhoBloqueadoPeloContexto([])).toBe(false);
  });
});

describe('PressaoLonga', () => {
  it('dispara após o tempo, uma vez, e suprime o click residual uma única vez', () => {
    vi.useFakeTimers();
    const p = new PressaoLonga();
    const dispara = vi.fn();
    p.iniciar(0, 0, dispara);
    vi.advanceTimersByTime(TEMPO_PRESSAO_LONGA_MS - 1);
    expect(dispara).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(dispara).toHaveBeenCalledTimes(1);
    p.fim();
    expect(p.consumirSupressao()).toBe(true);
    expect(p.consumirSupressao()).toBe(false);
  });

  it('soltar antes do tempo cancela e não suprime o clique', () => {
    vi.useFakeTimers();
    const p = new PressaoLonga();
    const dispara = vi.fn();
    p.iniciar(0, 0, dispara);
    p.fim();
    vi.advanceTimersByTime(TEMPO_PRESSAO_LONGA_MS * 2);
    expect(dispara).not.toHaveBeenCalled();
    expect(p.consumirSupressao()).toBe(false);
  });

  it('mover além do limiar cancela; dentro do limiar, não', () => {
    vi.useFakeTimers();
    const p = new PressaoLonga();
    const dispara = vi.fn();
    p.iniciar(10, 10, dispara);
    p.mover(10 + DISTANCIA_CANCELA_PRESSAO_PX - 1, 10);
    vi.advanceTimersByTime(TEMPO_PRESSAO_LONGA_MS);
    expect(dispara).toHaveBeenCalledTimes(1);

    const q = new PressaoLonga();
    const outra = vi.fn();
    q.iniciar(0, 0, outra);
    q.mover(DISTANCIA_CANCELA_PRESSAO_PX + 1, 0);
    vi.advanceTimersByTime(TEMPO_PRESSAO_LONGA_MS);
    expect(outra).not.toHaveBeenCalled();
  });

  it('a supressão expira sozinha se nenhum click chegar', () => {
    vi.useFakeTimers();
    const p = new PressaoLonga();
    p.iniciar(0, 0, () => {});
    vi.advanceTimersByTime(TEMPO_PRESSAO_LONGA_MS);
    p.fim();
    vi.advanceTimersByTime(TEMPO_LIMPA_SUPRESSAO_MS);
    expect(p.consumirSupressao()).toBe(false);
  });

  it('iniciar de novo reinicia a contagem e destruir não deixa temporizadores', () => {
    vi.useFakeTimers();
    const p = new PressaoLonga();
    const a = vi.fn();
    const b = vi.fn();
    p.iniciar(0, 0, a);
    vi.advanceTimersByTime(TEMPO_PRESSAO_LONGA_MS - 10);
    p.iniciar(0, 0, b);
    vi.advanceTimersByTime(TEMPO_PRESSAO_LONGA_MS - 10);
    expect(a).not.toHaveBeenCalled();
    p.destruir();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(TEMPO_PRESSAO_LONGA_MS);
    expect(b).not.toHaveBeenCalled();
  });
});

describe('porte da 2.8.2 para os módulos', () => {
  const tecla = (key: string, mods: Partial<Record<'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey', boolean>> = {}) => ({
    key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...mods
  });

  it('acaoDaTeclaAba: na ativação manual Enter/Espaço ativam a aba focada; setas seguem só navegando', () => {
    expect(acaoDaTeclaAba('Enter', 1, 3, false, true)).toEqual({ tipo: 'ativar', indice: 1 });
    expect(acaoDaTeclaAba(' ', 2, 3, false, true)).toEqual({ tipo: 'ativar', indice: 2 });
    expect(acaoDaTeclaAba('ArrowRight', 0, 3, false, true)).toEqual({ tipo: 'ir-para', indice: 1 });
    expect(acaoDaTeclaAba('Enter', 1, 3, false)).toBeNull(); // automática: Enter é o clique nativo do botão
    expect(acaoDaTeclaAba('Enter', -1, 3, false, true)).toBeNull();
  });

  it('resolverAtalho com o evento: combinações casam só com os mesmos modificadores', () => {
    const todas: FerramentaItem[] = [
      { id: 'desfazer', rotulo: 'Desfazer', atalho: 'Ctrl+Z' },
      { id: 'zoom', rotulo: 'Zoom', atalho: 'Z' },
      { id: 'vertice', rotulo: 'Vértice', atalho: 'Shift+V' },
      { id: 'sair', rotulo: 'Sair', atalho: 'Esc' }
    ];
    expect(resolverAtalho(tecla('z', { ctrlKey: true }), todas, todas, '')?.alvo.id).toBe('desfazer');
    expect(resolverAtalho(tecla('z', { metaKey: true }), todas, todas, '')?.alvo.id).toBe('desfazer');
    expect(resolverAtalho(tecla('z'), todas, todas, '')?.alvo.id).toBe('zoom');
    expect(resolverAtalho(tecla('V', { shiftKey: true }), todas, todas, '')?.alvo.id).toBe('vertice');
    expect(resolverAtalho(tecla('v'), todas, todas, '')).toBeNull();
    expect(resolverAtalho(tecla('Escape'), todas, todas, '')?.alvo.id).toBe('sair');
    expect(resolverAtalho(tecla(''), todas, todas, '')).toBeNull();
    expect(resolverAtalho('z', todas, todas, '')?.alvo.id).toBe('zoom'); // só a tecla: sem modificadores
  });

  it('paletaDonaDosAtalhos: a que tem o foco, senão a primeira; lista vazia não tem dona', () => {
    expect(paletaDonaDosAtalhos(['a', 'b', 'c'], (p) => p === 'b')).toBe('b');
    expect(paletaDonaDosAtalhos(['a', 'b'], () => false)).toBe('a');
    expect(paletaDonaDosAtalhos([], () => true)).toBeUndefined();
  });

  it('criarGrupoRibbon: colapsado vira um botão com flyout; sem rótulo não gera rótulo vazio; lançador leva o id do grupo', () => {
    const botao = (item: FerramentaItem) => {
      const b = document.createElement('button');
      b.dataset.id = item.id;
      return b;
    };
    const grupo: RibbonGrupo = { id: 'g', rotulo: 'Fonte', itens: [{ id: 'a', rotulo: 'A' }], lancadorDialogo: 'dlg' };

    const colapsado = criarGrupoRibbon(grupo, botao, { colapsado: true });
    expect(colapsado.classList.contains('ui-ribbon__grupo--colapsado')).toBe(true);
    const unico = colapsado.querySelector<HTMLButtonElement>('.ui-ribbon__btn-colapsado')!;
    expect(unico.dataset.grupoColapsado).toBe('g');
    expect(unico.getAttribute('aria-haspopup')).toBe('menu');
    expect(colapsado.querySelector('[data-id="a"]')).toBeNull();

    const normal = criarGrupoRibbon(grupo, botao);
    const lancador = normal.querySelector<HTMLButtonElement>('.ui-ribbon__lancador')!;
    expect(lancador.dataset.lancador).toBe('g');
    expect(lancador.getAttribute('aria-label')).toBe('Mais opções de Fonte');

    const semRotulo = criarGrupoRibbon({ id: 'h', rotulo: '', itens: [{ id: 'b', rotulo: 'B' }] }, botao);
    expect(semRotulo.querySelector('.ui-ribbon__grupo-rotulo')).toBeNull();
  });

  it('criarGrupoRibbon: item dividido com filhos usa criarDividido; sem filhos, o botão comum', () => {
    const comum = vi.fn((item: FerramentaItem) => Object.assign(document.createElement('button'), { className: `comum-${item.id}` }));
    const dividido = vi.fn((item: FerramentaItem) => Object.assign(document.createElement('div'), { className: `split-${item.id}` }));
    const grupo: RibbonGrupo = {
      id: 'g', rotulo: 'G',
      itens: [
        { id: 'x', rotulo: 'X', dividido: true, filhos: [{ id: 'x1', rotulo: 'X1' }] },
        { id: 'y', rotulo: 'Y', dividido: true }
      ]
    };
    const el = criarGrupoRibbon(grupo, comum, { criarDividido: dividido });
    expect(el.querySelector('.split-x')).not.toBeNull();
    expect(el.querySelector('.comum-y')).not.toBeNull();
    expect(dividido).toHaveBeenCalledTimes(1);
  });
});
