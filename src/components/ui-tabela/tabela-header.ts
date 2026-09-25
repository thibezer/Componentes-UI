/**
 * Renderizador de Cabeçalho e Grupos de Colunas (<ui-tabela>).
 * Responsabilidade única: construir o Thead, Colgroup, ícones de ordenação,
 * alinhamentos e alças de redimensionamento de colunas.
 */

import type { TabelaColuna } from './tipos';
import { ListenerBag } from '../../core/listener-bag';

export interface ContextoHeaderTabela {
  theadElement: HTMLTableSectionElement | null;
  colgroupElement: HTMLTableColElement | null;
  colunas: TabelaColuna[];
  colunaOrdenada: string | null;
  direcaoOrdenacao: 'asc' | 'desc' | 'original';
  headerListeners: ListenerBag;
  formatWidth: (largura?: string | number) => string;
  getAlignmentClass: (alinhamento?: string) => string;
  getTextAlign: (alinhamento?: string) => string;
  onHeaderClick: (coluna: TabelaColuna) => void;
  onHeaderContextMenu: (e: MouseEvent, coluna: TabelaColuna, colIndex: number, th: HTMLTableCellElement) => void;
  onInitColumnResize: (e: MouseEvent, coluna: TabelaColuna, colIndex: number, th: HTMLTableCellElement, resizer: HTMLDivElement) => void;
  onColumnAutoFit: (coluna: TabelaColuna, th: HTMLTableCellElement, col: HTMLTableColElement) => void;
}

export function renderizarHeaderTabela(ctx: ContextoHeaderTabela): void {
  if (!ctx.theadElement || !ctx.colgroupElement) return;

  // Limpar ouvintes antigos vinculados aos cabeçalhos
  ctx.headerListeners.cleanup();

  ctx.theadElement.innerHTML = '';
  ctx.colgroupElement.innerHTML = '';

  const trHeader = document.createElement('tr');

  ctx.colunas.forEach((coluna, index) => {
    // Configurar <col> para redimensionamento de CSS no corpo
    const col = document.createElement('col');
    if (coluna.largura !== undefined) {
      col.style.width = ctx.formatWidth(coluna.largura);
    }
    ctx.colgroupElement!.appendChild(col);

    // Configurar <th>
    const th = document.createElement('th');
    const alignClass = ctx.getAlignmentClass(coluna.alinhamento);
    th.className = alignClass;
    th.style.textAlign = ctx.getTextAlign(coluna.alinhamento);

    if (coluna.largura !== undefined) {
      th.style.width = ctx.formatWidth(coluna.largura);
    }
    if (coluna.larguraMinima !== undefined) {
      th.style.minWidth = ctx.formatWidth(coluna.larguraMinima);
    }
    if (coluna.larguraMaxima !== undefined) {
      const maxWStr = ctx.formatWidth(coluna.larguraMaxima);
      th.style.maxWidth = maxWStr;
      th.style.overflow = 'hidden';
      th.style.textOverflow = 'ellipsis';
      th.style.whiteSpace = 'nowrap';
    }

    if (coluna.tooltip) {
      th.title = coluna.tooltip;
    }

    if (coluna.ordenavel) {
      th.classList.add('ui-tabela__th--ordenavel');
      const clickListener = () => ctx.onHeaderClick(coluna);
      ctx.headerListeners.add(th, 'click', clickListener);
    }

    const contextMenuListener = (e: Event) => ctx.onHeaderContextMenu(e as MouseEvent, coluna, index, th);
    ctx.headerListeners.add(th, 'contextmenu', contextMenuListener);

    const headerContent = document.createElement('div');
    headerContent.className = 'ui-tabela__header-content';

    const headerText = document.createElement('span');
    headerText.className = 'ui-tabela__header-text';
    headerText.textContent = coluna.rotulo; // Evita XSS
    headerContent.appendChild(headerText);

    const sortIconContainer = document.createElement('span');
    sortIconContainer.className = 'ui-tabela__sort-icon';

    if (coluna.ordenavel) {
      const isSorted = ctx.colunaOrdenada === coluna.id && ctx.direcaoOrdenacao !== 'original';
      const isDesc = isSorted && ctx.direcaoOrdenacao === 'desc';
      const inativoClass = isSorted ? '' : 'ui-tabela__sort-arrow--inativo';
      const descClass = isDesc ? 'ui-tabela__sort-arrow--desc' : '';

      sortIconContainer.innerHTML = `
        <svg class="ui-tabela__sort-arrow ${inativoClass} ${descClass}" viewBox="0 0 24 24">
          <path d="M7 14l5-5 5 5H7z"/>
        </svg>
      `;
    }

    headerContent.appendChild(sortIconContainer);
    th.appendChild(headerContent);

    const resizer = document.createElement('div');
    resizer.className = 'ui-tabela__resizer';
    resizer.title = 'Arrastar para redimensionar largura (duplo-clique para auto-ajuste)';

    const mousedownListener = (e: Event) => ctx.onInitColumnResize(e as MouseEvent, coluna, index, th, resizer);
    ctx.headerListeners.add(resizer, 'mousedown', mousedownListener);

    const dblclickListener = (e: Event) => {
      e.stopPropagation();
      ctx.onColumnAutoFit(coluna, th, col);
    };
    ctx.headerListeners.add(resizer, 'dblclick', dblclickListener);

    th.appendChild(resizer);
    trHeader.appendChild(th);
  });

  ctx.theadElement.appendChild(trHeader);
}
