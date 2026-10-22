/*
 * O foco está num campo de texto? `document.activeElement` não serve: dentro de um shadow root
 * ele devolve o elemento hospedeiro, não o <input>. O alvo real do evento atravessa o shadow
 * pelo `composedPath()`; sem evento, desce pelos `shadowRoot.activeElement`.
 */

function ehCampoDeTexto(el: Element | null | undefined): boolean {
  if (!el) return false;
  const h = el as HTMLElement;
  return h.tagName === 'INPUT' || h.tagName === 'TEXTAREA' || h.tagName === 'SELECT' || h.isContentEditable === true;
}

/** Controles que o Enter/Espaço ativam por conta própria; um atalho global de Enter não pode sequestrá-los. */
const SELETOR_ACIONAVEL = 'button, a[href], summary, [role="button"], [role="menuitem"], [role="tab"], [role="switch"], [role="checkbox"], [role="option"]';

/**
 * O alvo real do evento (atravessando shadow roots) é um botão, link ou outro controle acionável?
 * Serve para atalhos globais de Enter: com o foco num botão, o Enter pertence ao botão.
 */
export function focoEmControleAcionavel(evento: Event): boolean {
  const origem = evento.composedPath?.()[0] ?? evento.target;
  if (!(origem instanceof Element)) return false;
  return origem.closest(SELETOR_ACIONAVEL) !== null;
}

export function focoEmCampoDeTexto(evento?: Event): boolean {
  const origem = evento?.composedPath?.()[0];
  if (origem instanceof Element) return ehCampoDeTexto(origem);

  let el: Element | null = typeof document === 'undefined' ? null : document.activeElement;
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
  return ehCampoDeTexto(el);
}
