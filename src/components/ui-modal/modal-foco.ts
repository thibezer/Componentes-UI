/**
 * Foco do <ui-modal>: localizar controles focáveis, foco inicial e armadilha de foco (Tab / Shift+Tab).
 * Responsabilidade única: decisões sobre foco; não abre nem fecha o modal.
 */

export const SELETORES_FOCAVEIS = 'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"]), ui-campo-texto, ui-input, ui-botao, ui-botao-primario, ui-checkbox, ui-switch, ui-lista-flutuante, ui-radio, ui-select, ui-segmented';

/** Elemento realmente focado, atravessando Shadow DOMs (ex.: o <button> interno de um <ui-botao>). */
export function elementoAtivoProfundo(): HTMLElement | null {
  let ativo = document.activeElement as HTMLElement | null;
  while (ativo?.shadowRoot?.activeElement) {
    ativo = ativo.shadowRoot.activeElement as HTMLElement;
  }
  return ativo;
}

/**
 * `alvo` é `ativo` ou algum ancestral de `ativo`, subindo também pelos hosts de Shadow DOM.
 * Necessário porque o foco costuma estar num botão interno de um componente (dentro do shadow do `alvo`).
 */
export function contemFoco(alvo: Node, ativo: Node | null): boolean {
  let atual: Node | null = ativo;
  while (atual) {
    if (atual === alvo) return true;
    const raiz: Node = atual.getRootNode();
    atual = atual.parentNode ?? (raiz instanceof ShadowRoot ? raiz.host : null);
  }
  return false;
}

export function ehFocavel(el: HTMLElement): boolean {
  return !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true';
}

/** Focáveis do conteúdo projetado (corpo e rodapé), na ordem dos slots. */
export function focaveisDoConteudo(shadow: ShadowRoot): HTMLElement[] {
  const focaveis: HTMLElement[] = [];
  shadow.querySelectorAll('slot').forEach((slot) => {
    slot.assignedElements({ flatten: true }).forEach((no) => {
      if (!(no instanceof HTMLElement)) return;
      if (no.matches(SELETORES_FOCAVEIS)) focaveis.push(no);
      focaveis.push(...Array.from(no.querySelectorAll<HTMLElement>(SELETORES_FOCAVEIS)));
    });
  });
  return focaveis.filter(ehFocavel);
}

/** Todos os focáveis do modal: os do próprio Shadow DOM (botão fechar, se visível) e depois os do conteúdo. */
export function focaveisDoModal(shadow: ShadowRoot): HTMLElement[] {
  const doShadow = Array.from(shadow.querySelectorAll<HTMLElement>(SELETORES_FOCAVEIS))
    .filter((el) => window.getComputedStyle(el).display !== 'none' && ehFocavel(el));
  return [...doShadow, ...focaveisDoConteudo(shadow)];
}

/**
 * Foco inicial: `[autofocus]`, senão o primeiro controle do conteúdo/rodapé.
 * O botão "✕" não recebe o foco inicial, evitando fechar o modal com um Enter acidental;
 * sem controles, o próprio diálogo é focado para que o leitor de tela anuncie o título.
 */
export function focarConteudoInicial(shadow: ShadowRoot, dialogo: HTMLElement): void {
  const conteudo = focaveisDoConteudo(shadow);
  const comAutofocus = conteudo.filter((el) => el.hasAttribute('autofocus'));

  for (const candidato of [...comAutofocus, ...conteudo]) {
    candidato.focus();
    if (contemFoco(candidato, elementoAtivoProfundo())) return;
  }
  dialogo.focus();
}

/**
 * Mantém o foco dentro do modal: no último controle, Tab volta ao primeiro; no primeiro, Shift+Tab vai ao último.
 * Se o foco está fora do modal, é trazido de volta. Chame no `keydown` de Tab.
 */
export function prenderTab(e: KeyboardEvent, host: HTMLElement, shadow: ShadowRoot): void {
  const focaveis = focaveisDoModal(shadow);
  if (focaveis.length === 0) {
    e.preventDefault();
    return;
  }

  const primeiro = focaveis[0];
  const ultimo = focaveis[focaveis.length - 1];
  const ativo = elementoAtivoProfundo();
  const foraDoModal = !contemFoco(host, ativo);
  const noPrimeiro = contemFoco(primeiro, ativo);
  const noUltimo = contemFoco(ultimo, ativo);

  if (e.shiftKey) {
    if (noPrimeiro || foraDoModal) {
      e.preventDefault();
      ultimo.focus();
    }
  } else if (noUltimo || foraDoModal) {
    e.preventDefault();
    primeiro.focus();
  }
}
