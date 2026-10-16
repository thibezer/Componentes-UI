import type { TabelaColuna, UIColumnResizeDetail } from './tipos';
import {
  redimensionarColunaPorDelta,
  iniciarRedimensionamentoColuna,
  exibirPromptPopoverRedimensionamento
} from './tabela-redimensionamento';

export interface ContextoTabelaInteracao {
  host: HTMLElement;
  colgroupElement: HTMLTableColElement | null;
  shadow: ShadowRoot;
  onSetIsResizing: (resizing: boolean) => void;
}

export function executarRedimensionamentoColuna(
  e: MouseEvent | PointerEvent,
  coluna: TabelaColuna,
  colIndex: number,
  thElement: HTMLTableCellElement,
  resizer: HTMLDivElement,
  ctx: ContextoTabelaInteracao
): (() => void) | null {
  return iniciarRedimensionamentoColuna({
    evento: e,
    coluna,
    colIndex,
    thElement,
    resizer,
    colgroupElement: ctx.colgroupElement,
    onResizeStart: () => ctx.onSetIsResizing(true),
    onResizeCancel: () => { setTimeout(() => ctx.onSetIsResizing(false), 50); },
    onResizeEnd: (larguraFinal) => {
      setTimeout(() => ctx.onSetIsResizing(false), 50);
      ctx.host.dispatchEvent(
        new CustomEvent<UIColumnResizeDetail>('ui-column-resize', {
          detail: { idColuna: coluna.id, largura: larguraFinal },
          bubbles: true,
          composed: true
        })
      );
    }
  });
}

export function abrirPopoverRedimensionamento(
  e: MouseEvent,
  coluna: TabelaColuna,
  colIndex: number,
  thElement: HTMLTableCellElement,
  ctx: ContextoTabelaInteracao
): void {
  e.preventDefault();
  e.stopPropagation();
  exibirPromptPopoverRedimensionamento({
    evento: e,
    coluna,
    colIndex,
    thElement,
    colgroupElement: ctx.colgroupElement,
    shadow: ctx.shadow,
    onResizeEnd: (larguraFinal) => {
      ctx.host.dispatchEvent(
        new CustomEvent<UIColumnResizeDetail>('ui-column-resize', {
          detail: { idColuna: coluna.id, largura: larguraFinal },
          bubbles: true,
          composed: true
        })
      );
    }
  });
}

/** Redimensionamento por teclado (setas na alça): ajusta a largura e emite ui-column-resize. */
export function executarRedimensionamentoTeclado(
  delta: number,
  coluna: TabelaColuna,
  thElement: HTMLTableCellElement,
  colElement: HTMLTableColElement | undefined,
  ctx: ContextoTabelaInteracao
): void {
  const largura = redimensionarColunaPorDelta(coluna, thElement, colElement, delta);
  ctx.host.dispatchEvent(
    new CustomEvent<UIColumnResizeDetail>('ui-column-resize', {
      detail: { idColuna: coluna.id, largura },
      bubbles: true,
      composed: true
    })
  );
}
