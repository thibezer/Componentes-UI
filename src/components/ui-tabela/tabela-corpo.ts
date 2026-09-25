/**
 * Renderizador do Corpo de Dados e Virtualização (<ui-tabela>).
 * Responsabilidade única: calcular faixas virtuais (windowing), renderizar linhas, células,
 * renderizadores customizados, classes de alinhamento e seleção de registros.
 */

import type { TabelaColuna } from './tipos';

export interface ContextoCorpoTabela {
  tbodyElement: HTMLTableSectionElement | null;
  tableElement: HTMLTableElement | null;
  emptyElement: HTMLDivElement | null;
  containerElement: HTMLDivElement | null;
  dadosExibicao: Record<string, any>[];
  colunas: TabelaColuna[];
  chaveId: string;
  virtualizar: boolean;
  rowHeight: number;
  isItemSelecionado: (item: Record<string, any>, index: number) => boolean;
  onLinhaClique: (item: Record<string, any>, index: number) => void;
  formatWidth: (largura?: string | number) => string;
  getAlignmentClass: (alinhamento?: string) => string;
  getTextAlign: (alinhamento?: string) => string;
}

export function renderizarCorpoTabela(ctx: ContextoCorpoTabela): void {
  if (!ctx.tbodyElement || !ctx.tableElement || !ctx.emptyElement || !ctx.containerElement) return;

  if (!ctx.dadosExibicao || ctx.dadosExibicao.length === 0) {
    ctx.emptyElement.style.display = 'flex';
    ctx.tableElement.style.display = 'none';
    return;
  }

  ctx.emptyElement.style.display = 'none';
  ctx.tableElement.style.display = 'table';

  const totalLinhas = ctx.dadosExibicao.length;
  const rowHeight = ctx.rowHeight;
  const usarVirtualizacao = ctx.virtualizar && totalLinhas > 30;

  let startIndex = 0;
  let endIndex = totalLinhas;

  if (usarVirtualizacao) {
    const scrollTop = ctx.containerElement.scrollTop;
    const clientHeight = ctx.containerElement.clientHeight || 400;
    const buffer = 5;

    startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
    endIndex = Math.min(totalLinhas, Math.ceil((scrollTop + clientHeight) / rowHeight) + buffer);
  }

  ctx.tbodyElement.innerHTML = '';
  const fragment = document.createDocumentFragment();

  // Espaçador Superior
  if (usarVirtualizacao && startIndex > 0) {
    const topSpacerRow = document.createElement('tr');
    topSpacerRow.className = 'ui-tabela__virtual-spacer';
    topSpacerRow.style.height = `${startIndex * rowHeight}px`;
    const tdSpacer = document.createElement('td');
    tdSpacer.colSpan = ctx.colunas.length || 1;
    topSpacerRow.appendChild(tdSpacer);
    fragment.appendChild(topSpacerRow);
  }

  for (let rowIndex = startIndex; rowIndex < endIndex; rowIndex++) {
    const item = ctx.dadosExibicao[rowIndex];
    const tr = document.createElement('tr');
    tr.setAttribute('data-index', String(rowIndex));

    const chave = ctx.chaveId;
    if (item[chave] !== undefined) {
      tr.setAttribute('data-id', String(item[chave]));
    } else if (item.id !== undefined) {
      tr.setAttribute('data-id', String(item.id));
    } else if (item._id !== undefined) {
      tr.setAttribute('data-id', String(item._id));
    }

    if (ctx.isItemSelecionado(item, rowIndex)) {
      tr.classList.add('ui-tabela__tr--selecionada');
      tr.setAttribute('data-selecionada', 'true');
    }

    tr.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('button, input, select, textarea, a, [data-prevent-select]')) {
        return;
      }
      ctx.onLinhaClique(item, rowIndex);
    });

    ctx.colunas.forEach((coluna) => {
      const td = document.createElement('td');
      const alignClass = ctx.getAlignmentClass(coluna.alinhamento);
      td.className = alignClass;
      td.style.textAlign = ctx.getTextAlign(coluna.alinhamento);

      if (coluna.larguraMaxima !== undefined) {
        const maxWStr = ctx.formatWidth(coluna.larguraMaxima);
        td.style.maxWidth = maxWStr;
        td.style.overflow = 'hidden';
        td.style.textOverflow = 'ellipsis';
        td.style.whiteSpace = 'nowrap';
      }

      const cellContent = document.createElement('div');
      cellContent.className = 'ui-tabela__cell-content';
      if (coluna.larguraMaxima !== undefined) {
        cellContent.classList.add('ui-tabela__cell-truncate');
      }

      const valor = item[coluna.id];

      if (typeof coluna.render === 'function') {
        const resultado = coluna.render(valor, item, rowIndex);
        if (resultado instanceof Node) {
          cellContent.appendChild(resultado);
        } else {
          // XSS protection
          cellContent.textContent = String(resultado ?? '');
        }
      } else if (valor instanceof Node) {
        cellContent.appendChild(valor);
      } else {
        const texto = valor != null ? String(valor) : '';
        cellContent.textContent = texto;
        if (coluna.larguraMaxima !== undefined && !coluna.tooltip) {
          td.title = texto;
        }
      }

      td.appendChild(cellContent);
      tr.appendChild(td);
    });

    fragment.appendChild(tr);
  }

  // Espaçador Inferior
  if (usarVirtualizacao && endIndex < totalLinhas) {
    const bottomSpacerRow = document.createElement('tr');
    bottomSpacerRow.className = 'ui-tabela__virtual-spacer';
    bottomSpacerRow.style.height = `${(totalLinhas - endIndex) * rowHeight}px`;
    const tdSpacer = document.createElement('td');
    tdSpacer.colSpan = ctx.colunas.length || 1;
    bottomSpacerRow.appendChild(tdSpacer);
    fragment.appendChild(bottomSpacerRow);
  }

  ctx.tbodyElement.appendChild(fragment);
}
