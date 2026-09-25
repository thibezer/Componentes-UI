const SELETORES_FOCAVEIS = 'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"]), ui-campo-texto, ui-botao, ui-botao-primario, ui-checkbox, ui-switch, ui-lista-flutuante, ui-radio, ui-select, ui-segmented';

/**
 * Localiza todos os elementos focáveis dentro do Shadow DOM e nos slots associados.
 */
export function obterElementosFocaveis(shadowRoot: ShadowRoot, _hostElement?: HTMLElement): HTMLElement[] {
  let shadowFocables = Array.from(shadowRoot.querySelectorAll(SELETORES_FOCAVEIS)) as HTMLElement[];
  shadowFocables = shadowFocables.filter(el => {
    try {
      return window.getComputedStyle(el).display !== 'none';
    } catch {
      return true;
    }
  });

  const slotElements = shadowRoot.querySelectorAll('slot');
  const lightFocables: HTMLElement[] = [];
  slotElements.forEach(slot => {
    const assigned = slot.assignedElements({ flatten: true });
    assigned.forEach(node => {
      if (node instanceof HTMLElement) {
        if (node.matches(SELETORES_FOCAVEIS)) {
          lightFocables.push(node);
        }
        lightFocables.push(...Array.from(node.querySelectorAll(SELETORES_FOCAVEIS)) as HTMLElement[]);
      }
    });
  });

  return [...shadowFocables, ...lightFocables].filter(el => {
    return !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true';
  });
}

/**
 * Verifica se a instância é o drawer/sheet no topo da pilha de abertos.
 */
export function isTopMostDrawer(elemento: HTMLElement): boolean {
  if (typeof document === 'undefined') return true;
  const drawersAbertos = Array.from(
    document.querySelectorAll('ui-drawer[aberto], ui-drawer[open], ui-sheet[aberto], ui-sheet[open]')
  );
  return drawersAbertos[drawersAbertos.length - 1] === elemento;
}

/**
 * Aplica a armadilha de foco (Focus Trap) para navegação estrita com a tecla Tab.
 */
export function gerenciarTabTrap(
  e: KeyboardEvent,
  focables: HTMLElement[],
  hostElement: HTMLElement,
  shadowRoot: ShadowRoot
): void {
  if (focables.length === 0) {
    e.preventDefault();
    return;
  }

  const firstFocable = focables[0];
  const lastFocable = focables[focables.length - 1];
  const root = hostElement.getRootNode() as Document | ShadowRoot;
  const activeEl = root?.activeElement;

  if (e.shiftKey) {
    if (activeEl === firstFocable || (!hostElement.contains(activeEl as Node) && !shadowRoot.contains(activeEl as Node))) {
      e.preventDefault();
      lastFocable.focus();
    }
  } else {
    if (activeEl === lastFocable || (!hostElement.contains(activeEl as Node) && !shadowRoot.contains(activeEl as Node))) {
      e.preventDefault();
      firstFocable.focus();
    }
  }
}

/**
 * Controla o bloqueio de rolagem do body quando drawers ou modais estão visíveis.
 */
export function atualizarScrollLockDrawer(): void {
  if (typeof document === 'undefined') return;
  const abertos = document.querySelectorAll(
    'ui-modal[aberto], ui-modal[open], ui-dialog[aberto], ui-dialog[open], ui-drawer[aberto], ui-drawer[open], ui-sheet[aberto], ui-sheet[open]'
  );
  if (abertos.length > 0) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}
