import { TabelaColuna } from './tipos';
import { renderizarHeaderTabela } from './tabela-header';
import { renderizarCorpoTabela } from './tabela-corpo';
import { ListenerBag } from '../../core/listener-bag';
import {
  formatWidth,
  getAlignmentClass,
  getTextAlign,
  montarEstruturaDOM,
  EstruturaDOMElementos
} from './tabela-dom';
import {
  executarRedimensionamentoColuna,
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
    isItemSelecionado: (item, idx) => ctx.selecaoController.isItemSelecionado(item, idx),
    onLinhaClique: (item, idx) => {
      ctx.selecaoController.setItemSelecionado(item);
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
        onRenderBody();
        ticking = false;
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
