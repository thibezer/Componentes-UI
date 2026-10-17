/**
 * Isolamento do <ui-modal> para tecnologias assistivas: `inert` em tudo o que está "atrás" do modal.
 * Responsabilidade única: aplicar e desfazer o `inert`, preservando o que a página já tinha inerte.
 */

/** Elementos que nunca recebem `inert` (não são conteúdo interativo). */
function ignorado(el: HTMLElement): boolean {
  return el.tagName === 'SCRIPT' || el.tagName === 'STYLE';
}

/**
 * Aplica `inert` em todos os elementos da página que estejam "atrás" do modal,
 * isolando o modal para tecnologias assistivas e interação de teclado/mouse.
 * Devolve o conjunto afetado (os que já eram inertes ficam de fora, para não serem liberados depois).
 */
export function aplicarInertForaDoModal(modalElement: HTMLElement): Set<HTMLElement> {
  const afetados = new Set<HTMLElement>();
  if (typeof document === 'undefined') return afetados;

  const isolar = (candidato: HTMLElement): void => {
    if (candidato === modalElement || candidato.contains(modalElement) || ignorado(candidato)) return;
    if (candidato.inert || candidato.hasAttribute('inert')) return;
    candidato.setAttribute('inert', '');
    // ambientes sem a propriedade refletida ainda respeitam o atributo
    candidato.inert = true;
    afetados.add(candidato);
  };

  // Irmãos de cada ancestral do modal, do mais próximo até o body
  let atual: HTMLElement | null = modalElement;
  while (atual && atual !== document.body && atual !== document.documentElement) {
    const pai: HTMLElement | null = atual.parentElement;
    if (!pai) break;
    Array.from(pai.children).forEach((irmao) => isolar(irmao as HTMLElement));
    atual = pai;
  }

  // Filhos diretos do body (cobre modais dentro de um shadow root ou fora da cadeia acima)
  if (document.body) {
    Array.from(document.body.children).forEach((filho) => isolar(filho as HTMLElement));
  }

  return afetados;
}

/** Remove o estado `inert` dos elementos afetados pelo modal quando este é fechado. */
export function removerInertForaDoModal(elementosAfetados: Set<HTMLElement>): void {
  elementosAfetados.forEach((el) => {
    el.removeAttribute('inert');
    el.inert = false;
  });
  elementosAfetados.clear();
}
