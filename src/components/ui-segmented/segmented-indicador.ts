/**
 * Controlador do indicador deslizante (pill) do UISegmented
 */
export class SegmentedIndicadorController {
  private rafId: number | null = null;
  private resizeObserver?: ResizeObserver;

  constructor(
    private trackElement: HTMLElement,
    private indicadorElement: HTMLElement
  ) {}

  public iniciarObserver(rootElement: HTMLElement, onResize?: () => void): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.atualizar();
        if (onResize) onResize();
      });
      this.resizeObserver.observe(rootElement);
    }
  }

  public destruir(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  public atualizar(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
    }

    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      const btnAtivo = this.trackElement.querySelector('.ui-segmented__item--ativo') as HTMLElement | null;
      if (!btnAtivo) {
        this.indicadorElement.style.opacity = '0';
        return;
      }

      const offsetLeft = Math.round(btnAtivo.offsetLeft);
      const offsetWidth = Math.round(btnAtivo.offsetWidth);

      this.indicadorElement.style.transform = `translateX(${offsetLeft}px)`;
      this.indicadorElement.style.width = `${offsetWidth}px`;
      this.indicadorElement.style.opacity = '1';
    });
  }
}
