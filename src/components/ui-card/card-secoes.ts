/**
 * Seções opcionais do card (mídia, cabeçalho, rodapé).
 * Responsabilidade única: dizer se um grupo de slots (nome em português e alias em inglês) tem conteúdo.
 */

/**
 * Há conteúdo atribuído a algum dos slots `nomes`? Conta elementos e texto não vazio (espaços e quebras de linha
 * entre as tags não contam). Também olha os filhos diretos do host com `slot="..."`, que cobre o intervalo antes do
 * `slotchange`. Só filhos diretos: um `[slot]` aninhado em outro elemento pertence a outro componente.
 */
export function secaoTemConteudo(raiz: ShadowRoot | null, host: Element, nomes: readonly string[]): boolean {
  const filhoDireto = Array.from(host.children).some((filho) => nomes.includes(filho.getAttribute('slot') ?? ''));
  if (filhoDireto) return true;
  if (!raiz) return false;

  const slots = Array.from(raiz.querySelectorAll('slot')) as HTMLSlotElement[];
  return slots
    .filter((s) => nomes.includes(s.name))
    .some((s) =>
      s.assignedNodes({ flatten: true }).some(
        (no) => no.nodeType === 1 || (no.nodeType === 3 && (no.textContent ?? '').trim() !== '')
      )
    );
}
