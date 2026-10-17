/**
 * Testes unitários dos módulos extraídos de <ui-tabela> (Fase 6): teclado, rolagem e estados.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { acaoDaTeclaLinha } from './tabela-teclado';
import {
  deslocamentoAteLinha, rolarContainer, RolagemLinhas, TEMPO_LIMITE_ROLAGEM_SUAVE_MS, type PortasRolagem
} from './tabela-rolagem';
import {
  renderizarErroTabela, anunciarResultadoFiltro, sincronizarAriaTabela, TEXTO_ERRO_PADRAO
} from './tabela-estados';

afterEach(() => { vi.useRealTimers(); });

describe('acaoDaTeclaLinha', () => {
  it('setas movem de um em um e respeitam as pontas', () => {
    expect(acaoDaTeclaLinha('ArrowDown', 3, 9, 5)).toEqual({ tipo: 'mover', indice: 4 });
    expect(acaoDaTeclaLinha('ArrowDown', 9, 9, 5)).toEqual({ tipo: 'mover', indice: 9 });
    expect(acaoDaTeclaLinha('ArrowUp', 0, 9, 5)).toEqual({ tipo: 'mover', indice: 0 });
    expect(acaoDaTeclaLinha('ArrowUp', 3, 9, 5)).toEqual({ tipo: 'mover', indice: 2 });
  });

  it('Home, End e páginas', () => {
    expect(acaoDaTeclaLinha('Home', 5, 9, 5)).toEqual({ tipo: 'mover', indice: 0 });
    expect(acaoDaTeclaLinha('End', 5, 9, 5)).toEqual({ tipo: 'mover', indice: 9 });
    expect(acaoDaTeclaLinha('PageDown', 2, 9, 5)).toEqual({ tipo: 'mover', indice: 7 });
    expect(acaoDaTeclaLinha('PageDown', 8, 9, 5)).toEqual({ tipo: 'mover', indice: 9 });
    expect(acaoDaTeclaLinha('PageUp', 2, 9, 5)).toEqual({ tipo: 'mover', indice: 0 });
  });

  it('Enter e Espaço ativam, mesmo sem linhas', () => {
    expect(acaoDaTeclaLinha('Enter', 1, 9, 5)).toEqual({ tipo: 'ativar' });
    expect(acaoDaTeclaLinha(' ', 1, -1, 5)).toEqual({ tipo: 'ativar' });
  });

  it('sem linhas, índice inválido ou tecla desconhecida não geram ação', () => {
    expect(acaoDaTeclaLinha('ArrowDown', 0, -1, 5)).toBeNull();
    expect(acaoDaTeclaLinha('ArrowDown', NaN, 9, 5)).toBeNull();
    expect(acaoDaTeclaLinha('ArrowDown', 1.5, 9, 5)).toBeNull();
    expect(acaoDaTeclaLinha('a', 1, 9, 5)).toBeNull();
    expect(acaoDaTeclaLinha('Tab', 1, 9, 5)).toBeNull();
  });

  it('linhas por página inválidas (0, NaN, negativas) valem 1', () => {
    expect(acaoDaTeclaLinha('PageDown', 2, 9, 0)).toEqual({ tipo: 'mover', indice: 3 });
    expect(acaoDaTeclaLinha('PageDown', 2, 9, NaN)).toEqual({ tipo: 'mover', indice: 3 });
    expect(acaoDaTeclaLinha('PageUp', 2, 9, -4)).toEqual({ tipo: 'mover', indice: 1 });
  });
});

function caixa(top: number, height: number): DOMRect {
  return { top, bottom: top + height, height, left: 0, right: 0, width: 0, x: 0, y: top, toJSON() {} } as DOMRect;
}
function elemento(rect: DOMRect, extras: Record<string, unknown> = {}): HTMLElement {
  const el = document.createElement('div');
  el.getBoundingClientRect = () => rect;
  Object.entries(extras).forEach(([k, v]) => Object.defineProperty(el, k, { value: v, configurable: true, writable: true }));
  return el;
}

describe('deslocamentoAteLinha', () => {
  const container = () => elemento(caixa(100, 300), { clientTop: 0, clientHeight: 300 });

  it('0 quando a linha já está inteira na área útil (abaixo do cabeçalho)', () => {
    expect(deslocamentoAteLinha(container(), elemento(caixa(160, 40)), 40)).toBe(0);
  });

  it('negativo quando a linha está atrás do cabeçalho fixo', () => {
    expect(deslocamentoAteLinha(container(), elemento(caixa(120, 40)), 40)).toBe(-20);
  });

  it('positivo quando a linha passa da base', () => {
    expect(deslocamentoAteLinha(container(), elemento(caixa(380, 40)), 40)).toBe(20);
  });

  it('linha maior que a área alinha pelo topo (sem passar do topo)', () => {
    expect(deslocamentoAteLinha(container(), elemento(caixa(150, 500)), 40)).toBe(10);
  });
});

describe('rolarContainer', () => {
  it('modo auto define scrollTop direto; smooth usa scrollTo quando existe', () => {
    const c = document.createElement('div');
    rolarContainer(c, 120, 'auto');
    expect(c.scrollTop).toBe(120);
    const scrollTo = vi.fn();
    (c as unknown as { scrollTo: unknown }).scrollTo = scrollTo;
    rolarContainer(c, 50, 'smooth');
    expect(scrollTo).toHaveBeenCalledWith({ top: 50, behavior: 'smooth' });
  });

  it('smooth sem scrollTo (ambiente antigo) cai em scrollTop', () => {
    const c = document.createElement('div');
    (c as unknown as { scrollTo: unknown }).scrollTo = undefined;
    rolarContainer(c, 33, 'smooth');
    expect(c.scrollTop).toBe(33);
  });
});

describe('RolagemLinhas', () => {
  function montar(linhasNoDom: number[]) {
    const container = elemento(caixa(0, 200), { clientTop: 0, clientHeight: 200, scrollTop: 0 });
    const tbody = document.createElement('tbody');
    linhasNoDom.forEach((i) => {
      const tr = document.createElement('tr');
      tr.dataset.index = String(i);
      tr.tabIndex = -1;
      tr.getBoundingClientRect = () => caixa(i * 20, 20);
      tbody.appendChild(tr);
    });
    document.body.appendChild(tbody);
    const aoLinhaAtiva = vi.fn();
    const renderizarCorpo = vi.fn();
    const portas: PortasRolagem = {
      container: () => container,
      tbody: () => tbody,
      cabecalho: () => null,
      alturaLinha: () => 20,
      renderizarCorpo,
      aoLinhaAtiva
    };
    return { rolagem: new RolagemLinhas(portas), container, tbody, aoLinhaAtiva, renderizarCorpo };
  }

  afterEach(() => { document.body.innerHTML = ''; });

  it('linhasPorPagina é no mínimo 1, mesmo sem layout', () => {
    const { rolagem } = montar([]);
    expect(rolagem.linhasPorPagina()).toBe(10);
    const semLayout = new RolagemLinhas({
      container: () => null, tbody: () => null, cabecalho: () => null, alturaLinha: () => 20, renderizarCorpo() {}, aoLinhaAtiva() {}
    });
    expect(semLayout.linhasPorPagina()).toBe(1);
  });

  it('focar uma linha presente marca como ativa e foca', () => {
    const { rolagem, tbody, aoLinhaAtiva } = montar([0, 1, 2]);
    rolagem.focar(1);
    expect(aoLinhaAtiva).toHaveBeenCalledWith(1);
    expect(document.activeElement).toBe(tbody.querySelector('tr[data-index="1"]'));
  });

  it('focar uma linha fora da janela renderiza a janela antes', () => {
    const { rolagem, tbody, renderizarCorpo, container } = montar([0, 1]);
    renderizarCorpo.mockImplementation(() => {
      const tr = document.createElement('tr');
      tr.dataset.index = '50';
      tr.tabIndex = -1;
      tr.getBoundingClientRect = () => caixa(50, 20);
      tbody.appendChild(tr);
    });
    rolagem.focar(50);
    expect(renderizarCorpo).toHaveBeenCalled();
    expect(container.scrollTop).toBeGreaterThanOrEqual(0);
    expect(document.activeElement).toBe(tbody.querySelector('tr[data-index="50"]'));
  });

  it('sem container ou tbody nada acontece e posicionar devolve false', () => {
    const vazio = new RolagemLinhas({
      container: () => null, tbody: () => null, cabecalho: () => null, alturaLinha: () => 20, renderizarCorpo() {}, aoLinhaAtiva() {}
    });
    expect(() => vazio.focar(3)).not.toThrow();
    expect(vazio.posicionar(3, 'auto')).toBe(false);
  });

  it('posicionar no modo auto renderiza a janela e corrige a posição', () => {
    const { rolagem, renderizarCorpo, container } = montar([0, 1]);
    expect(rolagem.posicionar(40, 'auto')).toBe(true);
    expect(container.scrollTop).toBe(800);
    expect(renderizarCorpo).toHaveBeenCalledTimes(2);
  });

  it('no modo suave, o tempo limite força a chegada e cancelar não deixa temporizador', () => {
    vi.useFakeTimers();
    const { rolagem, renderizarCorpo } = montar([0, 1]);
    rolagem.posicionar(40, 'smooth');
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(TEMPO_LIMITE_ROLAGEM_SUAVE_MS);
    expect(renderizarCorpo).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    rolagem.posicionar(60, 'smooth');
    rolagem.cancelar();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('uma nova rolagem suave substitui a pendente (um único temporizador)', () => {
    vi.useFakeTimers();
    const { rolagem } = montar([0, 1]);
    rolagem.posicionar(40, 'smooth');
    rolagem.posicionar(50, 'smooth');
    expect(vi.getTimerCount()).toBe(1);
    rolagem.cancelar();
  });
});

describe('tabela-estados', () => {
  const erroEl = () => {
    const el = document.createElement('div');
    el.innerHTML = '<span class="ui-tabela__erro-mensagem"></span><span class="ui-tabela__erro-detalhe"></span><button class="ui-tabela__erro-acao"></button>';
    return el;
  };

  it('erro: mostra mensagem padrão ou configurada, detalhe como texto e a ação só com URL', () => {
    const el = erroEl();
    renderizarErroTabela(el, { erro: '<img src=x onerror=alert(1)>' } as never, null, true);
    expect(el.style.display).toBe('flex');
    expect(el.querySelector('.ui-tabela__erro-mensagem')!.textContent).toBe(TEXTO_ERRO_PADRAO);
    expect(el.querySelector('img')).toBeNull();
    expect((el.querySelector('.ui-tabela__erro-acao') as HTMLElement).style.display).toBe('');

    renderizarErroTabela(el, { erro: 'x' } as never, 'Falhou', false);
    expect(el.querySelector('.ui-tabela__erro-mensagem')!.textContent).toBe('Falhou');
    expect((el.querySelector('.ui-tabela__erro-acao') as HTMLElement).style.display).toBe('none');

    renderizarErroTabela(el, null, null, true);
    expect(el.style.display).toBe('none');
  });

  it('erro: elemento ausente não lança', () => {
    expect(() => renderizarErroTabela(null, null, null, false)).not.toThrow();
  });

  it('anúncio do filtro: singular, plural, zero e sem filtro (limpa)', () => {
    const r = document.createElement('div');
    anunciarResultadoFiltro(r, 1, true, 'nada');
    expect(r.textContent).toBe('1 registro encontrado');
    anunciarResultadoFiltro(r, 7, true, 'nada');
    expect(r.textContent).toBe('7 registros encontrados');
    anunciarResultadoFiltro(r, 0, true, 'nada');
    expect(r.textContent).toBe('nada');
    anunciarResultadoFiltro(r, 7, false, 'nada');
    expect(r.textContent).toBe('');
    expect(() => anunciarResultadoFiltro(null, 1, true, 'x')).not.toThrow();
  });

  it('aria: rótulo vai à tabela e ao contêiner (região); sem rótulo, limpa; aria-busy acompanha', () => {
    const tabela = document.createElement('table');
    const container = document.createElement('div');
    sincronizarAriaTabela({ tabela, container }, 'Lotes', true);
    expect(tabela.getAttribute('aria-label')).toBe('Lotes');
    expect(tabela.getAttribute('aria-busy')).toBe('true');
    expect(container.getAttribute('role')).toBe('region');
    sincronizarAriaTabela({ tabela, container }, null, false);
    expect(tabela.hasAttribute('aria-label')).toBe(false);
    expect(container.hasAttribute('role')).toBe(false);
    expect(tabela.getAttribute('aria-busy')).toBe('false');
    expect(() => sincronizarAriaTabela({ tabela: null, container: null }, 'x', false)).not.toThrow();
  });
});
