import estilos from './ui-tabela.css?inline';
import type { DensidadeTabela } from './tipos';

export interface EstruturaDOMElementos {
  containerElement: HTMLDivElement;
  tableElement: HTMLTableElement;
  theadElement: HTMLTableSectionElement;
  tbodyElement: HTMLTableSectionElement;
  colgroupElement: HTMLTableColElement;
  emptyElement: HTMLDivElement;
  loadingElement: HTMLDivElement;
}

export function formatWidth(largura?: string | number): string {
  if (largura === undefined || largura === null || largura === '') return '';
  return typeof largura === 'number' ? `${largura}px` : largura;
}

export function getAlignmentClass(alinhamento?: string): string {
  if (alinhamento === 'centro' || alinhamento === 'center') return 'ui-tabela--alinhar-centro';
  if (alinhamento === 'direita' || alinhamento === 'right') return 'ui-tabela--alinhar-direita';
  return 'ui-tabela--alinhar-esquerda';
}

export function getTextAlign(alinhamento?: string): string {
  if (alinhamento === 'centro' || alinhamento === 'center') return 'center';
  if (alinhamento === 'direita' || alinhamento === 'right') return 'right';
  return 'left';
}

export function getRowHeight(densidade: DensidadeTabela): number {
  if (densidade === 'compacta') return 30;
  if (densidade === 'relaxada') return 56;
  return 42;
}

export function montarEstruturaDOM(
  shadow: ShadowRoot,
  textoVazio: string,
  maxHeightAttr: string | null,
  carregando: boolean
): EstruturaDOMElementos {
  shadow.innerHTML = `<style>${estilos}</style>`;

  const container = document.createElement('div');
  container.className = 'ui-tabela-container';
  if (maxHeightAttr) {
    container.style.maxHeight = maxHeightAttr;
  }

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
  textSpan.textContent = textoVazio;

  emptyDiv.appendChild(svgIcon);
  emptyDiv.appendChild(textSpan);

  // Table elements
  const tableElement = document.createElement('table');
  tableElement.className = 'ui-tabela';
  const colgroupElement = document.createElement('colgroup');
  const theadElement = document.createElement('thead');
  const tbodyElement = document.createElement('tbody');

  tableElement.appendChild(colgroupElement);
  tableElement.appendChild(theadElement);
  tableElement.appendChild(tbodyElement);

  container.appendChild(emptyDiv);
  container.appendChild(tableElement);

  // Overlay de Carregamento
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'ui-tabela__loading';
  loadingDiv.style.display = carregando ? 'flex' : 'none';
  loadingDiv.innerHTML = `
    <div class="ui-tabela__spinner"></div>
    <span>Carregando dados...</span>
  `;
  container.appendChild(loadingDiv);

  shadow.appendChild(container);

  return {
    containerElement: container,
    tableElement,
    theadElement,
    tbodyElement,
    colgroupElement,
    emptyElement: emptyDiv,
    loadingElement: loadingDiv
  };
}
