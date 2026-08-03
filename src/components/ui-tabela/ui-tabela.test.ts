import { describe, it, expect, beforeEach } from 'vitest';
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

    const thPonto = tabela.shadowRoot?.querySelector('th.ui-tabela__th--ordenavel') as HTMLTableCellElement;
    expect(thPonto).toBeTruthy();

    // 1º Clique: ASC (VRT-001, VRT-002, VRT-003)
    thPonto.click();
    expect(payloads[0]).toEqual({ idColuna: 'ponto', direcao: 'asc' });
    let rows = tabela.shadowRoot?.querySelectorAll('tbody tr');
    expect(rows?.[0].querySelector('td')?.textContent).toContain('VRT-001');
    expect(rows?.[2].querySelector('td')?.textContent).toContain('VRT-003');

    // 2º Clique: DESC (VRT-003, VRT-002, VRT-001)
    thPonto.click();
    expect(payloads[1]).toEqual({ idColuna: 'ponto', direcao: 'desc' });
    rows = tabela.shadowRoot?.querySelectorAll('tbody tr');
    expect(rows?.[0].querySelector('td')?.textContent).toContain('VRT-003');
    expect(rows?.[2].querySelector('td')?.textContent).toContain('VRT-001');

    // 3º Clique: ORIGINAL (Restaura sequência exata dos dados originais: VRT-003, VRT-001, VRT-002)
    thPonto.click();
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
});
