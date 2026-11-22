import { describe, it, expect, vi, afterEach } from 'vitest';
import './ui-tabela';
import type { UITabela } from './ui-tabela';
import type { TabelaColuna, UISelecaoAlteradaDetail } from './tipos';

function criarTabela(colunas: TabelaColuna[], dados: Record<string, any>[], attrs: Record<string, string> = {}): UITabela {
  const el = document.createElement('ui-tabela') as UITabela;
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  el.colunas = colunas;
  el.dados = dados;
  document.body.appendChild(el);
  return el;
}

describe('ui-tabela: evoluções (seleção cirúrgica, múltipla, sticky/oculta, sombras de scroll)', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('1. Atualização cirúrgica de seleção', () => {
    it('não percorre todas as linhas do tbody com querySelectorAll ao trocar seleção', () => {
      const cols: TabelaColuna[] = [{ id: 'id', rotulo: 'ID' }, { id: 'nome', rotulo: 'Nome' }];
      const dados = Array.from({ length: 10 }, (_, i) => ({ id: i + 1, nome: `Item ${i + 1}` }));
      const tabela = criarTabela(cols, dados);
      const tbody = tabela.shadowRoot!.querySelector('tbody')!;

      const linhas = tbody.querySelectorAll<HTMLTableRowElement>('tr[data-index]');
      linhas[1].click();
      expect(linhas[1].getAttribute('data-selecionada')).toBe('true');

      const spyQSA = vi.spyOn(tbody, 'querySelectorAll');
      linhas[4].click();

      expect(spyQSA).not.toHaveBeenCalled();
      expect(linhas[1].getAttribute('data-selecionada')).toBeNull();
      expect(linhas[1].getAttribute('aria-current')).toBeNull();
      expect(linhas[1].getAttribute('aria-selected')).toBe('false');
      expect(linhas[1].classList.contains('ui-tabela__tr--selecionada')).toBe(false);
      expect(linhas[1].getAttribute('part')).not.toContain('linha-selecionada');

      expect(linhas[4].getAttribute('data-selecionada')).toBe('true');
      expect(linhas[4].getAttribute('aria-current')).toBe('true');
      expect(linhas[4].getAttribute('aria-selected')).toBe('true');
      expect(linhas[4].classList.contains('ui-tabela__tr--selecionada')).toBe(true);
      expect(linhas[4].getAttribute('part')).toContain('linha-selecionada');
    });

    it('desmarca corretamente linha que já nasceu selecionada no renderBody()', () => {
      const cols: TabelaColuna[] = [{ id: 'id', rotulo: 'ID' }];
      const dados = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const tabela = criarTabela(cols, dados);
      tabela.indiceSelecionado = 0;
      tabela.renderBody();

      const tbody = tabela.shadowRoot!.querySelector('tbody')!;
      const linhas = tbody.querySelectorAll<HTMLTableRowElement>('tr[data-index]');
      expect(linhas[0].getAttribute('data-selecionada')).toBe('true');

      const spyQSA = vi.spyOn(tbody, 'querySelectorAll');
      tabela.indiceSelecionado = 2;

      expect(spyQSA).not.toHaveBeenCalled();
      expect(linhas[0].getAttribute('data-selecionada')).toBeNull();
      expect(linhas[2].getAttribute('data-selecionada')).toBe('true');
    });
  });

  describe('2. Seleção múltipla (selecao="unica" | "multipla")', () => {
    const cols: TabelaColuna[] = [
      { id: 'id', rotulo: 'ID', ordenavel: true },
      { id: 'nome', rotulo: 'Nome', ordenavel: true }
    ];
    const dadosBase = [
      { id: 1, nome: 'Carlos' },
      { id: 2, nome: 'Ana' },
      { id: 3, nome: 'Bruno' },
      { id: 4, nome: 'Diana' }
    ];

    it('mantém modo unica como padrão e define aria-multiselectable adequadamente', () => {
      const tabela = criarTabela(cols, dadosBase);
      const table = tabela.shadowRoot!.querySelector('table')!;
      expect(tabela.selecao).toBe('unica');
      expect(table.getAttribute('aria-multiselectable')).toBe('false');

      tabela.selecao = 'multipla';
      expect(tabela.getAttribute('selecao')).toBe('multipla');
      expect(table.getAttribute('aria-multiselectable')).toBe('true');
    });

    it('alterna seleção ao clicar no modo multipla e emite ui-selecao-alterada', () => {
      const tabela = criarTabela(cols, dadosBase, { selecao: 'multipla' });
      const eventos: UISelecaoAlteradaDetail[] = [];
      tabela.addEventListener('ui-selecao-alterada', (e) => {
        eventos.push((e as CustomEvent<UISelecaoAlteradaDetail>).detail);
      });

      const linhas = tabela.shadowRoot!.querySelectorAll<HTMLTableRowElement>('tbody tr[data-index]');
      linhas[0].click();
      linhas[2].click();

      expect(tabela.itensSelecionados).toEqual([dadosBase[0], dadosBase[2]]);
      expect(tabela.indicesSelecionados).toEqual([0, 2]);
      expect(linhas[0].getAttribute('data-selecionada')).toBe('true');
      expect(linhas[2].getAttribute('data-selecionada')).toBe('true');
      expect(eventos[1]).toEqual({
        itens: [dadosBase[0], dadosBase[2]],
        indices: [0, 2],
        modo: 'multipla'
      });

      // Toggle off
      linhas[0].click();
      expect(tabela.itensSelecionados).toEqual([dadosBase[2]]);
      expect(tabela.indicesSelecionados).toEqual([2]);
      expect(linhas[0].getAttribute('data-selecionada')).toBeNull();
    });

    it('suporta selecionarTodos() e limparSelecao()', () => {
      const tabela = criarTabela(cols, dadosBase, { selecao: 'multipla' });
      tabela.selecionarTodos();
      expect(tabela.itensSelecionados).toHaveLength(4);
      expect(tabela.indicesSelecionados).toEqual([0, 1, 2, 3]);

      tabela.limparSelecao();
      expect(tabela.itensSelecionados).toEqual([]);
      expect(tabela.indicesSelecionados).toEqual([]);

      // Em modo unica, selecionarTodos() não deve selecionar múltiplos
      tabela.selecao = 'unica';
      tabela.selecionarTodos();
      expect(tabela.itensSelecionados).toEqual([]);
    });

    it('respeita filtro ativo no selecionarTodos() e reconcilia seleção ao filtrar/ordenar/trocar dados', () => {
      const tabela = criarTabela(cols, dadosBase, { selecao: 'multipla' });
      tabela.indicesSelecionados = [0, 1]; // Carlos (id 1) e Ana (id 2)

      // Filtrar por "Ana" -> apenas Ana exibida, Carlos oculto pelo filtro
      tabela.filtrar('Ana');
      expect(tabela.indicesSelecionados).toEqual([0]);
      expect(tabela.itensSelecionados).toHaveLength(2); // Carlos continua selecionado em memória

      // Limpar filtro -> Carlos e Ana voltam com índices corretos
      tabela.filtrar('');
      expect(tabela.indicesSelecionados).toEqual([0, 1]);

      // Ordenar por nome asc -> Ana (0), Bruno (1), Carlos (2), Diana (3)
      tabela.colunaOrdenada = 'nome';
      expect(tabela.indicesSelecionados).toEqual([2, 0]);

      // Trocar dados mantendo apenas id 2 (novo objeto) e removendo id 1
      const removidos: any[] = [];
      tabela.addEventListener('ui-selecao-removida', (e) => {
        removidos.push((e as CustomEvent).detail.item);
      });
      tabela.dados = [{ id: 2, nome: 'Ana Atualizada' }, { id: 5, nome: 'Eva' }];
      expect(tabela.itensSelecionados).toEqual([{ id: 2, nome: 'Ana Atualizada' }]);
      expect(removidos).toEqual([dadosBase[0]]);
    });

    it('reduz para no máximo 1 item ao trocar de multipla para unica', () => {
      const tabela = criarTabela(cols, dadosBase, { selecao: 'multipla' });
      tabela.indicesSelecionados = [1, 3];
      tabela.selecao = 'unica';
      expect(tabela.itensSelecionados).toEqual([dadosBase[1]]);
      expect(tabela.itemSelecionado).toEqual(dadosBase[1]);
    });

    it('navegação por teclado (Space, Enter, Escape) funciona em seleção múltipla', () => {
      const tabela = criarTabela(cols, dadosBase, { selecao: 'multipla' });
      const linhas = tabela.shadowRoot!.querySelectorAll<HTMLTableRowElement>('tbody tr[data-index]');

      linhas[0].dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      linhas[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      expect(tabela.indicesSelecionados).toEqual([0, 2]);

      linhas[2].dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      expect(tabela.indicesSelecionados).toEqual([]);
    });

    it('mantém seleção múltipla compatível com virtualização', () => {
      const muitosDados = Array.from({ length: 100 }, (_, i) => ({ id: i + 1, nome: `Item ${i + 1}` }));
      const tabela = criarTabela(cols, muitosDados, { selecao: 'multipla', 'max-height': '200px' });

      tabela.selecionarTodos();
      expect(tabela.itensSelecionados).toHaveLength(100);

      // Rola até o índice 80 e força atualização da janela virtual
      tabela.rolarParaIndice(80, { comportamento: 'auto' });
      const container = tabela.shadowRoot!.querySelector('.ui-tabela-container') as HTMLDivElement;
      Object.defineProperty(container, 'scrollTop', { value: 80 * 42, configurable: true });
      tabela.renderBody('rolagem');

      const linha80 = tabela.shadowRoot!.querySelector<HTMLTableRowElement>('tbody tr[data-index="80"]');
      expect(linha80).not.toBeNull();
      expect(linha80!.getAttribute('data-selecionada')).toBe('true');
      expect(linha80!.classList.contains('ui-tabela__tr--selecionada')).toBe(true);
    });
  });

  describe('3. Colunas fixas (sticky) e ocultação de colunas (oculta)', () => {
    it('não renderiza colunas ocultas no colgroup, thead ou tbody e exclui do filtro', () => {
      const cols: TabelaColuna[] = [
        { id: 'id', rotulo: 'ID', largura: 60 },
        { id: 'segredo', rotulo: 'Segredo', oculta: true },
        { id: 'nome', rotulo: 'Nome', largura: 150 }
      ];
      const dados = [
        { id: 1, segredo: 'chave-oculta', nome: 'Alice' },
        { id: 2, segredo: 'outra', nome: 'Bob' }
      ];
      const tabela = criarTabela(cols, dados);

      const table = tabela.shadowRoot!.querySelector('table')!;
      const colEls = tabela.shadowRoot!.querySelectorAll('colgroup col');
      const ths = tabela.shadowRoot!.querySelectorAll('thead th');
      const tdsLinha0 = tabela.shadowRoot!.querySelectorAll('tbody tr[data-index="0"] td');

      expect(table.getAttribute('aria-colcount')).toBe('2');
      expect(colEls).toHaveLength(2);
      expect(ths).toHaveLength(2);
      expect(Array.from(ths).map((th) => th.getAttribute('data-coluna'))).toEqual(['id', 'nome']);
      expect(tdsLinha0).toHaveLength(2);
      expect(Array.from(tdsLinha0).map((td) => td.textContent)).toEqual(['1', 'Alice']);

      // Filtro não deve encontrar texto de coluna oculta
      tabela.filtrar('chave-oculta');
      expect(tabela.shadowRoot!.querySelectorAll('tbody tr[data-index]')).toHaveLength(0);

      tabela.filtrar('Alice');
      expect(tabela.shadowRoot!.querySelectorAll('tbody tr[data-index]')).toHaveLength(1);
    });

    it('calcula left e right acumulados para colunas fixas à esquerda e à direita ignorando colunas ocultas', () => {
      const cols: TabelaColuna[] = [
        { id: 'sel', rotulo: 'Sel', largura: 50, fixa: 'esquerda' },
        { id: 'oculta', rotulo: 'Oculta', largura: 999, fixa: 'esquerda', oculta: true },
        { id: 'codigo', rotulo: 'Código', largura: '100px', fixa: 'esquerda' },
        { id: 'nome', rotulo: 'Nome', largura: 200 },
        { id: 'status', rotulo: 'Status', largura: 90, fixa: 'direita' },
        { id: 'acoes', rotulo: 'Ações', largura: '70px', fixa: 'direita' }
      ];
      const dados = [{ sel: 'x', oculta: 'o', codigo: 'C1', nome: 'Teste', status: 'OK', acoes: '...' }];
      const tabela = criarTabela(cols, dados);

      const ths = Array.from(tabela.shadowRoot!.querySelectorAll<HTMLTableCellElement>('thead th'));
      const tds = Array.from(tabela.shadowRoot!.querySelectorAll<HTMLTableCellElement>('tbody tr[data-index="0"] td'));

      // Índices visíveis: 0=sel, 1=codigo, 2=nome, 3=status, 4=acoes
      expect(ths[0].classList.contains('ui-tabela__celula--fixa-esquerda')).toBe(true);
      expect(ths[0].style.left).toBe('0px');
      expect(tds[0].style.left).toBe('0px');

      expect(ths[1].classList.contains('ui-tabela__celula--fixa-esquerda')).toBe(true);
      expect(ths[1].style.left).toBe('50px');
      expect(tds[1].style.left).toBe('50px');

      expect(ths[2].classList.contains('ui-tabela__celula--fixa-esquerda')).toBe(false);
      expect(ths[2].classList.contains('ui-tabela__celula--fixa-direita')).toBe(false);

      expect(ths[3].classList.contains('ui-tabela__celula--fixa-direita')).toBe(true);
      expect(ths[3].style.right).toBe('70px');
      expect(tds[3].style.right).toBe('70px');

      expect(ths[4].classList.contains('ui-tabela__celula--fixa-direita')).toBe(true);
      expect(ths[4].style.right).toBe('0px');
      expect(tds[4].style.right).toBe('0px');
    });
  });

  describe('4. Sombras laterais indicando rolagem horizontal', () => {
    it('atualiza atributos indicadores no scroll e no ResizeObserver e limpa no disconnectedCallback', () => {
      let observerCallback: ResizeObserverCallback | null = null;
      const disconnectSpy = vi.fn();
      const observeSpy = vi.fn();

      class MockResizeObserver {
        constructor(cb: ResizeObserverCallback) {
          observerCallback = cb;
        }
        observe = observeSpy;
        unobserve = vi.fn();
        disconnect = disconnectSpy;
      }
      vi.stubGlobal('ResizeObserver', MockResizeObserver);

      const cols: TabelaColuna[] = [
        { id: 'a', rotulo: 'A', largura: 300 },
        { id: 'b', rotulo: 'B', largura: 300 }
      ];
      const tabela = criarTabela(cols, [{ a: 1, b: 2 }]);
      const container = tabela.shadowRoot!.querySelector('.ui-tabela-container') as HTMLDivElement;

      expect(observeSpy).toHaveBeenCalled();

      // Simula overflow horizontal: clientWidth=300, scrollWidth=600
      let scrollLeftVal = 0;
      Object.defineProperty(container, 'clientWidth', { value: 300, configurable: true });
      Object.defineProperty(container, 'scrollWidth', { value: 600, configurable: true });
      Object.defineProperty(container, 'scrollLeft', {
        get: () => scrollLeftVal,
        set: (v) => { scrollLeftVal = v; },
        configurable: true
      });

      // Dispara ResizeObserver inicial
      observerCallback!([], {} as ResizeObserver);
      expect(tabela.hasAttribute('data-scroll-esquerda')).toBe(false);
      expect(tabela.getAttribute('data-scroll-direita')).toBe('true');

      // Rola para o meio
      scrollLeftVal = 100;
      container.dispatchEvent(new Event('scroll'));
      expect(tabela.getAttribute('data-scroll-esquerda')).toBe('true');
      expect(tabela.getAttribute('data-scroll-direita')).toBe('true');

      // Rola até o fim
      scrollLeftVal = 300;
      container.dispatchEvent(new Event('scroll'));
      expect(tabela.getAttribute('data-scroll-esquerda')).toBe('true');
      expect(tabela.hasAttribute('data-scroll-direita')).toBe(false);

      // Desconecta -> ResizeObserver deve ser desconectado
      tabela.remove();
      expect(disconnectSpy).toHaveBeenCalled();

      vi.unstubAllGlobals();
    });
  });
});
