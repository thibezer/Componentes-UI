import type { TabelaColuna } from './tipos';

export interface IniciarRedimensionamentoContexto {
  evento: MouseEvent | PointerEvent;
  coluna: TabelaColuna;
  colIndex: number;
  thElement: HTMLTableCellElement;
  resizer: HTMLDivElement;
  colgroupElement: HTMLTableColElement | null;
  onResizeStart: () => void;
  onResizeEnd: (larguraFinal: string) => void;
  /** Soltou sem arrastar: nada mudou, só libera o estado de redimensionamento. */
  onResizeCancel?: () => void;
}

function limite(v: string | number | undefined): number | null {
  if (v === undefined) return null;
  const n = typeof v === 'number' ? v : parseInt(v, 10);
  return isNaN(n) ? null : n;
}

/** Aplica os limites da coluna (mínimo padrão 60px, máximo opcional). */
export function limitarLarguraColuna(coluna: TabelaColuna, largura: number): number {
  const min = limite(coluna.larguraMinima);
  let v = Math.max(min ?? 60, largura);
  const max = limite(coluna.larguraMaxima);
  if (max !== null) v = Math.min(max, v);
  return v;
}

/** Redimensiona por teclado: soma `delta` px à largura atual (respeitando os limites). Devolve a largura final. */
export function redimensionarColunaPorDelta(
  coluna: TabelaColuna,
  thElement: HTMLTableCellElement,
  colElement: HTMLTableColElement | undefined,
  delta: number
): string {
  const nova = limitarLarguraColuna(coluna, thElement.offsetWidth + delta);
  coluna.largura = `${nova}px`;
  thElement.style.width = `${nova}px`;
  if (colElement) colElement.style.width = `${nova}px`;
  return `${nova}px`;
}

/**
 * Gerencia o ciclo de eventos de drag-to-resize de uma coluna da tabela.
 * Aceita mouse (mousedown) e toque/caneta (pointerdown); os ouvintes seguem o mesmo tipo do evento inicial.
 */
export function iniciarRedimensionamentoColuna(
  ctx: IniciarRedimensionamentoContexto
): () => void {
  const {
    evento,
    coluna,
    colIndex,
    thElement,
    resizer,
    colgroupElement,
    onResizeStart,
    onResizeEnd,
    onResizeCancel
  } = ctx;

  evento.stopPropagation();
  evento.preventDefault();

  onResizeStart();
  resizer.classList.add('ui-tabela__resizer--ativo');

  const startX = evento.pageX;
  const startWidth = thElement.offsetWidth;
  const colElement = colgroupElement?.children[colIndex] as HTMLTableColElement | undefined;

  const usaPointer = evento.type === 'pointerdown';
  const pointerId = usaPointer ? (evento as PointerEvent).pointerId : null;
  const nomeMove = usaPointer ? 'pointermove' : 'mousemove';
  const nomeUp = usaPointer ? 'pointerup' : 'mouseup';

  let moveu = false;
  const onMouseMove = (ev: Event) => {
    const moveEvent = ev as MouseEvent;
    if (pointerId !== null && (moveEvent as PointerEvent).pointerId !== pointerId) return;
    moveu = true;
    const novaLargura = limitarLarguraColuna(coluna, startWidth + (moveEvent.pageX - startX));

    coluna.largura = `${novaLargura}px`;
    thElement.style.width = `${novaLargura}px`;
    if (colElement) {
      colElement.style.width = `${novaLargura}px`;
    }
  };

  const onMouseUp = () => {
    cleanup();
    if (moveu) onResizeEnd(String(coluna.largura));
    else onResizeCancel?.();
  };

  const cleanup = () => {
    resizer.classList.remove('ui-tabela__resizer--ativo');
    window.removeEventListener(nomeMove, onMouseMove);
    window.removeEventListener(nomeUp, onMouseUp);
    if (usaPointer) window.removeEventListener('pointercancel', onMouseUp);
  };

  window.addEventListener(nomeMove, onMouseMove);
  window.addEventListener(nomeUp, onMouseUp);
  if (usaPointer) window.addEventListener('pointercancel', onMouseUp);

  return cleanup;
}

export interface ExibirPromptPopoverContexto {
  evento: MouseEvent;
  coluna: TabelaColuna;
  colIndex: number;
  thElement: HTMLTableCellElement;
  colgroupElement: HTMLTableColElement | null;
  shadow: ShadowRoot;
  onResizeEnd: (larguraFinal: string) => void;
}

const LARGURA_MINIMA_DIALOGO = 20;
let contadorDialogo = 0;

/**
 * Exibe o diálogo para ajuste numérico preciso da largura da coluna.
 * Campo numérico rotulado (vazio = automática), validação inline, posicionado junto ao ponto de origem
 * e mantido dentro da janela; devolve o foco ao cabeçalho ao fechar.
 */
export function exibirPromptPopoverRedimensionamento(
  ctx: ExibirPromptPopoverContexto
): void {
  const {
    evento,
    coluna,
    colIndex,
    thElement,
    colgroupElement,
    shadow,
    onResizeEnd
  } = ctx;

  const id = `ui-tabela-dlg-${++contadorDialogo}`;
  const dialog = document.createElement('dialog');
  dialog.className = 'ui-tabela__prompt-dialog';
  dialog.setAttribute('part', 'dialogo');
  dialog.setAttribute('aria-labelledby', `${id}-titulo`);

  const title = document.createElement('label');
  title.className = 'ui-tabela__prompt-title';
  title.id = `${id}-titulo`;
  title.htmlFor = `${id}-campo`;
  title.textContent = `Largura de "${coluna.rotulo}" (px; vazio = automática)`;

  const input = document.createElement('input');
  input.id = `${id}-campo`;
  input.type = 'number';
  input.min = String(LARGURA_MINIMA_DIALOGO);
  input.step = '1';
  input.setAttribute('inputmode', 'numeric');
  input.placeholder = 'auto';
  const atual = coluna.largura ? parseInt(String(coluna.largura), 10) : NaN;
  input.value = Number.isFinite(atual) ? String(atual) : '';

  const erro = document.createElement('div');
  erro.className = 'ui-tabela__prompt-erro';
  erro.id = `${id}-erro`;
  erro.setAttribute('role', 'alert');

  const actions = document.createElement('div');
  actions.className = 'ui-tabela__prompt-actions';

  const btnOk = document.createElement('button');
  btnOk.type = 'button';
  btnOk.textContent = 'Aplicar';
  const btnCancel = document.createElement('button');
  btnCancel.type = 'button';
  btnCancel.textContent = 'Cancelar';

  actions.appendChild(btnCancel);
  actions.appendChild(btnOk);

  dialog.appendChild(title);
  dialog.appendChild(input);
  dialog.appendChild(erro);
  dialog.appendChild(actions);

  shadow.appendChild(dialog);
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');

  // Posição: junto ao ponto de origem, sempre dentro da janela
  dialog.style.position = 'fixed';
  const caixa = dialog.getBoundingClientRect();
  const largura = caixa.width || 240;
  const altura = caixa.height || 140;
  const x = Math.max(8, Math.min(evento.clientX || 0, window.innerWidth - largura - 8));
  const y = Math.max(8, Math.min(evento.clientY || 0, window.innerHeight - altura - 8));
  dialog.style.left = `${x}px`;
  dialog.style.top = `${y}px`;

  let fechado = false;
  const fechar = () => {
    if (fechado) return;
    fechado = true;
    if (dialog.open && typeof dialog.close === 'function') dialog.close();
    dialog.remove();
    thElement.querySelector<HTMLElement>('.ui-tabela__ordenar, .ui-tabela__resizer')?.focus();
  };

  const mostrarErro = (msg: string) => {
    erro.textContent = msg;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', erro.id);
    input.focus();
  };

  const aplicar = () => {
    const antes = coluna.largura;
    const bruto = input.value.trim();
    if (bruto === '') {
      coluna.largura = undefined;
      thElement.style.width = '';
      if (colgroupElement?.children[colIndex]) {
        (colgroupElement.children[colIndex] as HTMLElement).style.width = '';
      }
    } else {
      const numVal = Number(bruto);
      if (!Number.isFinite(numVal) || numVal < LARGURA_MINIMA_DIALOGO) {
        mostrarErro(`Informe um valor de pelo menos ${LARGURA_MINIMA_DIALOGO} px, ou deixe vazio para automática.`);
        return;
      }
      const px = Math.round(limitarLarguraColuna({ ...coluna, larguraMinima: coluna.larguraMinima ?? LARGURA_MINIMA_DIALOGO }, numVal));
      coluna.largura = `${px}px`;
      thElement.style.width = `${px}px`;
      if (colgroupElement?.children[colIndex]) {
        (colgroupElement.children[colIndex] as HTMLElement).style.width = `${px}px`;
      }
    }

    fechar();

    if (coluna.largura !== antes) onResizeEnd(coluna.largura ? String(coluna.largura) : 'auto');
  };

  btnOk.addEventListener('click', (e) => {
    e.stopPropagation();
    aplicar();
  });

  btnCancel.addEventListener('click', (e) => {
    e.stopPropagation();
    fechar();
  });

  // Esc nativo do <dialog> dispara `close`: garante a remoção do nó e o retorno do foco
  dialog.addEventListener('close', fechar);

  input.addEventListener('input', () => {
    erro.textContent = '';
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      aplicar();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      fechar();
    }
  });

  input.focus();
  input.select?.();
}
