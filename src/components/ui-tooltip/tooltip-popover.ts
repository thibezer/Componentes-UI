/**
 * Adaptador da Popover API para o balão do <ui-tooltip>.
 * Responsabilidade única: abrir/fechar o balão na camada superior (top layer) quando o navegador suporta
 * `popover`, sem casts soltos e sem engolir erros inesperados.
 */

type ElementoComPopover = HTMLElement & {
  showPopover?: () => void;
  hidePopover?: () => void;
};

/** `InvalidStateError` é o esperado quando já está no estado pedido; só ele é ignorado. */
function ehEstadoJaAplicado(erro: unknown): boolean {
  return erro instanceof DOMException && erro.name === 'InvalidStateError';
}

export function mostrarPopover(el: HTMLElement): void {
  const alvo = el as ElementoComPopover;
  if (typeof alvo.showPopover !== 'function') return;
  try {
    alvo.showPopover();
  } catch (erro) {
    if (!ehEstadoJaAplicado(erro)) console.warn('[ui-tooltip] Não foi possível abrir o balão como popover:', erro);
  }
}

export function ocultarPopover(el: HTMLElement): void {
  const alvo = el as ElementoComPopover;
  if (typeof alvo.hidePopover !== 'function') return;
  try {
    alvo.hidePopover();
  } catch (erro) {
    if (!ehEstadoJaAplicado(erro)) console.warn('[ui-tooltip] Não foi possível fechar o balão como popover:', erro);
  }
}
