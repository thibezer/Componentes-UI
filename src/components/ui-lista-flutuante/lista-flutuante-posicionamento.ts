/**
 * Gerenciador de posicionamento flutuante e modo responsivo bottom-sheet
 */
export class ListaFlutuantePosicionamento {
  private scrollHandler?: () => void;
  private resizeHandler?: () => void;

  constructor(
    private host: HTMLElement,
    private button: HTMLElement,
    private content: HTMLElement
  ) {}

  public isMobileOrBottomSheet(): boolean {
    if (typeof window === 'undefined') return false;
    return (
      window.innerWidth <= 640 ||
      this.host.hasAttribute('bottom-sheet') ||
      this.host.hasAttribute('modo-mobile')
    );
  }

  public posicionar = (): void => {
    if (this.isMobileOrBottomSheet()) {
      this.content.style.top = '';
      this.content.style.left = '';
      this.content.style.minWidth = '';
      return;
    }

    const rect = this.button.getBoundingClientRect();
    this.content.style.top = `${Math.round(rect.bottom + 2)}px`;
    this.content.style.left = `${Math.round(rect.left)}px`;
    this.content.style.minWidth = `${Math.round(Math.max(rect.width, 120))}px`;
    this.ajustarAoViewport(rect);
  };

  /** Com a lista já visível (medida real): abre para cima se faltar espaço embaixo e não deixa sair pela lateral. */
  private ajustarAoViewport(rect: DOMRect): void {
    const altura = this.content.offsetHeight;
    const largura = this.content.offsetWidth;
    if (altura <= 0 || typeof window === 'undefined') return;
    const folga = 8;
    if (rect.bottom + 2 + altura > window.innerHeight - folga && rect.top - 2 - altura >= folga) {
      this.content.style.top = `${Math.round(rect.top - 2 - altura)}px`;
    }
    if (rect.left + largura > window.innerWidth - folga) {
      this.content.style.left = `${Math.max(folga, Math.round(window.innerWidth - folga - largura))}px`;
    }
  }

  public ativarAcompanhamento(onFechar: () => void): void {
    this.scrollHandler = onFechar;
    this.resizeHandler = this.posicionar;

    window.addEventListener('scroll', this.scrollHandler, { capture: true, passive: true });
    window.addEventListener('resize', this.resizeHandler, { passive: true });

    if (typeof (this.content as any).showPopover === 'function') {
      try {
        (this.content as any).showPopover();
      } catch (_e) {
        // Fallback defensivo
      }
    }
    // Só visível depois do showPopover dá para medir: reposiciona com o tamanho real
    this.posicionar();
  }

  public desativarAcompanhamento(): void {
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler, { capture: true });
      this.scrollHandler = undefined;
    }
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = undefined;
    }

    if (typeof (this.content as any).hidePopover === 'function') {
      try {
        (this.content as any).hidePopover();
      } catch (_e) {
        // Fallback defensivo
      }
    }
  }
}
