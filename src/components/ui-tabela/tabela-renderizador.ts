import { TabelaColuna } from './tipos';
import { renderizarHeaderTabela } from './tabela-header';
import { renderizarCorpoTabela, type ModoRenderCorpo } from './tabela-corpo';
import { ListenerBag } from '../../core/listener-bag';
import {
  aplicarEstiloColunaFixa,
  calcularOffsetsColunasFixas,
  formatWidth,
  getAlignmentClass,
  getTextAlign,
  montarEstruturaDOM,
  obterColunasVisiveis,
  EstruturaDOMElementos
} from './tabela-dom';
import {
  executarRedimensionamentoColuna,
  executarRedimensionamentoTeclado,
  abrirPopoverRedimensionamento
} from './tabela-interacao';
import { TabelaOrquestradorDados } from './tabela-orquestrador-dados';
import { TabelaSelecaoController } from './tabela-selecao';

export interface ContextoOrquestradorRender {
  host: HTMLElement;
  shadow: ShadowRoot;
  theadElement: HTMLTableSectionElement | null;
  colgroupElement: HTMLTableColElement | null;
  tbodyElement: HTMLTableSectionElement | null;
  tableElement: HTMLTableElement | null;
  emptyElement: HTMLDivElement | null;
  containerElement: HTMLDivElement | null;
  colunas: TabelaColuna[];
  dadosController: TabelaOrquestradorDados;
  selecaoController: TabelaSelecaoController;
  headerListeners: ListenerBag;
  chaveId: string;
  virtualizar: boolean;
  rowHeight: number;
  indiceAtivo: number | null;
  /** `rolagem` preserva as linhas que seguem visíveis na janela virtual (padrão: `completo`). */
  modoCorpo?: ModoRenderCorpo;
  textoVazio?: string;
  textoSemResultados?: string;
  onSetIsResizing: (resizing: boolean) => void;
  onActiveResizeCleanup: (cleanup: (() => void) | null) => void;
  onHeaderClick: (col: TabelaColuna) => void;
}

export function executarOrquestracaoHeader(ctx: ContextoOrquestradorRender): void {
  renderizarHeaderTabela({
    theadElement: ctx.theadElement,
    colgroupElement: ctx.colgroupElement,
    colunas: ctx.colunas,
    colunaOrdenada: ctx.dadosController.getColunaOrdenada(),
    direcaoOrdenacao: ctx.dadosController.getDirecaoOrdenacao(),
    headerListeners: ctx.headerListeners,
    formatWidth,
    getAlignmentClass,
    getTextAlign,
    onHeaderClick: (col) => ctx.onHeaderClick(col),
    onHeaderContextMenu: (e, col, idx, th) => {
      abrirPopoverRedimensionamento(e, col, idx, th, {
        host: ctx.host,
        colgroupElement: ctx.colgroupElement,
        shadow: ctx.shadow,
        onSetIsResizing: ctx.onSetIsResizing
      });
    },
    onInitColumnResize: (e, col, idx, th, resizer) => {
      const cleanup = executarRedimensionamentoColuna(e, col, idx, th, resizer, {
        host: ctx.host,
        colgroupElement: ctx.colgroupElement,
        shadow: ctx.shadow,
        onSetIsResizing: ctx.onSetIsResizing
      });
      ctx.onActiveResizeCleanup(cleanup);
    },
    onResizeTeclado: (delta, col, _idx, th, colEl) => {
      executarRedimensionamentoTeclado(delta, col, th, colEl, {
        host: ctx.host,
        colgroupElement: ctx.colgroupElement,
        shadow: ctx.shadow,
        onSetIsResizing: ctx.onSetIsResizing
      });
    },
    onColumnAutoFit: (col, th, colEl) => {
      col.largura = undefined;
      th.style.width = '';
      colEl.style.width = '';
      ctx.host.dispatchEvent(
        new CustomEvent('ui-column-resize', {
          bubbles: true,
          composed: true,
          detail: { idColuna: col.id, largura: 'auto' }
        })
      );
    }
  });
}

export function executarOrquestracaoCorpo(ctx: ContextoOrquestradorRender): void {
  renderizarCorpoTabela({
    tbodyElement: ctx.tbodyElement,
    tableElement: ctx.tableElement,
    emptyElement: ctx.emptyElement,
    containerElement: ctx.containerElement,
    dadosExibicao: ctx.dadosController.getDadosExibicao(),
    colunas: ctx.colunas,
    chaveId: ctx.chaveId,
    virtualizar: ctx.virtualizar,
    rowHeight: ctx.rowHeight,
    indiceAtivo: ctx.indiceAtivo,
    filtroAtivo: ctx.dadosController.temFiltro(),
    modo: ctx.modoCorpo,
    indiceOriginal: (item) => ctx.dadosController.indiceOriginal(item),
    textoVazio: ctx.textoVazio,
    textoSemResultados: ctx.textoSemResultados,
    isItemSelecionado: (item, idx) => ctx.selecaoController.isItemSelecionado(item, idx),
    onLinhaSelecionadaRenderizada: (tr, selecionada) => ctx.selecaoController.registrarLinhaRenderizada(tr, selecionada),
    onLinhaClique: (item, idx) => {
      ctx.selecaoController.interagirComLinha(item, idx);
      ctx.host.dispatchEvent(
        new CustomEvent('ui-linha-clique', {
          bubbles: true,
          composed: true,
          detail: { item, indice: idx }
        })
      );
    },
    formatWidth,
    getAlignmentClass,
    getTextAlign
  });
}

export function inicializarScrollVirtualizacao(
  container: HTMLElement,
  onRenderBody: () => void
): (e: Event) => void {
  let ticking = false;
  const handler = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        // finally: uma exceção de render não pode deixar o scroll virtual travado
        try { onRenderBody(); } finally { ticking = false; }
      });
      ticking = true;
    }
  };
  container.addEventListener('scroll', handler);
  return handler;
}

export function orquestrarEstruturaInicial(
  shadow: ShadowRoot,
  textoVazio: string,
  maxHeight: string | null,
  carregando: boolean
): EstruturaDOMElementos {
  return montarEstruturaDOM(shadow, textoVazio, maxHeight, carregando);
}

/**
 * Atualiza atributos e classes indicadores de conteúdo rolável à esquerda e à direita.
 */
export function atualizarIndicadoresRolagem(host: HTMLElement, container: HTMLElement | null): void {
  if (!container) return;
  const { scrollLeft, scrollWidth, clientWidth } = container;
  const temEsquerda = scrollLeft > 1;
  const temDireita = scrollLeft + clientWidth < scrollWidth - 1;

  if (temEsquerda) host.setAttribute('data-scroll-esquerda', 'true');
  else host.removeAttribute('data-scroll-esquerda');

  if (temDireita) host.setAttribute('data-scroll-direita', 'true');
  else host.removeAttribute('data-scroll-direita');

  container.classList.toggle('ui-tabela-container--scroll-esquerda', temEsquerda);
  container.classList.toggle('ui-tabela-container--scroll-direita', temDireita);
}

/**
 * Recalcula offsets `left`/`right` das colunas fixas a partir das larguras reais medidas no `thead`
 * (fallback para `coluna.largura`), atualizando `<th>` e `<td>` visíveis.
 */
export function recalcularOffsetsFixosDOM(
  thead: HTMLTableSectionElement | null,
  tbody: HTMLTableSectionElement | null,
  colunas: TabelaColuna[]
): void {
  const colunasVisiveis = obterColunasVisiveis(colunas);
  if (!colunasVisiveis.some((c) => c.fixa)) return;
  const ths = thead?.querySelectorAll<HTMLTableCellElement>('tr > th');
  const largurasMedidas = ths && ths.length === colunasVisiveis.length
    ? Array.from(ths, (th) => th.offsetWidth)
    : undefined;
  const offsets = calcularOffsetsColunasFixas(colunasVisiveis, largurasMedidas);

  ths?.forEach((th, idx) => aplicarEstiloColunaFixa(th, offsets[idx]));
  tbody?.querySelectorAll<HTMLTableRowElement>('tr[data-index]').forEach((tr) => {
    const tds = tr.children;
    for (let i = 0; i < colunasVisiveis.length && i < tds.length; i++) {
      aplicarEstiloColunaFixa(tds[i] as HTMLTableCellElement, offsets[i]);
    }
  });
}
