/**
 * Quando um clique ou uma tecla vinda de dentro do card deve ativá-lo.
 * Responsabilidade única: decidir, sem tocar no DOM, se o evento pertence ao card ou a um controle interno.
 */

const SELETOR_CONTROLE_INTERNO = [
  'button', 'a', 'input', 'select', 'textarea', 'label', 'summary',
  'ui-botao', 'ui-switch', 'ui-checkbox', 'ui-radio', 'ui-campo-texto', 'ui-segmented',
  '[contenteditable]:not([contenteditable="false"])',
  '[role="button"]', '[role="link"]', '[role="checkbox"]', '[role="switch"]', '[role="menuitem"]'
].join(', ');

/**
 * O alvo é (ou está dentro de) um controle com comportamento próprio, entre ele e a `raiz` (o host do card)?
 * Aceita `Element`, e não só `HTMLElement`: o alvo de um clique num ícone é o `<path>` do SVG.
 * Controles fora da `raiz` não contam (um card dentro de um `<a>` ou `<label>` continua clicável), e o próprio
 * host e o `role="button"` da base do card não são "controle interno".
 */
export function ehControleInterno(alvo: EventTarget | null | undefined, raiz: Element): boolean {
  if (typeof Element === 'undefined' || !(alvo instanceof Element)) return false;
  const controle = alvo.closest(SELETOR_CONTROLE_INTERNO);
  return controle !== null && controle !== raiz && raiz.contains(controle);
}

/**
 * A tecla ativa o card? Só Enter/Espaço pressionados no próprio card, sem repetição (tecla mantida) e sem
 * Ctrl/Alt/Meta. Teclas vindas de controles internos (campo, botão) não são do card: ativá-lo e chamar
 * `preventDefault` impediria digitar espaço num `<input>` ou acionar o botão.
 */
export function teclaAtivaCard(
  e: Pick<KeyboardEvent, 'key' | 'repeat' | 'ctrlKey' | 'altKey' | 'metaKey' | 'target'>,
  base: EventTarget
): boolean {
  if (e.key !== 'Enter' && e.key !== ' ') return false;
  if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return false;
  return e.target === base;
}
