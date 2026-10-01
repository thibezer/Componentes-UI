/**
 * Utilitários de Acessibilidade WAI-ARIA e Gerenciamento de 'inert' para UIModal / UIDialog.
 */

/**
 * Aplica o atributo 'inert' em todos os elementos da página que estejam "atrás" do modal,
 * isolando o modal para tecnologias assistivas e interação de teclado/mouse.
 */
export function aplicarInertForaDoModal(modalElement: HTMLElement): Set<HTMLElement> {
  const elementosAfetados = new Set<HTMLElement>();
  if (typeof document === 'undefined') return elementosAfetados;

  let atual: HTMLElement | null = modalElement;

  while (atual && atual !== document.body && atual !== document.documentElement) {
    const pai: HTMLElement | null = atual.parentElement;
    if (!pai) break;

    const irmaos = Array.from(pai.children) as HTMLElement[];
    for (const irmao of irmaos) {
      if (irmao !== atual && !irmao.contains(modalElement) && irmao.tagName !== 'SCRIPT' && irmao.tagName !== 'STYLE') {
        const jaEraInert = irmao.hasAttribute('inert') || (irmao as any).inert === true;
        if (!jaEraInert) {
          irmao.setAttribute('inert', '');
          try {
            (irmao as any).inert = true;
          } catch {
            // Em ambientes sem suporte a getter/setter da propriedade inert
          }
          elementosAfetados.add(irmao);
        }
      }
    }
    atual = pai;
  }

  // Também verifica irmãos diretos do body
  if (document.body) {
    const filhosBody = Array.from(document.body.children) as HTMLElement[];
    for (const filho of filhosBody) {
      if (filho !== modalElement && !filho.contains(modalElement) && filho.tagName !== 'SCRIPT' && filho.tagName !== 'STYLE') {
        const jaEraInert = filho.hasAttribute('inert') || (filho as any).inert === true;
        if (!jaEraInert) {
          filho.setAttribute('inert', '');
          try {
            (filho as any).inert = true;
          } catch {}
          elementosAfetados.add(filho);
        }
      }
    }
  }

  return elementosAfetados;
}

/**
 * Remove o estado 'inert' dos elementos afetados pelo modal quando este é fechado.
 */
export function removerInertForaDoModal(elementosAfetados: Set<HTMLElement>): void {
  elementosAfetados.forEach(el => {
    try {
      el.removeAttribute('inert');
      (el as any).inert = false;
    } catch {}
  });
  elementosAfetados.clear();
}
