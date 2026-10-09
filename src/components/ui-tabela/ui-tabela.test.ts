import { describe, it, expect, beforeEach, vi } from 'vitest';
import './ui-tabela';
import { UITabela, TabelaColuna, UISortDetail } from './ui-tabela';

describe('Web Component: <ui-tabela>', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('deve registrar e instanciar o elemento <ui-tabela>', () => {
    const tabela = document.createElement('ui-tabela') as UITabela;
    document.body.appendChild(tabela);

    expect(tabela).toBeInstanceOf(HTMLElement);
    expect(tabela.tagName.toLowerCase()).toBe('ui-tabela');
  });

  it('deve alternar a propriedade de densidade visual (compacta | normal | relaxada)', () => {
    const tabela = document.createElement('ui-tabela') as UITabela;
    document.body.appendChild(tabela);

    expect(tabela.densidade).toBe('normal');

    tabela.densidade = 'compacta';
    expect(tabela.getAttribute('densidade')).toBe('compacta');
    expect(tabela.densidade).toBe('compacta');

    tabela.densidade = 'relaxada';
    expect(tabela.getAttribute('densidade')).toBe('relaxada');
    expect(tabela.densidade).toBe('relaxada');
  });

  it('deve executar a ordenação de 3 estados Client-Side (asc -> desc -> original)', () => {
    const tabela = document.createElement('ui-tabela') as UITabela;
    document.body.appendChild(tabela);

    const colunas: TabelaColuna[] = [
      { id: 'ponto', rotulo: 'Ponto', ordenavel: true },
      { id: 'altitude', rotulo: 'Altitude', ordenavel: true }
    ];

    const dadosOriginais = [
      { ponto: 'VRT-003', altitude: 600 },
      { ponto: 'VRT-001', altitude: 500 },
      { ponto: 'VRT-002', altitude: 550 }
    ];

    tabela.colunas = colunas;
    tabela.dados = dadosOriginais;

    const payloads: UISortDetail[] = [];
    tabela.addEventListener('ui-sort', (e: Event) => {
      payloads.push((e as CustomEvent<UISortDetail>).detail);
    });

    const getThPonto = () => tabela.shadowRoot?.querySelector('th.ui-tabela__th--ordenavel') as HTMLTableCellElement;

    // 1º Clique: ASC (VRT-001, VRT-002, VRT-003)
    getThPonto().click();
    expect(payloads[0]).toEqual({ idColuna: 'ponto', direcao: 'asc' });
    let rows = tabela.shadowRoot?.querySelectorAll('tbody tr');
    expect(rows?.[0].querySelector('td')?.textContent).toContain('VRT-001');
    expect(rows?.[2].querySelector('td')?.textContent).toContain('VRT-003');

    // 2º Clique: DESC (VRT-003, VRT-002, VRT-001)
    getThPonto().click();
    expect(payloads[1]).toEqual({ idColuna: 'ponto', direcao: 'desc' });
    rows = tabela.shadowRoot?.querySelectorAll('tbody tr');
    expect(rows?.[0].querySelector('td')?.textContent).toContain('VRT-003');
    expect(rows?.[2].querySelector('td')?.textContent).toContain('VRT-001');

    // 3º Clique: ORIGINAL (Restaura sequência exata dos dados originais: VRT-003, VRT-001, VRT-002)
    getThPonto().click();
    expect(payloads[2]).toEqual({ idColuna: null, direcao: 'original' });
    rows = tabela.shadowRoot?.querySelectorAll('tbody tr');
    expect(rows?.[0].querySelector('td')?.textContent).toContain('VRT-003');
    expect(rows?.[1].querySelector('td')?.textContent).toContain('VRT-001');
    expect(rows?.[2].querySelector('td')?.textContent).toContain('VRT-002');
  });

  it('deve aplicar propriedades de largura, larguraMinima, larguraMaxima e truncamento', () => {
    const tabela = document.createElement('ui-tabela') as UITabela;
    document.body.appendChild(tabela);

    const colunas: TabelaColuna[] = [
      { id: 'obs', rotulo: 'Observações', largura: '200px', larguraMinima: '100px', larguraMaxima: '200px' }
    ];

    tabela.colunas = colunas;
    tabela.dados = [{ obs: 'Observação muito longa que deve ser cortada visualmente com reticências...' }];

    const th = tabela.shadowRoot?.querySelector('th');
    const td = tabela.shadowRoot?.querySelector('td');

    expect(th?.style.width).toBe('200px');
    expect(th?.style.minWidth).toBe('100px');
    expect(th?.style.maxWidth).toBe('200px');
    expect(td?.style.maxWidth).toBe('200px');
    expect(td?.style.overflow).toBe('hidden');
    expect(td?.style.textOverflow).toBe('ellipsis');
  });

  it('deve aplicar o alinhamento de texto e flexbox nas células (esquerda, centro, direita)', () => {
    const tabela = document.createElement('ui-tabela') as UITabela;
    document.body.appendChild(tabela);

    tabela.colunas = [
      { id: 'colE', rotulo: 'Esquerda', alinhamento: 'esquerda' },
      { id: 'colC', rotulo: 'Centro', alinhamento: 'centro' },
      { id: 'colD', rotulo: 'Direita', alinhamento: 'direita' }
    ];

    tabela.dados = [{ colE: 'E', colC: 'C', colD: 'D' }];

    const headers = tabela.shadowRoot?.querySelectorAll('th');
    expect(headers?.[0].style.textAlign).toBe('left');
    expect(headers?.[1].style.textAlign).toBe('center');
    expect(headers?.[2].style.textAlign).toBe('right');

    const tds = tabela.shadowRoot?.querySelectorAll('td');
    expect(tds?.[0].style.textAlign).toBe('left');
    expect(tds?.[1].style.textAlign).toBe('center');
    expect(tds?.[2].style.textAlign).toBe('right');
  });

  it('deve virtualizar linhas (Windowing) para grandes conjuntos de dados', () => {
    const tabela = document.createElement('ui-tabela') as UITabela;
    document.body.appendChild(tabela);

    tabela.colunas = [{ id: 'ponto', rotulo: 'Ponto' }];
    
    // Gerar 200 linhas de dados
    const dadosGrandes = Array.from({ length: 200 }, (_, i) => ({ ponto: `PNT-${i + 1}` }));
    tabela.dados = dadosGrandes;

    const rows = tabela.shadowRoot?.querySelectorAll('tbody tr:not(.ui-tabela__virtual-spacer)');
    // Deve renderizar apenas a janela visível inicial (muito menos que 200 linhas)
    expect(rows?.length).toBeLessThan(50);
  });

  it('deve limpar ouvintes de eventos e referencias no disconnectedCallback() sem erros', () => {
    const tabela = document.createElement('ui-tabela') as UITabela;
    document.body.appendChild(tabela);

    tabela.colunas = [{ id: 'ponto', rotulo: 'Ponto', ordenavel: true }];
    tabela.dados = [{ ponto: 'P1' }];

    expect(() => {
      document.body.removeChild(tabela);
    }).not.toThrow();
  });

  it('deve renderizar o estado de Empty State quando não houver dados', () => {
    const tabela = document.createElement('ui-tabela') as UITabela;
    tabela.textoVazio = 'Nenhum dado cadastrado';
    document.body.appendChild(tabela);

    const emptyElement = tabela.shadowRoot?.querySelector('.ui-tabela__empty');
    expect(emptyElement).toBeTruthy();
    expect(emptyElement?.textContent).toContain('Nenhum dado cadastrado');
  });

  it('deve suportar renderizador customizado de célula (Custom Cell Renderer)', () => {
    const tabela = document.createElement('ui-tabela') as UITabela;
    document.body.appendChild(tabela);

    const colunas: TabelaColuna[] = [
      { id: 'id', rotulo: 'ID' },
      {
        id: 'status',
        rotulo: 'Status',
        render: (val: string) => {
          const span = document.createElement('span');
          span.className = 'custom-badge';
          span.textContent = val.toUpperCase();
          return span;
        }
      }
    ];

    tabela.colunas = colunas;
    tabela.dados = [{ id: '1', status: 'ativo' }];

    const badgeCell = tabela.shadowRoot?.querySelector('.custom-badge');
    expect(badgeCell).toBeTruthy();
    expect(badgeCell?.textContent).toBe('ATIVO');
  });

  describe('Rolagem Programática (rolarPara)', () => {
    it('deve rolar para um item existente no DOM e aplicar seleção quando solicitado', () => {
      const tabela = document.createElement('ui-tabela') as UITabela;
      document.body.appendChild(tabela);

      tabela.colunas = [{ id: 'id', rotulo: 'ID' }, { id: 'nome', rotulo: 'Nome' }];
      tabela.dados = [
        { id: 'item-1', nome: 'Primeiro' },
        { id: 'item-2', nome: 'Segundo' },
        { id: 'item-3', nome: 'Terceiro' }
      ];

      let eventoDisparado = false;
      tabela.addEventListener('ui-linha-selecionada', (e: Event) => {
        eventoDisparado = true;
        const detail = (e as CustomEvent).detail;
        expect(detail.item.id).toBe('item-2');
        expect(detail.indice).toBe(1);
      });

      const sucesso = tabela.rolarPara('item-2', { selecionar: true });
      expect(sucesso).toBe(true);
      expect(eventoDisparado).toBe(true);

      const trSelecionada = tabela.shadowRoot?.querySelector('tr.ui-tabela__tr--selecionada');
      expect(trSelecionada).toBeTruthy();
      expect(trSelecionada?.getAttribute('data-id')).toBe('item-2');
      expect(trSelecionada?.getAttribute('data-selecionada')).toBe('true');
    });

    it('deve calcular deslocamento de scroll e renderizar janela em tabelas virtualizadas', () => {
      const tabela = document.createElement('ui-tabela') as UITabela;
      document.body.appendChild(tabela);

      tabela.colunas = [{ id: 'codigo', rotulo: 'Código' }];
      tabela.setAttribute('chave-id', 'codigo');

      // Gerar 200 itens com virtualização ativa
      const dados = Array.from({ length: 200 }, (_, i) => ({ codigo: `COD-${i + 1}`, valor: i }));
      tabela.dados = dados;

      // Item 150 não deve existir no DOM inicial devido à virtualização
      let tr150 = tabela.shadowRoot?.querySelector('tr[data-id="COD-150"]');
      expect(tr150).toBeNull();

      // Executa rolagem programática para COD-150
      const sucesso = tabela.rolarPara('COD-150', { comportamento: 'auto', selecionar: true });
      expect(sucesso).toBe(true);

      // Agora a linha COD-150 deve ter sido trazida para a janela visível no DOM
      tr150 = tabela.shadowRoot?.querySelector('tr[data-id="COD-150"]');
      expect(tr150).toBeTruthy();
      expect(tr150?.classList.contains('ui-tabela__tr--selecionada')).toBe(true);
      expect(tabela.itemSelecionado?.codigo).toBe('COD-150');
    });

    it('deve suportar rolagem por índice numérico direto e predicado funcional', () => {
      const tabela = document.createElement('ui-tabela') as UITabela;
      document.body.appendChild(tabela);

      tabela.colunas = [{ id: 'nome', rotulo: 'Nome' }];
      tabela.dados = [
        { nome: 'Alfa' },
        { nome: 'Beta' },
        { nome: 'Gama' }
      ];

      // Rolagem por índice numérico
      const sucessoIndice = tabela.rolarPara(1, { selecionar: true });
      expect(sucessoIndice).toBe(true);
      expect(tabela.itemSelecionado?.nome).toBe('Beta');

      // Rolagem por predicado funcional
      const sucessoPredicado = tabela.rolarPara((item) => item.nome === 'Gama', { selecionar: true });
      expect(sucessoPredicado).toBe(true);
      expect(tabela.itemSelecionado?.nome).toBe('Gama');
    });

    it('deve retornar false quando o item não for encontrado', () => {
      const tabela = document.createElement('ui-tabela') as UITabela;
      document.body.appendChild(tabela);

      tabela.colunas = [{ id: 'id', rotulo: 'ID' }];
      tabela.dados = [{ id: '1' }, { id: '2' }];

      expect(tabela.rolarPara('item-inexistente')).toBe(false);
      expect(tabela.rolarPara(999)).toBe(false);
    });
  });

  describe('Regressões de rolarPara e seleção', () => {
    function criarTabela(dados: Record<string, any>[], colunas: TabelaColuna[] = [{ id: 'nome', rotulo: 'Nome', ordenavel: true }]) {
      const tabela = document.createElement('ui-tabela') as UITabela;
      document.body.appendChild(tabela);
      tabela.colunas = colunas;
      tabela.dados = dados;
      return tabela;
    }
    const linhaSelecionada = (t: UITabela) => t.shadowRoot!.querySelector('tr.ui-tabela__tr--selecionada');

    it('após ordenar pela propriedade, seleciona e destaca a mesma linha informada no evento', () => {
      const tabela = criarTabela([{ id: 'c', nome: 'C' }, { id: 'a', nome: 'A' }, { id: 'b', nome: 'B' }]);
      tabela.colunaOrdenada = 'nome'; // exibição: A, B, C

      let detalhe: any = null;
      tabela.addEventListener('ui-linha-selecionada', (e) => { detalhe = (e as CustomEvent).detail; });
      tabela.rolarParaIndice(1, { selecionar: true, comportamento: 'auto' });

      expect(detalhe.item.id).toBe('b');
      expect(detalhe.indice).toBe(1);
      expect(linhaSelecionada(tabela)?.getAttribute('data-id')).toBe('b');
      expect(tabela.indiceSelecionado).toBe(1);

      tabela.direcaoOrdenacao = 'desc'; // exibição: C, B, A — seleção acompanha o item
      expect(tabela.indiceSelecionado).toBe(1);
      tabela.direcaoOrdenacao = 'original'; // exibição: C, A, B
      expect(tabela.indiceSelecionado).toBe(2);
      expect(linhaSelecionada(tabela)?.getAttribute('data-id')).toBe('b');
    });

    it('prioriza a chave-id configurada sobre chaves alternativas de outros itens', () => {
      const tabela = criarTabela([{ matricula: 'X', codigo: '7' }, { matricula: '7', codigo: 'Y' }], [{ id: 'matricula', rotulo: 'M' }]);
      tabela.setAttribute('chave-id', 'matricula');

      expect(tabela.rolarPara('7', { selecionar: true, comportamento: 'auto' })).toBe(true);
      expect(tabela.itemSelecionado?.matricula).toBe('7');
    });

    it('distingue ID numérico de índice com porIndice / rolarParaIndice', () => {
      const tabela = criarTabela([{ id: 1, nome: 'A' }, { id: 2, nome: 'B' }, { id: 3, nome: 'C' }]);

      tabela.rolarPara(1, { selecionar: true, comportamento: 'auto' });
      expect(tabela.itemSelecionado?.nome).toBe('A'); // ID 1

      tabela.rolarPara(1, { selecionar: true, porIndice: true, comportamento: 'auto' });
      expect(tabela.itemSelecionado?.nome).toBe('B'); // índice 1

      expect(tabela.rolarParaIndice(3)).toBe(false);
    });

    it('mantém a seleção escondida pelo filtro e avisa quando o item sai dos dados', () => {
      const tabela = criarTabela([{ id: 1, nome: 'Alfa' }, { id: 2, nome: 'Beta' }]);
      tabela.rolarPara(2, { selecionar: true, comportamento: 'auto' });

      tabela.filtrar('alfa');
      expect(tabela.itemSelecionado?.id).toBe(2);
      expect(tabela.indiceSelecionado).toBeNull();
      expect(linhaSelecionada(tabela)).toBeNull();

      tabela.filtrar('');
      expect(tabela.indiceSelecionado).toBe(1);
      expect(linhaSelecionada(tabela)?.getAttribute('data-id')).toBe('2');

      let removido: any = null;
      tabela.addEventListener('ui-selecao-removida', (e) => { removido = (e as CustomEvent).detail.item; });
      tabela.dados = [{ id: 1, nome: 'Alfa' }];
      expect(removido?.id).toBe(2);
      expect(tabela.itemSelecionado).toBeNull();
    });

    it('rola só o container (sem scrollIntoView) e desconta o cabeçalho fixo', () => {
      const tabela = criarTabela([{ id: 1, nome: 'A' }, { id: 2, nome: 'B' }]);
      const raiz = tabela.shadowRoot!;
      const container = raiz.querySelector('.ui-tabela-container') as HTMLDivElement;
      const thead = raiz.querySelector('thead') as HTMLElement;
      const tr = raiz.querySelector('tr[data-index="1"]') as HTMLElement;

      const espiaoScrollIntoView = vi.fn();
      tr.scrollIntoView = espiaoScrollIntoView;
      Object.defineProperty(thead, 'offsetHeight', { configurable: true, value: 40 });
      Object.defineProperty(container, 'clientHeight', { configurable: true, value: 200 });
      container.getBoundingClientRect = () => ({ top: 0, bottom: 200 } as DOMRect);
      // Linha parcialmente coberta pelo cabeçalho (topo em 10, cabeçalho vai até 40)
      tr.getBoundingClientRect = () => ({ top: 10, bottom: 52, height: 42 } as DOMRect);
      container.scrollTop = 100;

      tabela.rolarPara(2, { comportamento: 'auto' });

      expect(espiaoScrollIntoView).not.toHaveBeenCalled();
      expect(container.scrollTop).toBe(70);
    });

    it('a seleção programática move o foco móvel (tabindex) para a linha', () => {
      const tabela = criarTabela([{ id: 1, nome: 'A' }, { id: 2, nome: 'B' }, { id: 3, nome: 'C' }]);
      tabela.rolarPara(3, { selecionar: true, comportamento: 'auto' });

      const focaveis = tabela.shadowRoot!.querySelectorAll('tr[tabindex="0"]');
      expect(focaveis.length).toBe(1);
      expect(focaveis[0].getAttribute('data-id')).toBe('3');
    });

    it('rolagem suave sempre termina com a linha renderizada, mesmo sem animação (aba oculta)', () => {
      vi.useFakeTimers();
      try {
        const dados = Array.from({ length: 500 }, (_, i) => ({ id: i, nome: `N${i}` }));
        const tabela = criarTabela(dados);
        const container = tabela.shadowRoot!.querySelector('.ui-tabela-container') as HTMLDivElement;
        container.scrollTo = () => {}; // simula animação que não acontece

        expect(tabela.rolarPara(400)).toBe(true);
        expect(tabela.shadowRoot!.querySelector('tr[data-id="400"]')).toBeNull();
        vi.advanceTimersByTime(800);
        expect(tabela.shadowRoot!.querySelector('tr[data-id="400"]')).toBeTruthy();
      } finally {
        vi.useRealTimers();
      }
    });

    it('zebrado segue o índice do dado, não a posição no DOM (espaçador virtual)', () => {
      const dados = Array.from({ length: 200 }, (_, i) => ({ id: i, nome: `N${i}` }));
      const tabela = criarTabela(dados);
      tabela.rolarPara(101, { porIndice: true, comportamento: 'auto' });

      const raiz = tabela.shadowRoot!;
      expect(raiz.querySelector('tr.ui-tabela__virtual-spacer')).toBeTruthy();
      expect(raiz.querySelector('tr[data-index="101"]')?.classList.contains('ui-tabela__tr--par')).toBe(true);
      expect(raiz.querySelector('tr[data-index="100"]')?.classList.contains('ui-tabela__tr--par')).toBe(false);
    });
  });
});
