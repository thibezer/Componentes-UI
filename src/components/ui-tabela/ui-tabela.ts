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
    return ['texto-vazio', 'empty-text', 'max-height', 'densidade', 'density'];
  }

  private shadow: ShadowRoot;
  private _colunas: TabelaColuna[] = [];
  private _dadosOriginais: Record<string, any>[] = [];
  private _dadosExibicao: Record<string, any>[] = [];
  private _colunaOrdenada: string | null = null;
  private _direcaoOrdenacao: 'asc' | 'desc' | 'original' = 'original';
  private _textoVazio: string = 'Nenhum registro encontrado';
  private _isResizing: boolean = false;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.syncAttributes();
    if (!this.hasAttribute('densidade') && !this.hasAttribute('density')) {
      this.setAttribute('densidade', 'normal');
    }
    this.render();
  }

  attributeChangedCallback(_name: string, _oldVal: string | null, _newVal: string | null) {
    this.syncAttributes();
    this.render();
  }

  private syncAttributes() {
    const textoVazioAttr = this.getAttribute('texto-vazio') || this.getAttribute('empty-text');
    if (textoVazioAttr) {
      this._textoVazio = textoVazioAttr;
    }
  }

  // Getters & Setters Reativos
  get colunas(): TabelaColuna[] {
    return this._colunas;
  }

  set colunas(val: TabelaColuna[]) {
    this._colunas = Array.isArray(val) ? val : [];
    this.render();
  }

  get dados(): Record<string, any>[] {
    return this._dadosOriginais;
  }

  set dados(val: Record<string, any>[]) {
    const arrayVal = Array.isArray(val) ? val : [];
    this._dadosOriginais = [...arrayVal];
    this.aplicarOrdenacao();
    this.render();
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
    this.render();
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
    this.render();
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
    this.render();
  }

  get textoVazio(): string {
    return this._textoVazio;
  }

  set textoVazio(txt: string) {
    this._textoVazio = txt || 'Nenhum registro encontrado';
    this.render();
  }

  // Ordenação Local Client-Side de 3 Estados (Ascendente -> Descendente -> Original)
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
    this.render();

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

  // Interação de Redimensionamento Tipo Excel (Drag-to-resize)
  private initColumnResize(e: MouseEvent, coluna: TabelaColuna, thElement: HTMLTableCellElement, resizer: HTMLDivElement) {
    e.stopPropagation();
    e.preventDefault();

    this._isResizing = true;
    resizer.classList.add('ui-tabela__resizer--ativo');

    const startX = e.pageX;
    const startWidth = thElement.offsetWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.pageX - startX;
      let novaLargura = startWidth + deltaX;

      if (coluna.larguraMinima !== undefined) {
        const minW = typeof coluna.larguraMinima === 'number' ? coluna.larguraMinima : parseInt(coluna.larguraMinima, 10);
        if (!isNaN(minW)) novaLargura = Math.max(minW, novaLargura);
      } else {
        novaLargura = Math.max(60, novaLargura);
      }

      if (coluna.larguraMaxima !== undefined) {
        const maxW = typeof coluna.larguraMaxima === 'number' ? coluna.larguraMaxima : parseInt(coluna.larguraMaxima, 10);
        if (!isNaN(maxW)) novaLargura = Math.min(maxW, novaLargura);
      }

      coluna.largura = `${novaLargura}px`;
      thElement.style.width = `${novaLargura}px`;
    };

    const onMouseUp = () => {
      resizer.classList.remove('ui-tabela__resizer--ativo');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);

      setTimeout(() => {
        this._isResizing = false;
      }, 50);

      this.render();

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

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  // Menu de Contexto (Botão Direito no Cabeçalho para Digitar Largura Exata)
  private handleHeaderContextMenu(e: MouseEvent, coluna: TabelaColuna) {
    e.preventDefault();
    e.stopPropagation();

    const larguraAtual = coluna.largura ? String(coluna.largura).replace('px', '') : 'Auto';
    const novaLargura = prompt(`Digitar largura exata para a coluna "${coluna.rotulo}" (em pixels ou "auto"):`, larguraAtual);

    if (novaLargura !== null) {
      const valTrimmed = novaLargura.trim().toLowerCase();
      if (valTrimmed === '' || valTrimmed === 'auto') {
        coluna.largura = undefined;
      } else {
        const numVal = parseInt(valTrimmed, 10);
        if (!isNaN(numVal) && numVal > 20) {
          coluna.largura = `${numVal}px`;
        }
      }

      this.render();

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
    }
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

  public render() {
    if (!this.shadow) return;

    // Limpar o shadow DOM
    this.shadow.innerHTML = `<style>${estilos}</style>`;

    const maxHeightAttr = this.getAttribute('max-height');
    const container = document.createElement('div');
    container.className = 'ui-tabela-container';
    if (maxHeightAttr) {
      container.style.maxHeight = maxHeightAttr;
    }

    // Tratar Empty State (Tabela Vazia)
    if (!this._dadosExibicao || this._dadosExibicao.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'ui-tabela__empty';
      emptyDiv.innerHTML = `
        <svg class="ui-tabela__empty-icon" viewBox="0 0 24 24">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zM7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/>
        </svg>
        <span class="ui-tabela__empty-text">${this._textoVazio}</span>
      `;
      container.appendChild(emptyDiv);
      this.shadow.appendChild(container);
      return;
    }

    // Construção de Tabela com Dados
    const tabela = document.createElement('table');
    tabela.className = 'ui-tabela';

    // 1. Cabeçalho (thead / th)
    const thead = document.createElement('thead');
    const trHeader = document.createElement('tr');

    this._colunas.forEach((coluna) => {
      const th = document.createElement('th');
      const alignClass = this.getAlignmentClass(coluna.alinhamento);
      th.className = alignClass;
      th.style.textAlign = this.getTextAlign(coluna.alinhamento);

      // Controle de Largura (largura, larguraMinima, larguraMaxima)
      if (coluna.largura !== undefined) {
        const wStr = this.formatWidth(coluna.largura);
        th.style.width = wStr;
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
        th.addEventListener('click', () => this.handleHeaderClick(coluna));
      }

      // Clique com botão direito no cabeçalho (Digitar largura exata em px)
      th.addEventListener('contextmenu', (e) => this.handleHeaderContextMenu(e, coluna));

      const headerContent = document.createElement('div');
      headerContent.className = 'ui-tabela__header-content';

      // Rótulo do Cabeçalho (distância fixada em 90px pelo CSS)
      const headerText = document.createElement('span');
      headerText.className = 'ui-tabela__header-text';
      headerText.textContent = coluna.rotulo;
      headerContent.appendChild(headerText);

      // Espaço da seta/ícone (espaço fixado em 70px pelo CSS)
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

      // Alça de Redimensionamento Tipo Excel (Drag-to-resize handle)
      const resizer = document.createElement('div');
      resizer.className = 'ui-tabela__resizer';
      resizer.title = 'Arrastar para redimensionar largura (ou duplo-clique para auto-ajuste)';
      resizer.addEventListener('mousedown', (e) => this.initColumnResize(e, coluna, th, resizer));
      resizer.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        coluna.largura = undefined;
        this.render();
      });

      th.appendChild(resizer);
      trHeader.appendChild(th);
    });

    thead.appendChild(trHeader);
    tabela.appendChild(thead);

    // 2. Corpo da Tabela (tbody / tr / td)
    const tbody = document.createElement('tbody');
    const fragment = document.createDocumentFragment();

    this._dadosExibicao.forEach((item, rowIndex) => {
      const tr = document.createElement('tr');

      this._colunas.forEach((coluna) => {
        const td = document.createElement('td');
        const alignClass = this.getAlignmentClass(coluna.alinhamento);
        td.className = alignClass;
        td.style.textAlign = this.getTextAlign(coluna.alinhamento);

        // Controle de Largura (largura, larguraMinima, larguraMaxima)
        if (coluna.largura !== undefined) {
          td.style.width = this.formatWidth(coluna.largura);
        }
        if (coluna.larguraMinima !== undefined) {
          td.style.minWidth = this.formatWidth(coluna.larguraMinima);
        }
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
            cellContent.innerHTML = String(resultado ?? '');
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
    });

    tbody.appendChild(fragment);
    tabela.appendChild(tbody);

    container.appendChild(tabela);
    this.shadow.appendChild(container);
  }
}

if (!customElements.get('ui-tabela')) {
  customElements.define('ui-tabela', UITabela);
}
