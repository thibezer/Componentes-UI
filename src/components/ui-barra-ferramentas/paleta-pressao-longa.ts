/**
 * Clique longo (pressão) da <ui-paleta-ferramentas>: abre o flyout de um grupo sem ativar a ferramenta.
 * Responsabilidade única: temporizadores e limiar de movimento da pressão, mais a supressão do `click` residual
 * que o navegador dispara ao soltar. Não conhece botões nem menus: quem usa decide o que fazer ao disparar.
 */

export const TEMPO_PRESSAO_LONGA_MS = 380;
export const DISTANCIA_CANCELA_PRESSAO_PX = 8;
export const TEMPO_LIMPA_SUPRESSAO_MS = 50;

export class PressaoLonga {
  private timer: number | undefined;
  private timerSupressao: number | undefined;
  private inicio: { x: number; y: number } | null = null;
  private suprimir = false;

  /** Começa a contar; `aoDisparar` roda se o ponteiro ficar parado até `TEMPO_PRESSAO_LONGA_MS`. */
  public iniciar(x: number, y: number, aoDisparar: () => void): void {
    this.cancelar();
    window.clearTimeout(this.timerSupressao);
    this.inicio = { x, y };
    this.timer = window.setTimeout(() => {
      this.suprimir = true;
      aoDisparar();
    }, TEMPO_PRESSAO_LONGA_MS);
  }

  /** Arrastar/rolar com o dedo cancela o clique longo. */
  public mover(x: number, y: number): void {
    if (this.timer === undefined || !this.inicio) return;
    if (Math.hypot(x - this.inicio.x, y - this.inicio.y) > DISTANCIA_CANCELA_PRESSAO_PX) this.cancelar();
  }

  /** Fim do gesto: cancela a contagem e, se o flyout abriu, descarta a supressão logo após o `click` residual. */
  public fim(): void {
    this.cancelar();
    if (!this.suprimir) return;
    window.clearTimeout(this.timerSupressao);
    this.timerSupressao = window.setTimeout(() => {
      this.suprimir = false;
    }, TEMPO_LIMPA_SUPRESSAO_MS);
  }

  public cancelar(): void {
    if (this.timer !== undefined) {
      window.clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.inicio = null;
  }

  /** `true` (uma única vez) se o próximo `click` deve ser ignorado por ser o resíduo de uma pressão longa. */
  public consumirSupressao(): boolean {
    if (!this.suprimir) return false;
    this.suprimir = false;
    window.clearTimeout(this.timerSupressao);
    return true;
  }

  public destruir(): void {
    this.cancelar();
    window.clearTimeout(this.timerSupressao);
    this.suprimir = false;
  }
}
