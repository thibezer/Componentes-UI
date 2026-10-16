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
  onInitColumnResize: (e: MouseEvent | PointerEvent, coluna: TabelaColuna, colIndex: number, th: HTMLTableCellElement, resizer: HTMLDivElement) => void;
  /** Ajuste por teclado (setas na alça): `delta` em px. */
  onResizeTeclado?: (delta: number, coluna: TabelaColuna, colIndex: number, th: HTMLTableCellElement, col: HTMLTableColElement) => void;
  onColumnAutoFit: (coluna: TabelaColuna, th: HTMLTableCellElement, col: HTMLTableColElement) => void;
}

export function renderizarHeaderTabela(ctx: ContextoHeaderTabela): void {
  if (!ctx.theadElement || !ctx.colgroupElement) return;

  // Limpar ouvintes antigos vinculados aos cabeçalhos
  ctx.headerListeners.cleanup();

  // Ordenar recria o cabeçalho: guarda a coluna cujo botão tinha o foco para devolvê-lo
  const raiz = ctx.theadElement.getRootNode() as Document | ShadowRoot;
  const focado = raiz.activeElement as HTMLElement | null;
  const colunaComFoco = focado && ctx.theadElement.contains(focado)
    ? focado.closest('th')?.getAttribute('data-coluna') ?? null
    : null;

  ctx.theadElement.innerHTML = '';
  ctx.colgroupElement.innerHTML = '';

  const trHeader = document.createElement('tr');
  trHeader.setAttribute('aria-rowindex', '1');

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
    th.setAttribute('part', 'celula-cabecalho');
    th.scope = 'col';
    th.setAttribute('data-coluna', coluna.id);
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

    const isSorted = Boolean(coluna.ordenavel) && ctx.colunaOrdenada === coluna.id && ctx.direcaoOrdenacao !== 'original';
    const isDesc = isSorted && ctx.direcaoOrdenacao === 'desc';

    if (coluna.ordenavel) {
      th.classList.add('ui-tabela__th--ordenavel');
      // O clique no <button> interno (mouse ou Enter/Espaço) sobe até o <th>
      const clickListener = () => ctx.onHeaderClick(coluna);
      ctx.headerListeners.add(th, 'click', clickListener);
      th.setAttribute('aria-sort', isSorted ? (isDesc ? 'descending' : 'ascending') : 'none');
    }

    const contextMenuListener = (e: Event) => ctx.onHeaderContextMenu(e as MouseEvent, coluna, index, th);
    ctx.headerListeners.add(th, 'contextmenu', contextMenuListener);

    const headerContent = document.createElement('div');
    headerContent.className = 'ui-tabela__header-content';

    const headerText = document.createElement('span');
    headerText.className = 'ui-tabela__header-text';
    headerText.textContent = coluna.rotulo; // Evita XSS
    headerContent.appendChild(headerText);

    if (coluna.ordenavel) {
      const sortIconContainer = document.createElement('span');
      sortIconContainer.className = 'ui-tabela__sort-icon';
      const estado = !isSorted ? 'ui-tabela__sort-arrow--inativo' : (isDesc ? 'ui-tabela__sort-arrow--desc' : 'ui-tabela__sort-arrow--asc');

      // Decorativo: o estado de ordenação é anunciado pelo aria-sort do <th>
      sortIconContainer.setAttribute('aria-hidden', 'true');
      sortIconContainer.innerHTML = `<svg class="ui-tabela__sort-arrow ${estado}" viewBox="0 0 24 24" focusable="false"><path class="seta-cima" d="M7 11l5-5 5 5H7z"/><path class="seta-baixo" d="M7 13l5 5 5-5H7z"/></svg>`;
      headerContent.appendChild(sortIconContainer);
    }

    if (coluna.ordenavel) {
      // Botão nativo: focável por Tab e acionável com Enter/Espaço
      const botaoOrdenar = document.createElement('button');
      botaoOrdenar.type = 'button';
      botaoOrdenar.className = 'ui-tabela__ordenar';
      botaoOrdenar.setAttribute('part', 'ordenar');
      botaoOrdenar.appendChild(headerContent);
      th.appendChild(botaoOrdenar);
    } else {
      th.appendChild(headerContent);
    }

    const resizer = document.createElement('div');
    resizer.className = 'ui-tabela__resizer';
    resizer.setAttribute('part', 'redimensionador');
    resizer.title = 'Arrastar para redimensionar largura (duplo-clique para auto-ajuste)';
    // Separador focável: setas ← → ajustam a largura (Shift = passo maior), Enter abre o diálogo de largura
    resizer.tabIndex = 0;
    resizer.setAttribute('role', 'separator');
    resizer.setAttribute('aria-orientation', 'vertical');
    resizer.setAttribute('aria-label', `Redimensionar coluna ${coluna.rotulo}`);

    const mousedownListener = (e: Event) => ctx.onInitColumnResize(e as MouseEvent, coluna, index, th, resizer);
    ctx.headerListeners.add(resizer, 'mousedown', mousedownListener);
    // Toque/caneta: o mouse segue pelo mousedown (o pointerdown do mouse é ignorado para não duplicar)
    const pointerdownListener = (e: Event) => {
      const pe = e as PointerEvent;
      if (pe.pointerType === 'mouse' || !pe.pointerType) return;
      ctx.onInitColumnResize(pe, coluna, index, th, resizer);
    };
    ctx.headerListeners.add(resizer, 'pointerdown', pointerdownListener);

    const keydownListener = (e: Event) => {
      const ke = e as KeyboardEvent;
      const passo = ke.shiftKey ? 50 : 10;
      if (ke.key === 'ArrowRight') { ke.preventDefault(); ctx.onResizeTeclado?.(passo, coluna, index, th, col); }
      else if (ke.key === 'ArrowLeft') { ke.preventDefault(); ctx.onResizeTeclado?.(-passo, coluna, index, th, col); }
      else if (ke.key === 'Enter' || ke.key === 'F2') {
        ke.preventDefault();
        const caixa = th.getBoundingClientRect();
        ctx.onHeaderContextMenu(new MouseEvent('contextmenu', { clientX: caixa.left, clientY: caixa.bottom }), coluna, index, th);
      }
    };
    ctx.headerListeners.add(resizer, 'keydown', keydownListener);

    const dblclickListener = (e: Event) => {
      e.stopPropagation();
      ctx.onColumnAutoFit(coluna, th, col);
    };
    ctx.headerListeners.add(resizer, 'dblclick', dblclickListener);
    // O clique na alça não pode ordenar a coluna
    ctx.headerListeners.add(resizer, 'click', (e: Event) => e.stopPropagation());

    th.appendChild(resizer);
    trHeader.appendChild(th);
  });

  ctx.theadElement.appendChild(trHeader);

  if (colunaComFoco !== null) {
    const th = Array.from(trHeader.children).find((el) => el.getAttribute('data-coluna') === colunaComFoco);
    th?.querySelector<HTMLElement>('.ui-tabela__ordenar')?.focus();
  }
}
