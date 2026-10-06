import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../src/components/ui-tabela';
import '../src/components/ui-tooltip';
import '../src/components/ui-botao';

import type { UITabela, TabelaColuna } from '../src/components/ui-tabela';
import type { UITooltip } from '../src/components/ui-tooltip';

const COLUNAS: TabelaColuna[] = [
  { id: 'ponto', rotulo: 'Ponto', ordenavel: true },
  { id: 'altitude', rotulo: 'Altitude' },
];

function criarTabela(total = 3): UITabela {
  const tabela = document.createElement('ui-tabela') as UITabela;
  document.body.appendChild(tabela);
  tabela.colunas = COLUNAS;
  tabela.dados = Array.from({ length: total }, (_, i) => ({ id: i + 1, ponto: `P-${String(total - i).padStart(3, '0')}`, altitude: i }));
  return tabela;
}

const raiz = (tabela: UITabela) => tabela.shadowRoot!;
const linhas = (tabela: UITabela) => Array.from(raiz(tabela).querySelectorAll<HTMLElement>('tbody tr[data-index]'));
const linha = (tabela: UITabela, indice: number) => raiz(tabela).querySelector<HTMLElement>(`tbody tr[data-index="${indice}"]`)!;

function tecla(alvo: HTMLElement, key: string): KeyboardEvent {
  const evento = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true });
  alvo.dispatchEvent(evento);
  return evento;
}

describe('<ui-tabela>: cabeçalho ordenável acessível', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('colunas ordenáveis devem ter um <button> focável; as demais, não', () => {
    const tabela = criarTabela();
    const [thOrdenavel, thComum] = Array.from(raiz(tabela).querySelectorAll('th'));

    expect(thOrdenavel.getAttribute('scope')).toBe('col');
    expect(thOrdenavel.querySelector('button.ui-tabela__ordenar')?.textContent).toContain('Ponto');
    expect(thComum.querySelector('button')).toBeNull();
  });

  it('acionar o botão deve ordenar uma única vez e refletir aria-sort no <th>', () => {
    const tabela = criarTabela();
    const ordenacoes = vi.fn();
    tabela.addEventListener('ui-sort', ordenacoes);
    const th = () => raiz(tabela).querySelector('th')!;
    const botao = () => th().querySelector('button')!;

    expect(th().hasAttribute('aria-sort')).toBe(false);

    botao().click();
    expect(ordenacoes).toHaveBeenCalledTimes(1);
    expect(th().getAttribute('aria-sort')).toBe('ascending');

    botao().click();
    expect(th().getAttribute('aria-sort')).toBe('descending');

    botao().click();
    expect(th().hasAttribute('aria-sort')).toBe(false);
  });

  it('o foco deve permanecer no botão da coluna após ordenar (o cabeçalho é recriado)', () => {
    const tabela = criarTabela();
    const botao = raiz(tabela).querySelector<HTMLButtonElement>('th button')!;
    botao.focus();

    botao.click();

    const ativo = raiz(tabela).activeElement as HTMLElement;
    expect(ativo?.classList.contains('ui-tabela__ordenar')).toBe(true);
    expect(ativo.closest('th')!.getAttribute('data-coluna')).toBe('ponto');
    expect(ativo).not.toBe(botao); // é o botão novo, não o removido
  });

  it('o ícone de ordenação deve ser decorativo', () => {
    const tabela = criarTabela();
    expect(raiz(tabela).querySelector('.ui-tabela__sort-icon')!.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('<ui-tabela>: navegação por teclado nas linhas', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('deve haver uma única linha no Tab (foco móvel), começando pela primeira', () => {
    const tabela = criarTabela();
    expect(linhas(tabela).map((tr) => tr.tabIndex)).toEqual([0, -1, -1]);
  });

  it('setas, Home e End devem mover o foco e o tabindex=0', () => {
    const tabela = criarTabela();
    linha(tabela, 0).focus();

    const evento = tecla(linha(tabela, 0), 'ArrowDown');
    expect(evento.defaultPrevented).toBe(true);
    expect(raiz(tabela).activeElement).toBe(linha(tabela, 1));
    expect(linhas(tabela).map((tr) => tr.tabIndex)).toEqual([-1, 0, -1]);

    tecla(linha(tabela, 1), 'End');
    expect(raiz(tabela).activeElement).toBe(linha(tabela, 2));

    tecla(linha(tabela, 2), 'ArrowDown');
    expect(raiz(tabela).activeElement).toBe(linha(tabela, 2));

    tecla(linha(tabela, 2), 'Home');
    expect(raiz(tabela).activeElement).toBe(linha(tabela, 0));
  });

  it('End deve alcançar a última linha mesmo fora da janela virtualizada', () => {
    const tabela = criarTabela(200);
    expect(linha(tabela, 199)).toBeNull();

    linha(tabela, 0).focus();
    tecla(linha(tabela, 0), 'End');

    const ultima = linha(tabela, 199);
    expect(ultima).not.toBeNull();
    expect(raiz(tabela).activeElement).toBe(ultima);
    expect(ultima.tabIndex).toBe(0);
  });

  it('Enter e Espaço devem selecionar a linha como o clique (ui-linha-clique + aria-current)', () => {
    const tabela = criarTabela();
    const cliques = vi.fn();
    tabela.addEventListener('ui-linha-clique', cliques);

    tecla(linha(tabela, 1), 'Enter');
    expect(cliques).toHaveBeenCalledTimes(1);
    expect(cliques.mock.calls[0][0].detail.indice).toBe(1);
    expect(linha(tabela, 1).getAttribute('aria-current')).toBe('true');

    const evento = tecla(linha(tabela, 2), ' ');
    expect(evento.defaultPrevented).toBe(true);
    expect(linha(tabela, 2).getAttribute('aria-current')).toBe('true');
    expect(linha(tabela, 1).hasAttribute('aria-current')).toBe(false);
  });

  it('teclas dentro de controles da célula não devem ser capturadas pela tabela', () => {
    const tabela = document.createElement('ui-tabela') as UITabela;
    document.body.appendChild(tabela);
    tabela.colunas = [{ id: 'nome', rotulo: 'Nome', render: () => document.createElement('input') }];
    tabela.dados = [{ id: 1, nome: 'a' }, { id: 2, nome: 'b' }];

    const input = linha(tabela, 0).querySelector('input')!;
    const evento = tecla(input, 'ArrowDown');
    expect(evento.defaultPrevented).toBe(false);
  });

  it('o foco deve sobreviver à re-renderização do corpo (virtualização)', () => {
    const tabela = criarTabela();
    linha(tabela, 1).focus();

    tabela.renderBody();

    expect(raiz(tabela).activeElement).toBe(linha(tabela, 1));
  });

  it('a seleção deve ser mantida ao ordenar', () => {
    const tabela = criarTabela();
    const selecionado = tabela.dados[0];
    tabela.itemSelecionado = selecionado;

    raiz(tabela).querySelector<HTMLButtonElement>('th button')!.click();

    expect(tabela.itemSelecionado).toBe(selecionado);
    const tr = raiz(tabela).querySelector('tr[aria-current="true"]')!;
    expect(tr.getAttribute('data-id')).toBe(String(selecionado.id));
  });

  it('deve repassar aria-label e marcar aria-busy durante o carregamento', () => {
    const tabela = criarTabela();
    tabela.setAttribute('aria-label', 'Vértices da poligonal');
    const table = raiz(tabela).querySelector('table')!;

    expect(table.getAttribute('aria-label')).toBe('Vértices da poligonal');
    expect(table.getAttribute('aria-busy')).toBe('false');

    tabela.carregando = true;
    expect(table.getAttribute('aria-busy')).toBe('true');
  });
});

describe('<ui-tooltip>: acessibilidade', () => {
  let tooltip: UITooltip;

  beforeEach(() => {
    document.body.innerHTML = '';
    tooltip = document.createElement('ui-tooltip') as UITooltip;
    tooltip.setAttribute('texto', 'Excluir camada');
    tooltip.innerHTML = '<button>🗑</button>';
    document.body.appendChild(tooltip);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const gatilho = () => tooltip.querySelector('button')!;

  it('deve descrever o gatilho com o texto do tooltip (aria-description)', () => {
    expect(gatilho().getAttribute('aria-description')).toBe('Excluir camada');

    tooltip.setAttribute('texto', 'Remover camada');
    expect(gatilho().getAttribute('aria-description')).toBe('Remover camada');

    tooltip.remove();
    expect(gatilho().hasAttribute('aria-description')).toBe(false);
  });

  it('não deve sobrescrever uma descrição definida pelo consumidor', () => {
    const outro = document.createElement('ui-tooltip');
    outro.setAttribute('texto', 'Dica');
    outro.innerHTML = '<button aria-describedby="ajuda">?</button>';
    document.body.appendChild(outro);

    expect(outro.querySelector('button')!.hasAttribute('aria-description')).toBe(false);
  });

  it('o <ui-botao> deve repassar a descrição ao <button> interno', () => {
    const outro = document.createElement('ui-tooltip');
    outro.setAttribute('texto', 'Zoom total');
    outro.innerHTML = '<ui-botao aria-label="Zoom"><svg></svg></ui-botao>';
    document.body.appendChild(outro);

    const interno = outro.querySelector('ui-botao')!.shadowRoot!.querySelector('button')!;
    expect(interno.getAttribute('aria-description')).toBe('Zoom total');
  });

  it('Escape deve fechar o tooltip sem propagar (ex.: não fecha o modal ao redor)', () => {
    const aoEscape = vi.fn();
    window.addEventListener('keydown', aoEscape);
    tooltip.mostrar();

    tecla(gatilho(), 'Escape');

    expect(tooltip.aberto).toBe(false);
    expect(aoEscape).not.toHaveBeenCalled();

    tecla(gatilho(), 'Escape');
    expect(aoEscape).toHaveBeenCalledTimes(1);
    window.removeEventListener('keydown', aoEscape);
  });

  it('ao sair com o ponteiro, deve esperar antes de fechar para permitir alcançar o balão', () => {
    vi.useFakeTimers();
    tooltip.dispatchEvent(new MouseEvent('mouseenter'));
    expect(tooltip.aberto).toBe(true);

    tooltip.dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(60);
    tooltip.dispatchEvent(new MouseEvent('mouseenter')); // ponteiro chegou ao balão
    vi.advanceTimersByTime(200);
    expect(tooltip.aberto).toBe(true);

    tooltip.dispatchEvent(new MouseEvent('mouseleave'));
    vi.advanceTimersByTime(200);
    expect(tooltip.aberto).toBe(false);
  });
});
