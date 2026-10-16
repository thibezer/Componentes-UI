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
  erroElement: HTMLDivElement;
  /** Região só para leitores de tela (contagem de resultados do filtro). */
  anuncioElement: HTMLDivElement;
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
  container.setAttribute('part', 'base');
  if (maxHeightAttr) {
    container.style.maxHeight = maxHeightAttr;
  }

  // Empty State Placeholder
  const emptyDiv = document.createElement('div');
  emptyDiv.className = 'ui-tabela__empty';
  emptyDiv.setAttribute('part', 'vazio');
  emptyDiv.style.display = 'none';
  emptyDiv.setAttribute('role', 'status');

  const svgIcon = document.createElement('div');
  svgIcon.innerHTML = `
    <svg class="ui-tabela__empty-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24">
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
  tableElement.setAttribute('part', 'tabela');
  tableElement.setAttribute('role', 'grid');
  const colgroupElement = document.createElement('colgroup');
  const theadElement = document.createElement('thead');
  const tbodyElement = document.createElement('tbody');

  tableElement.appendChild(colgroupElement);
  tableElement.appendChild(theadElement);
  tableElement.appendChild(tbodyElement);

  // Erro de carregamento remoto (oculto até um ui-fetch-erro)
  const erroDiv = document.createElement('div');
  erroDiv.className = 'ui-tabela__erro';
  erroDiv.setAttribute('part', 'erro');
  erroDiv.setAttribute('role', 'alert');
  erroDiv.style.display = 'none';
  const erroTexto = document.createElement('div');
  erroTexto.className = 'ui-tabela__erro-texto';
  const erroMsg = document.createElement('span');
  erroMsg.className = 'ui-tabela__erro-mensagem';
  const erroDetalhe = document.createElement('span');
  erroDetalhe.className = 'ui-tabela__erro-detalhe';
  erroTexto.appendChild(erroMsg);
  erroTexto.appendChild(erroDetalhe);
  const erroAcao = document.createElement('button');
  erroAcao.type = 'button';
  erroAcao.className = 'ui-tabela__erro-acao';
  erroAcao.setAttribute('part', 'erro-acao');
  erroAcao.textContent = 'Tentar novamente';
  erroDiv.appendChild(erroTexto);
  erroDiv.appendChild(erroAcao);

  const anuncioDiv = document.createElement('div');
  anuncioDiv.className = 'ui-tabela__sr';
  anuncioDiv.setAttribute('role', 'status');
  anuncioDiv.setAttribute('aria-live', 'polite');

  container.appendChild(erroDiv);
  container.appendChild(tableElement);
  container.appendChild(emptyDiv);
  container.appendChild(anuncioDiv);

  // Overlay de Carregamento
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'ui-tabela__loading';
  loadingDiv.setAttribute('part', 'carregando');
  loadingDiv.setAttribute('role', 'status');
  loadingDiv.setAttribute('aria-live', 'polite');
  loadingDiv.style.display = carregando ? 'flex' : 'none';
  loadingDiv.innerHTML = `
    <div class="ui-tabela__spinner" aria-hidden="true"></div>
    <span class="ui-tabela__loading-texto">Carregando dados...</span>
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
    loadingElement: loadingDiv,
    erroElement: erroDiv,
    anuncioElement: anuncioDiv
  };
}
