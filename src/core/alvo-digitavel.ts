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

export function focoEmCampoDeTexto(evento?: Event): boolean {
  const origem = evento?.composedPath?.()[0];
  if (origem instanceof Element) return ehCampoDeTexto(origem);

  let el: Element | null = typeof document === 'undefined' ? null : document.activeElement;
  while (el?.shadowRoot?.activeElement) el = el.shadowRoot.activeElement;
  return ehCampoDeTexto(el);
}
