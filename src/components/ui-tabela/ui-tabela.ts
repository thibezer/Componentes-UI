import estilos from './ui-tabela.css?inline';

export type DensidadeTabela = 'compacta' | 'normal' | 'relaxada';

export interface TabelaColuna<T = any> {
  id: string;
  rotulo: string;
  largura?: string | number;
  larguraMinima?: string | number;
  larguraMaxima?: string | number;
  alinhamento?: 'esquerda' | 'centro' | 'direita' | 'left' | 'center' | 'right';
  ordenavel?: boolean;
  tooltip?: string;
  render?: (valor: any, item: T, index: number) => HTMLElement | string;
}

export interface UISortDetail {
  idColuna: string | null;
  direcao: 'asc' | 'desc' | 'original';
}

export interface UIColumnResizeDetail {
  idColuna: string;
  largura: string;
}

export class UITabela extends HTMLElement {
  static get observedAttributes() {
    return ['texto-vazio', 'empty-text', 'max-height', 'densidade', 'density', 'virtualizar', 'virtualize'];
  }

  private shadow: ShadowRoot;
  private _colunas: TabelaColuna[] = [];
  private _dadosOriginais: Record<string, any>[] = [];
  private _dadosExibicao: Record<string, any>[] = [];
  private _colunaOrdenada: string | null = null;
  private _direcaoOrdenacao: 'asc' | 'desc' | 'original' = 'original';
  private _textoVazio: string = 'Nenhum registro encontrado';
  private _virtualizar: boolean = true;
  private _isResizing: boolean = false;

  // Gerenciamento de Ouvintes e Elementos DOM
  private _containerElement: HTMLDivElement | null = null;
  private _tableElement: HTMLTableElement | null = null;
  private _theadElement: HTMLTableSectionElement | null = null;
  private _tbodyElement: HTMLTableSectionElement | null = null;
  private _colgroupElement: HTMLTableColElement | null = null;
  private _emptyElement: HTMLDivElement | null = null;

  private _scrollHandler: ((e: Event) => void) | null = null;
  private _activeResizeCleanup: (() => void) | null = null;
  private _headerEventListeners: Array<{ element: HTMLElement; type: string; listener: EventListener }> = [];
  private _ticking = false;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.syncAttributes();
    if (!this.hasAttribute('densidade') && !this.hasAttribute('density')) {
      this.setAttribute('densidade', 'normal');
    }
    this.renderTotal();
  }

  disconnectedCallback() {
    this.cleanupEventListeners();
  }

  attributeChangedCallback(_name: string, _oldVal: string | null, _newVal: string | null) {
    this.syncAttributes();
    this.renderTotal();
  }

  private syncAttributes() {
    const textoVazioAttr = this.getAttribute('texto-vazio') || this.getAttribute('empty-text');
    if (textoVazioAttr) {
      this._textoVazio = textoVazioAttr;
    }

    const virtAttr = this.getAttribute('virtualizar') || this.getAttribute('virtualize');
    if (virtAttr !== null) {
      this._virtualizar = virtAttr !== 'false';
    }
  }

  private cleanupEventListeners() {
    if (this._containerElement && this._scrollHandler) {
      this._containerElement.removeEventListener('scroll', this._scrollHandler);
      this._scrollHandler = null;
    }

    if (this._activeResizeCleanup) {
      this._activeResizeCleanup();
      this._activeResizeCleanup = null;
    }

    this._headerEventListeners.forEach(({ element, type, listener }) => {
      element.removeEventListener(type, listener);
    });
    this._headerEventListeners = [];
  }

  private addHeaderListener(element: HTMLElement, type: string, listener: EventListener) {
    element.addEventListener(type, listener);
    this._headerEventListeners.push({ element, type, listener });
  }

  // Getters & Setters Reativos
  get colunas(): TabelaColuna[] {
    return this._colunas;
  }

  set colunas(val: TabelaColuna[]) {
    this._colunas = Array.isArray(val) ? val : [];
    this.renderTotal();
  }

  get dados(): Record<string, any>[] {
    return this._dadosOriginais;
  }

  set dados(val: Record<string, any>[]) {
    const arrayVal = Array.isArray(val) ? val : [];
    this._dadosOriginais = [...arrayVal];
    this.aplicarOrdenacao();
    this.renderBody();
  }

  get densidade(): DensidadeTabela {
    const val = this.getAttribute('densidade') || this.getAttribute('density');
    if (val === 'compacta' || val === 'compact') return 'compacta';
    if (val === 'relaxada' || val === 'relaxed') return 'relaxada';
    return 'normal';
  }

  set densidade(val: DensidadeTabela) {
    if (val) {
      this.setAttribute('densidade', val);
    } else {
      this.removeAttribute('densidade');
      this.removeAttribute('density');
    }
    this.renderBody(); // Re-calcula windowing
  }

  get virtualizar(): boolean {
    return this._virtualizar;
  }

  set virtualizar(val: boolean) {
    this._virtualizar = Boolean(val);
    if (this._virtualizar) {
      this.setAttribute('virtualizar', 'true');
    } else {
      this.removeAttribute('virtualizar');
    }
    this.renderTotal();
  }

  get colunaOrdenada(): string | null {
    return this._colunaOrdenada;
  }

  set colunaOrdenada(id: string | null) {
    this._colunaOrdenada = id;
    if (!id) {
      this._direcaoOrdenacao = 'original';
    } else if (this._direcaoOrdenacao === 'original') {
      this._direcaoOrdenacao = 'asc';
    }
    this.aplicarOrdenacao();
    this.renderHeader(); // Atualiza as setinhas
    this.renderBody();
  }

  get direcaoOrdenacao(): 'asc' | 'desc' | 'original' {
    return this._direcaoOrdenacao;
  }

  set direcaoOrdenacao(dir: 'asc' | 'desc' | 'original') {
    this._direcaoOrdenacao = dir || 'original';
    if (this._direcaoOrdenacao === 'original') {
      this._colunaOrdenada = null;
    }
    this.aplicarOrdenacao();
    this.renderHeader();
    this.renderBody();
  }

  get textoVazio(): string {
    return this._textoVazio;
  }

  set textoVazio(txt: string) {
    this._textoVazio = txt || 'Nenhum registro encontrado';
    this.renderTotal();
  }

  // Ordenação Local Client-Side de 3 Estados
  private handleHeaderClick(coluna: TabelaColuna) {
    if (!coluna.ordenavel || this._isResizing) return;

    if (this._colunaOrdenada !== coluna.id) {
      this._colunaOrdenada = coluna.id;
      this._direcaoOrdenacao = 'asc';
    } else {
      if (this._direcaoOrdenacao === 'asc') {
        this._direcaoOrdenacao = 'desc';
      } else if (this._direcaoOrdenacao === 'desc') {
        this._direcaoOrdenacao = 'original';
        this._colunaOrdenada = null;
      } else {
        this._direcaoOrdenacao = 'asc';
        this._colunaOrdenada = coluna.id;
      }
    }

    this.aplicarOrdenacao();
    this.renderHeader();
    this.renderBody();

    const sortDetail: UISortDetail = {
      idColuna: this._colunaOrdenada,
      direcao: this._direcaoOrdenacao
    };

    this.dispatchEvent(
      new CustomEvent<UISortDetail>('ui-sort', {
        detail: sortDetail,
        bubbles: true,
        composed: true
      })
    );
  }

  private aplicarOrdenacao() {
    if (!this._colunaOrdenada || this._direcaoOrdenacao === 'original') {
      this._dadosExibicao = [...this._dadosOriginais];
      return;
    }

    const colId = this._colunaOrdenada;
    const factor = this._direcaoOrdenacao === 'asc' ? 1 : -1;

    this._dadosExibicao = [...this._dadosOriginais].sort((a, b) => {
      const valA = a[colId];
      const valB = b[colId];

      if (valA === valB) return 0;
      if (valA == null) return 1 * factor;
      if (valB == null) return -1 * factor;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return (valA - valB) * factor;
      }

      return String(valA).localeCompare(String(valB), 'pt-BR', { numeric: true, sensitivity: 'base' }) * factor;
    });
  }

  // Redimensionamento de Colunas (Drag-to-resize)
  private initColumnResize(e: MouseEvent, coluna: TabelaColuna, colIndex: number, thElement: HTMLTableCellElement, resizer: HTMLDivElement) {
    e.stopPropagation();
    e.preventDefault();

    this._isResizing = true;
    resizer.classList.add('ui-tabela__resizer--ativo');

    const startX = e.pageX;
    const startWidth = thElement.offsetWidth;
    const colElement = this._colgroupElement?.children[colIndex] as HTMLTableColElement;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.pageX - startX;
      let novaLargura = startWidth + deltaX;

      if (coluna.larguraMinima !== undefined) {
        const minW = typeof coluna.larguraMinima === 'number' ? coluna.larguraMinima : parseInt(coluna.larguraMinima as string, 10);
        if (!isNaN(minW)) novaLargura = Math.max(minW, novaLargura);
      } else {
        novaLargura = Math.max(60, novaLargura);
      }

      if (coluna.larguraMaxima !== undefined) {
        const maxW = typeof coluna.larguraMaxima === 'number' ? coluna.larguraMaxima : parseInt(coluna.larguraMaxima as string, 10);
        if (!isNaN(maxW)) novaLargura = Math.min(maxW, novaLargura);
      }

      coluna.largura = `${novaLargura}px`;
      thElement.style.width = `${novaLargura}px`;
      if (colElement) {
        colElement.style.width = `${novaLargura}px`;
      }
    };

    const cleanup = () => {
      resizer.classList.remove('ui-tabela__resizer--ativo');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      this._activeResizeCleanup = null;

      setTimeout(() => {
        this._isResizing = false;
      }, 50);
    };

    const onMouseUp = () => {
      cleanup();

      this.dispatchEvent(
        new CustomEvent<UIColumnResizeDetail>('ui-column-resize', {
          detail: {
            idColuna: coluna.id,
            largura: String(coluna.largura)
          },
          bubbles: true,
          composed: true
        })
      );
    };

    this._activeResizeCleanup = cleanup;
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  // Mini-Popover de Redimensionamento Exato
  private showPromptPopover(e: MouseEvent, coluna: TabelaColuna, colIndex: number, thElement: HTMLTableCellElement) {
    const dialog = document.createElement('dialog');
    dialog.className = 'ui-tabela__prompt-dialog';
    
    // Position near click
    dialog.style.position = 'fixed';
    dialog.style.left = `${e.clientX}px`;
    dialog.style.top = `${e.clientY}px`;

    const title = document.createElement('div');
    title.className = 'ui-tabela__prompt-title';
    title.textContent = `Largura para "${coluna.rotulo}" (px ou auto):`;

    const input = document.createElement('input');
    input.type = 'text';
    const larguraAtual = coluna.largura ? String(coluna.largura).replace('px', '') : 'auto';
    input.value = larguraAtual;

    const actions = document.createElement('div');
    actions.className = 'ui-tabela__prompt-actions';

    const btnOk = document.createElement('button');
    btnOk.textContent = 'Aplicar';
    const btnCancel = document.createElement('button');
    btnCancel.textContent = 'Cancelar';

    actions.appendChild(btnCancel);
    actions.appendChild(btnOk);

    dialog.appendChild(title);
    dialog.appendChild(input);
    dialog.appendChild(actions);

    this.shadow.appendChild(dialog);
    dialog.showModal();

    const aplicar = () => {
      const novaLargura = input.value;
      const valTrimmed = novaLargura.trim().toLowerCase();
      if (valTrimmed === '' || valTrimmed === 'auto') {
        coluna.largura = undefined;
        thElement.style.width = '';
        if (this._colgroupElement?.children[colIndex]) {
          (this._colgroupElement.children[colIndex] as HTMLElement).style.width = '';
        }
      } else {
        const numVal = parseInt(valTrimmed, 10);
        if (!isNaN(numVal) && numVal > 20) {
          coluna.largura = `${numVal}px`;
          thElement.style.width = `${numVal}px`;
          if (this._colgroupElement?.children[colIndex]) {
            (this._colgroupElement.children[colIndex] as HTMLElement).style.width = `${numVal}px`;
          }
        }
      }

      dialog.close();
      dialog.remove();

      this.dispatchEvent(
        new CustomEvent<UIColumnResizeDetail>('ui-column-resize', {
          detail: {
            idColuna: coluna.id,
            largura: coluna.largura ? String(coluna.largura) : 'auto'
          },
          bubbles: true,
          composed: true
        })
      );
    };

    btnOk.addEventListener('click', aplicar);
    btnCancel.addEventListener('click', () => {
      dialog.close();
      dialog.remove();
    });
    input.addEventListener('keydown', (ke) => {
      if (ke.key === 'Enter') aplicar();
      if (ke.key === 'Escape') {
        dialog.close();
        dialog.remove();
      }
    });

    input.focus();
    input.select();
  }

  private handleHeaderContextMenu(e: MouseEvent, coluna: TabelaColuna, colIndex: number, thElement: HTMLTableCellElement) {
    e.preventDefault();
    e.stopPropagation();
    this.showPromptPopover(e, coluna, colIndex, thElement);
  }

  private formatWidth(largura?: string | number): string {
    if (largura === undefined || largura === null || largura === '') return '';
    return typeof largura === 'number' ? `${largura}px` : largura;
  }

  private getAlignmentClass(alinhamento?: string): string {
    if (alinhamento === 'centro' || alinhamento === 'center') return 'ui-tabela--alinhar-centro';
    if (alinhamento === 'direita' || alinhamento === 'right') return 'ui-tabela--alinhar-direita';
    return 'ui-tabela--alinhar-esquerda';
  }

  private getTextAlign(alinhamento?: string): string {
    if (alinhamento === 'centro' || alinhamento === 'center') return 'center';
    if (alinhamento === 'direita' || alinhamento === 'right') return 'right';
    return 'left';
  }

  private getRowHeight(): number {
    const d = this.densidade;
    if (d === 'compacta') return 30;
    if (d === 'relaxada') return 56;
    return 42; // normal
  }

  // Renderiza toda a estrutura (Container, Table, Thead)
  public renderTotal() {
    if (!this.shadow) return;

    this.cleanupEventListeners();
    this.shadow.innerHTML = `<style>${estilos}</style>`;

    const maxHeightAttr = this.getAttribute('max-height');
    const container = document.createElement('div');
    container.className = 'ui-tabela-container';
    if (maxHeightAttr) {
      container.style.maxHeight = maxHeightAttr;
    }
    this._containerElement = container;

    // Empty State Placeholder
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'ui-tabela__empty';
    emptyDiv.style.display = 'none';
    
    const svgIcon = document.createElement('div');
    svgIcon.innerHTML = `
      <svg class="ui-tabela__empty-icon" viewBox="0 0 24 24">
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/>
      </svg>`;
      
    const textSpan = document.createElement('span');
    textSpan.className = 'ui-tabela__empty-text';
    textSpan.textContent = this._textoVazio; // Evita XSS
    
    emptyDiv.appendChild(svgIcon);
    emptyDiv.appendChild(textSpan);
    this._emptyElement = emptyDiv;

    // Table elements
    this._tableElement = document.createElement('table');
    this._tableElement.className = 'ui-tabela';
    this._colgroupElement = document.createElement('colgroup');
    this._theadElement = document.createElement('thead');
    this._tbodyElement = document.createElement('tbody');

    this._tableElement.appendChild(this._colgroupElement);
    this._tableElement.appendChild(this._theadElement);
    this._tableElement.appendChild(this._tbodyElement);

    container.appendChild(this._emptyElement);
    container.appendChild(this._tableElement);
    this.shadow.appendChild(container);

    this.renderHeader();
    this.renderBody();

    // Evento de Scroll para Virtualização
    if (this._virtualizar && this._containerElement) {
      this._ticking = false;
      this._scrollHandler = () => {
        if (!this._ticking) {
          window.requestAnimationFrame(() => {
            this.renderBody();
            this._ticking = false;
          });
          this._ticking = true;
        }
      };
      this._containerElement.addEventListener('scroll', this._scrollHandler);
    }
  }

  // Renderiza apenas os cabeçalhos (Thead e Colgroup)
  private renderHeader() {
    if (!this._theadElement || !this._colgroupElement) return;
    
    // Limpar ouvintes antigos vinculados aos cabeçalhos
    this._headerEventListeners.forEach(({ element, type, listener }) => {
      element.removeEventListener(type, listener);
    });
    this._headerEventListeners = [];

    this._theadElement.innerHTML = '';
    this._colgroupElement.innerHTML = '';

    const trHeader = document.createElement('tr');

    this._colunas.forEach((coluna, index) => {
      // Configurar <col> para redimensionamento de CSS no corpo
      const col = document.createElement('col');
      if (coluna.largura !== undefined) {
        col.style.width = this.formatWidth(coluna.largura);
      }
      this._colgroupElement!.appendChild(col);

      // Configurar <th>
      const th = document.createElement('th');
      const alignClass = this.getAlignmentClass(coluna.alinhamento);
      th.className = alignClass;
      th.style.textAlign = this.getTextAlign(coluna.alinhamento);

      if (coluna.largura !== undefined) {
        th.style.width = this.formatWidth(coluna.largura);
      }
      if (coluna.larguraMinima !== undefined) {
        th.style.minWidth = this.formatWidth(coluna.larguraMinima);
      }
      if (coluna.larguraMaxima !== undefined) {
        const maxWStr = this.formatWidth(coluna.larguraMaxima);
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
        const clickListener = () => this.handleHeaderClick(coluna);
        this.addHeaderListener(th, 'click', clickListener);
      }

      const contextMenuListener = (e: Event) => this.handleHeaderContextMenu(e as MouseEvent, coluna, index, th);
      this.addHeaderListener(th, 'contextmenu', contextMenuListener);

      const headerContent = document.createElement('div');
      headerContent.className = 'ui-tabela__header-content';

      const headerText = document.createElement('span');
      headerText.className = 'ui-tabela__header-text';
      headerText.textContent = coluna.rotulo; // Evita XSS
      headerContent.appendChild(headerText);

      const sortIconContainer = document.createElement('span');
      sortIconContainer.className = 'ui-tabela__sort-icon';

      if (coluna.ordenavel) {
        const isSorted = this._colunaOrdenada === coluna.id && this._direcaoOrdenacao !== 'original';
        const isDesc = isSorted && this._direcaoOrdenacao === 'desc';
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

      const mousedownListener = (e: Event) => this.initColumnResize(e as MouseEvent, coluna, index, th, resizer);
      this.addHeaderListener(resizer, 'mousedown', mousedownListener);

      const dblclickListener = (e: Event) => {
        e.stopPropagation();
        coluna.largura = undefined;
        th.style.width = '';
        col.style.width = '';
        this.dispatchEvent(new CustomEvent('ui-column-resize', { bubbles: true, composed: true, detail: { idColuna: coluna.id, largura: 'auto' } }));
      };
      this.addHeaderListener(resizer, 'dblclick', dblclickListener);

      th.appendChild(resizer);
      trHeader.appendChild(th);
    });

    this._theadElement.appendChild(trHeader);
  }

  // Renderiza apenas o corpo, preservando o scroll
  public renderBody() {
    if (!this._tbodyElement || !this._tableElement || !this._emptyElement || !this._containerElement) return;

    if (!this._dadosExibicao || this._dadosExibicao.length === 0) {
      this._emptyElement.style.display = 'flex';
      this._tableElement.style.display = 'none';
      return;
    }

    this._emptyElement.style.display = 'none';
    this._tableElement.style.display = 'table';

    const totalLinhas = this._dadosExibicao.length;
    const rowHeight = this.getRowHeight();
    const usarVirtualizacao = this._virtualizar && totalLinhas > 30;

    let startIndex = 0;
    let endIndex = totalLinhas;

    if (usarVirtualizacao) {
      const scrollTop = this._containerElement.scrollTop;
      const clientHeight = this._containerElement.clientHeight || 400;
      const buffer = 5;

      startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
      endIndex = Math.min(totalLinhas, Math.ceil((scrollTop + clientHeight) / rowHeight) + buffer);
    }

    this._tbodyElement.innerHTML = '';
    const fragment = document.createDocumentFragment();

    // Espaçador Superior
    if (usarVirtualizacao && startIndex > 0) {
      const topSpacerRow = document.createElement('tr');
      topSpacerRow.className = 'ui-tabela__virtual-spacer';
      topSpacerRow.style.height = `${startIndex * rowHeight}px`;
      const tdSpacer = document.createElement('td');
      tdSpacer.colSpan = this._colunas.length || 1;
      topSpacerRow.appendChild(tdSpacer);
      fragment.appendChild(topSpacerRow);
    }

    for (let rowIndex = startIndex; rowIndex < endIndex; rowIndex++) {
      const item = this._dadosExibicao[rowIndex];
      const tr = document.createElement('tr');

      this._colunas.forEach((coluna) => {
        const td = document.createElement('td');
        const alignClass = this.getAlignmentClass(coluna.alinhamento);
        td.className = alignClass;
        td.style.textAlign = this.getTextAlign(coluna.alinhamento);

        if (coluna.larguraMaxima !== undefined) {
          const maxWStr = this.formatWidth(coluna.larguraMaxima);
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
            // FIX: XSS protection
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
      tdSpacer.colSpan = this._colunas.length || 1;
      bottomSpacerRow.appendChild(tdSpacer);
      fragment.appendChild(bottomSpacerRow);
    }

    this._tbodyElement.appendChild(fragment);
  }
}

if (!customElements.get('ui-tabela')) {
  customElements.define('ui-tabela', UITabela);
}
