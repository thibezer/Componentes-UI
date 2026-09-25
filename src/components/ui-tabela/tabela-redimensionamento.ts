import type { TabelaColuna, UIColumnResizeDetail } from './tipos';

export interface IniciarRedimensionamentoContexto {
  evento: MouseEvent;
  coluna: TabelaColuna;
  colIndex: number;
  thElement: HTMLTableCellElement;
  resizer: HTMLDivElement;
  colgroupElement: HTMLTableColElement | null;
  onResizeStart: () => void;
  onResizeEnd: (larguraFinal: string) => void;
}

/**
 * Gerencia o ciclo de eventos de drag-to-resize de uma coluna da tabela.
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
    onResizeEnd
  } = ctx;

  evento.stopPropagation();
  evento.preventDefault();

  onResizeStart();
  resizer.classList.add('ui-tabela__resizer--ativo');

  const startX = evento.pageX;
  const startWidth = thElement.offsetWidth;
  const colElement = colgroupElement?.children[colIndex] as HTMLTableColElement | undefined;

  const onMouseMove = (moveEvent: MouseEvent) => {
    const deltaX = moveEvent.pageX - startX;
    let novaLargura = startWidth + deltaX;

    if (coluna.larguraMinima !== undefined) {
      const minW =
        typeof coluna.larguraMinima === 'number'
          ? coluna.larguraMinima
          : parseInt(coluna.larguraMinima as string, 10);
      if (!isNaN(minW)) novaLargura = Math.max(minW, novaLargura);
    } else {
      novaLargura = Math.max(60, novaLargura);
    }

    if (coluna.larguraMaxima !== undefined) {
      const maxW =
        typeof coluna.larguraMaxima === 'number'
          ? coluna.larguraMaxima
          : parseInt(coluna.larguraMaxima as string, 10);
      if (!isNaN(maxW)) novaLargura = Math.min(maxW, novaLargura);
    }

    coluna.largura = `${novaLargura}px`;
    thElement.style.width = `${novaLargura}px`;
    if (colElement) {
      colElement.style.width = `${novaLargura}px`;
    }
  };

  const onMouseUp = () => {
    cleanup();
    onResizeEnd(String(coluna.largura));
  };

  const cleanup = () => {
    resizer.classList.remove('ui-tabela__resizer--ativo');
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp);
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

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

/**
 * Exibe o diálogo popover para ajuste numérico preciso da largura da coluna.
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

  const dialog = document.createElement('dialog');
  dialog.className = 'ui-tabela__prompt-dialog';

  dialog.style.position = 'fixed';
  dialog.style.left = `${evento.clientX}px`;
  dialog.style.top = `${evento.clientY}px`;

  const title = document.createElement('div');
  title.className = 'ui-tabela__prompt-title';
  title.textContent = `Largura para "${coluna.rotulo}" (px ou auto):`;

  const input = document.createElement('input');
  input.type = 'text';
  const larguraAtual = coluna.largura
    ? String(coluna.largura).replace('px', '')
    : 'auto';
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

  shadow.appendChild(dialog);
  dialog.showModal();

  const aplicar = () => {
    const novaLargura = input.value;
    const valTrimmed = novaLargura.trim().toLowerCase();
    if (valTrimmed === '' || valTrimmed === 'auto') {
      coluna.largura = undefined;
      thElement.style.width = '';
      if (colgroupElement?.children[colIndex]) {
        (colgroupElement.children[colIndex] as HTMLElement).style.width = '';
      }
    } else {
      const numVal = parseInt(valTrimmed, 10);
      if (!isNaN(numVal) && numVal > 20) {
        coluna.largura = `${numVal}px`;
        thElement.style.width = `${numVal}px`;
        if (colgroupElement?.children[colIndex]) {
          (colgroupElement.children[colIndex] as HTMLElement).style.width = `${numVal}px`;
        }
      }
    }

    dialog.close();
    dialog.remove();

    onResizeEnd(coluna.largura ? String(coluna.largura) : 'auto');
  };

  btnOk.addEventListener('click', (e) => {
    e.stopPropagation();
    aplicar();
  });

  btnCancel.addEventListener('click', (e) => {
    e.stopPropagation();
    dialog.close();
    dialog.remove();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      aplicar();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      dialog.close();
      dialog.remove();
    }
  });

  setTimeout(() => input.focus(), 10);
}
