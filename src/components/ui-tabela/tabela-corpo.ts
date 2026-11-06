/**
 * Renderizador do Corpo de Dados e Virtualização (<ui-tabela>).
 * Responsabilidade única: calcular faixas virtuais (windowing), renderizar linhas, células,
 * renderizadores customizados, classes de alinhamento e seleção de registros.
 *
 * Dois modos de renderização:
 * - `completo` (padrão): recria todas as linhas (dados, filtro, ordenação e colunas mudaram; o `render` roda de novo).
 * - `rolagem`: só mexe na janela virtual. Linhas que continuam visíveis (mesmo item, mesma posição, mesmas colunas)
 *   ficam intactas, preservando foco, texto digitado e estado dos controles das células; entram só as linhas novas.
 */

import type { TabelaColuna } from './tipos';
import { alternarPart } from '../../core/parts';
import { capturarFocoCelula, restaurarFocoCelula, registrarValoresRenderizados, itemDaLinha } from './tabela-foco';

export type ModoRenderCorpo = 'completo' | 'rolagem';

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
  /** Linha que recebe tabindex=0 (foco móvel); fora da janela renderizada, vale a primeira visível. */
  indiceAtivo?: number | null;
  /** Há filtro de texto ativo: o vazio vira "sem resultados" (mensagem distinta). */
  filtroAtivo?: boolean;
  textoVazio?: string;
  textoSemResultados?: string;
  /** `completo` recria as linhas; `rolagem` preserva as que seguem na janela virtual. */
  modo?: ModoRenderCorpo;
  /** Posição do item em `dados` (4º argumento do `render`); sem ela vale a posição exibida. */
  indiceOriginal?: (item: Record<string, any>) => number;
  isItemSelecionado: (item: Record<string, any>, index: number) => boolean;
  onLinhaClique: (item: Record<string, any>, index: number) => void;
  formatWidth: (largura?: string | number) => string;
  getAlignmentClass: (alinhamento?: string) => string;
  getTextAlign: (alinhamento?: string) => string;
}

/** Controles de célula: o clique neles pertence ao controle e não seleciona a linha. */
const SELETOR_CONTROLE = [
  'button', 'input', 'select', 'textarea', 'a', 'summary', 'label',
  '[role="button"]', '[role="checkbox"]', '[role="switch"]', '[role="radio"]', '[role="textbox"]',
  '[role="combobox"]', '[role="slider"]', '[role="spinbutton"]', '[role="menuitem"]', '[role="tab"]', '[role="link"]',
  '[contenteditable]:not([contenteditable="false"])',
  '[data-prevent-select]'
].join(', ');

/** Colunas com que cada linha foi montada: linha de outra configuração de colunas nunca é reaproveitada. */
const colunasDaLinha = new WeakMap<Element, TabelaColuna[]>();

/** O clique veio de um controle da célula (inclusive dentro do shadow DOM de um custom element)? */
function cliqueEmControle(e: Event, tr: HTMLElement): boolean {
  for (const no of e.composedPath()) {
    if (no === tr) return false;
    if (no instanceof Element && no.matches(SELETOR_CONTROLE)) return true;
  }
  return false;
}

function criarEspacador(posicao: 'topo' | 'base', altura: number, colSpan: number): HTMLTableRowElement {
  const tr = document.createElement('tr');
  tr.className = 'ui-tabela__virtual-spacer';
  tr.setAttribute('data-espacador', posicao);
  tr.setAttribute('aria-hidden', 'true');
  tr.style.height = `${altura}px`;
  const td = document.createElement('td');
  td.colSpan = colSpan;
  tr.appendChild(td);
  return tr;
}

function criarCelula(ctx: ContextoCorpoTabela, coluna: TabelaColuna, item: Record<string, any>, rowIndex: number): HTMLTableCellElement {
  const td = document.createElement('td');
  const alignClass = ctx.getAlignmentClass(coluna.alinhamento);
  td.className = alignClass;
  td.setAttribute('part', 'celula');
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
    try {
      const indiceDados = ctx.indiceOriginal ? ctx.indiceOriginal(item) : rowIndex;
      const resultado = coluna.render(valor, item, rowIndex, indiceDados);
      if (resultado instanceof Node) {
        cellContent.appendChild(resultado);
      } else {
        // XSS protection
        cellContent.textContent = String(resultado ?? '');
      }
    } catch (erro) {
      // um renderizador com defeito não pode derrubar a tabela inteira
      console.error(`[ui-tabela] Erro no render da coluna "${coluna.id}" (linha ${rowIndex}):`, erro);
      cellContent.textContent = '';
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
  registrarValoresRenderizados(td);
  return td;
}

function criarLinha(ctx: ContextoCorpoTabela, item: Record<string, any>, rowIndex: number, indiceFocavel: number): HTMLTableRowElement {
  const tr = document.createElement('tr');
  itemDaLinha.set(tr, item);
  colunasDaLinha.set(tr, ctx.colunas);
  tr.setAttribute('data-index', String(rowIndex));
  tr.setAttribute('part', 'linha');
  tr.setAttribute('aria-rowindex', String(rowIndex + 2));
  tr.setAttribute('aria-selected', 'false');
  tr.tabIndex = rowIndex === indiceFocavel ? 0 : -1;
  // Zebrado pelo índice do dado: :nth-child contaria o espaçador virtual e inverteria as cores ao rolar
  if (rowIndex % 2 === 1) tr.classList.add('ui-tabela__tr--par');

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
    tr.setAttribute('part', 'linha linha-selecionada');
    tr.setAttribute('aria-current', 'true');
    tr.setAttribute('aria-selected', 'true');
    tr.setAttribute('data-selecionada', 'true');
  }

  tr.addEventListener('click', (e: MouseEvent) => {
    if (cliqueEmControle(e, tr)) return;
    ctx.onLinhaClique(item, rowIndex);
  });

  ctx.colunas.forEach((coluna) => {
    tr.appendChild(criarCelula(ctx, coluna, item, rowIndex));
  });
  return tr;
}

/** Linha mantida na rolagem: só o que depende do estado (foco móvel e seleção) é reaplicado. */
function atualizarLinhaReaproveitada(ctx: ContextoCorpoTabela, tr: HTMLElement, item: Record<string, any>, rowIndex: number, indiceFocavel: number): void {
  tr.tabIndex = rowIndex === indiceFocavel ? 0 : -1;
  const selecionada = ctx.isItemSelecionado(item, rowIndex);
  if (selecionada === tr.classList.contains('ui-tabela__tr--selecionada')) return;
  tr.classList.toggle('ui-tabela__tr--selecionada', selecionada);
  alternarPart(tr, 'linha-selecionada', selecionada);
  tr.setAttribute('aria-selected', String(selecionada));
  if (selecionada) {
    tr.setAttribute('aria-current', 'true');
    tr.setAttribute('data-selecionada', 'true');
  } else {
    tr.removeAttribute('aria-current');
    tr.removeAttribute('data-selecionada');
  }
}

function podeReaproveitar(ctx: ContextoCorpoTabela, tr: HTMLElement, rowIndex: number, inicio: number, fim: number): boolean {
  return rowIndex >= inicio && rowIndex < fim
    && itemDaLinha.get(tr) === ctx.dadosExibicao[rowIndex]
    && colunasDaLinha.get(tr) === ctx.colunas;
}

/** Atualiza a janela virtual no lugar: remove o que saiu, mantém o que ficou e insere o que entrou, em ordem. */
function atualizarJanela(ctx: ContextoCorpoTabela, tbody: HTMLTableSectionElement, inicio: number, fim: number, rowHeight: number, usarVirtualizacao: boolean, indiceFocavel: number): void {
  const totalLinhas = ctx.dadosExibicao.length;
  const colSpan = ctx.colunas.length || 1;

  const reaproveitadas = new Map<number, HTMLElement>();
  let espacadorTopo: HTMLElement | null = null;
  let espacadorBase: HTMLElement | null = null;
  for (const filho of Array.from(tbody.children) as HTMLElement[]) {
    const posicao = filho.getAttribute('data-espacador');
    if (posicao === 'topo') { espacadorTopo = filho; continue; }
    if (posicao === 'base') { espacadorBase = filho; continue; }
    const indice = Number(filho.getAttribute('data-index'));
    if (filho.hasAttribute('data-index') && !reaproveitadas.has(indice) && podeReaproveitar(ctx, filho, indice, inicio, fim)) {
      reaproveitadas.set(indice, filho);
    } else {
      filho.remove();
    }
  }

  const alturaTopo = usarVirtualizacao && inicio > 0 ? inicio * rowHeight : 0;
  if (alturaTopo > 0) {
    if (espacadorTopo) {
      espacadorTopo.style.height = `${alturaTopo}px`;
      (espacadorTopo.firstElementChild as HTMLTableCellElement).colSpan = colSpan;
    } else {
      espacadorTopo = criarEspacador('topo', alturaTopo, colSpan);
      tbody.insertBefore(espacadorTopo, tbody.firstChild);
    }
  } else if (espacadorTopo) {
    espacadorTopo.remove();
    espacadorTopo = null;
  }

  let cursor: ChildNode | null = espacadorTopo ? espacadorTopo.nextSibling : tbody.firstChild;
  for (let rowIndex = inicio; rowIndex < fim; rowIndex++) {
    const item = ctx.dadosExibicao[rowIndex];
    const existente = reaproveitadas.get(rowIndex);
    if (existente) {
      atualizarLinhaReaproveitada(ctx, existente, item, rowIndex, indiceFocavel);
      if (existente === cursor) cursor = existente.nextSibling;
      else tbody.insertBefore(existente, cursor);
    } else {
      tbody.insertBefore(criarLinha(ctx, item, rowIndex, indiceFocavel), cursor);
    }
  }

  const alturaBase = usarVirtualizacao && fim < totalLinhas ? (totalLinhas - fim) * rowHeight : 0;
  if (alturaBase > 0) {
    if (espacadorBase) {
      espacadorBase.style.height = `${alturaBase}px`;
      (espacadorBase.firstElementChild as HTMLTableCellElement).colSpan = colSpan;
      if (espacadorBase.nextSibling) tbody.appendChild(espacadorBase);
    } else {
      tbody.appendChild(criarEspacador('base', alturaBase, colSpan));
    }
  } else if (espacadorBase) {
    espacadorBase.remove();
  }
}

/** Recria o corpo inteiro: espaçadores e todas as linhas da janela. */
function recriarJanela(ctx: ContextoCorpoTabela, tbody: HTMLTableSectionElement, inicio: number, fim: number, rowHeight: number, usarVirtualizacao: boolean, indiceFocavel: number): void {
  const totalLinhas = ctx.dadosExibicao.length;
  const colSpan = ctx.colunas.length || 1;
  tbody.innerHTML = '';
  const fragment = document.createDocumentFragment();

  if (usarVirtualizacao && inicio > 0) fragment.appendChild(criarEspacador('topo', inicio * rowHeight, colSpan));
  for (let rowIndex = inicio; rowIndex < fim; rowIndex++) {
    fragment.appendChild(criarLinha(ctx, ctx.dadosExibicao[rowIndex], rowIndex, indiceFocavel));
  }
  if (usarVirtualizacao && fim < totalLinhas) fragment.appendChild(criarEspacador('base', (totalLinhas - fim) * rowHeight, colSpan));

  tbody.appendChild(fragment);
}

export function renderizarCorpoTabela(ctx: ContextoCorpoTabela): void {
  if (!ctx.tbodyElement || !ctx.tableElement || !ctx.emptyElement || !ctx.containerElement) return;

  ctx.tableElement.setAttribute('aria-colcount', String(ctx.colunas.length));

  if (!ctx.dadosExibicao || ctx.dadosExibicao.length === 0) {
    // O cabeçalho continua visível (contexto das colunas); a mensagem ocupa o lugar das linhas
    ctx.tbodyElement.innerHTML = '';
    ctx.tableElement.setAttribute('aria-rowcount', '1');
    ctx.tableElement.style.display = ctx.colunas.length > 0 ? 'table' : 'none';
    ctx.emptyElement.style.display = 'flex';
    const texto = ctx.emptyElement.querySelector('.ui-tabela__empty-text');
    const mensagem = ctx.filtroAtivo ? ctx.textoSemResultados : ctx.textoVazio;
    if (texto && mensagem !== undefined) texto.textContent = mensagem;
    return;
  }

  ctx.emptyElement.style.display = 'none';
  ctx.tableElement.style.display = 'table';
  // Com virtualização só parte das linhas está no DOM: o total e a posição vão por ARIA (cabeçalho = linha 1)
  ctx.tableElement.setAttribute('aria-rowcount', String(ctx.dadosExibicao.length + 1));

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

  const tbody = ctx.tbodyElement;
  // Recriar linhas descarta o foco: guarda a linha (ou o controle da célula) focada para devolvê-lo depois
  const raiz = tbody.getRootNode() as Document | ShadowRoot;
  const focado = raiz.activeElement as HTMLElement | null;
  const indiceComFoco = focado && focado.parentElement === tbody ? focado.getAttribute('data-index') : null;
  const focoCelula = capturarFocoCelula(tbody);

  const indiceAtivo = ctx.indiceAtivo ?? null;
  const indiceFocavel = indiceAtivo !== null && indiceAtivo >= startIndex && indiceAtivo < endIndex ? indiceAtivo : startIndex;

  if (ctx.modo === 'rolagem') atualizarJanela(ctx, tbody, startIndex, endIndex, rowHeight, usarVirtualizacao, indiceFocavel);
  else recriarJanela(ctx, tbody, startIndex, endIndex, rowHeight, usarVirtualizacao, indiceFocavel);

  if (indiceComFoco !== null) {
    const linha = tbody.querySelector<HTMLElement>(`tr[data-index="${indiceComFoco}"]`);
    if (linha && raiz.activeElement !== linha) linha.focus({ preventScroll: true });
  } else if (focoCelula && !(focado && focado.isConnected)) {
    restaurarFocoCelula(tbody, focoCelula);
  }
}
