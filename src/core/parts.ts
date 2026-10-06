/**
 * Liga ou desliga um nome no atributo `part`, expondo estados ao CSS do consumidor
 * (ex.: `ui-tabela::part(linha-selecionada)`). Usa o atributo em vez de `Element.part`
 * para funcionar também em ambientes sem DOMTokenList de part (SSR, happy-dom).
 */
export function alternarPart(el: Element, nome: string, ativo: boolean): void {
  const nomes = new Set((el.getAttribute('part') || '').split(/\s+/).filter(Boolean));
  if (ativo) nomes.add(nome);
  else nomes.delete(nome);
  el.setAttribute('part', Array.from(nomes).join(' '));
}
