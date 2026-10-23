/**
 * Ponteiro sobre as feições do <ui-canvas-cad>: hover (`cad-feicao-hover`), menu de contexto (`cad-feicao-menu`) e duplo clique
 * (`cad-feicao-duplo-clique`).
 * Responsabilidade única: traduzir o movimento/clique direito do mouse na feição sob o cursor e emitir o evento.
 */
import type { Feicao, LatLonPar } from '../../gerencigeo-canvas/feature_types';

export interface PortasPonteiro {
  /** Com `cancelavel`, devolve `true` se algum ouvinte chamou `preventDefault()`. */
  emitir: (evento: string, detalhe: unknown, cancelavel?: boolean) => unknown;
  feicaoSob: (clientX: number, clientY: number) => { feicao: Feicao | null; coordenada: LatLonPar } | null;
  /** Mouse parado para o hover: uma ferramenta de desenho ou a edição de vértices está ativa. */
  interacaoAtiva: () => boolean;
  /** Se há ferramenta ativa, entrega a ela o botão direito e devolve `true` (não abre menu). */
  botaoDireitoDaFerramenta: () => boolean;
  /** Pedido explícito de informações: abre o popup da feição. */
  abrirPopup?: (feicao: Feicao) => void;
  /** O duplo clique pode abrir o popup (falso com `popups="desligado"`). Sem a função, pode. */
  popupNoDuploClique?: () => boolean;
}

export class PonteiroFeicoes {
  private hoverId: string | null = null;
  private hoverAgendado = false;

  constructor(private p: PortasPonteiro) {}

  /** Emite `cad-feicao-hover` quando a feição sob o mouse muda (uma checagem por quadro). */
  public aoMoverMouse(e: MouseEvent): void {
    const parado = e.buttons !== 0 || this.p.interacaoAtiva();
    if (parado) {
      if (this.hoverId !== null) {
        this.hoverId = null;
        this.p.emitir('cad-feicao-hover', { feicao: null });
      }
      return;
    }
    if (this.hoverAgendado) return;
    this.hoverAgendado = true;
    const { clientX, clientY } = e;
    // um quadro; se a aba/painel não desenha (rAF parado), um timer garante que o hover não trave
    let feito = false;
    const executar = (): void => {
      if (feito) return;
      feito = true;
      this.hoverAgendado = false;
      const r = this.p.feicaoSob(clientX, clientY);
      const id = r?.feicao ? `${r.feicao.camadaId}\u0000${r.feicao.id}` : null;
      if (id === this.hoverId) return;
      this.hoverId = id;
      this.p.emitir('cad-feicao-hover', { feicao: r?.feicao ?? null });
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(executar);
    setTimeout(executar, 100);
  }

  /** Botão direito: emite `cad-feicao-menu` com a feição sob o cursor (ou `null`), para o consumidor abrir o próprio menu. */
  public menuContexto(e: MouseEvent): void {
    // ferramenta ativa: o botão direito conclui, desfaz o último vértice ou sai (não abre menu)
    if (this.p.botaoDireitoDaFerramenta()) return;
    const r = this.p.feicaoSob(e.clientX, e.clientY);
    if (!r) return;
    this.p.emitir('cad-feicao-menu', { feicao: r.feicao, coordenada: r.coordenada, x: e.clientX, y: e.clientY });
  }

  /**
   * Duplo clique sobre uma feição: emite `cad-feicao-duplo-clique` (cancelável, para o consumidor assumir o gesto) e,
   * se ninguém chamar `preventDefault()`, abre o popup (pedido de informações). Ignorado durante desenho ou edição de vértices.
   */
  public duploClique(e: MouseEvent): void {
    if (this.p.interacaoAtiva()) return;
    const r = this.p.feicaoSob(e.clientX, e.clientY);
    if (!r?.feicao) return;
    const assumido = this.p.emitir('cad-feicao-duplo-clique', { camadaId: r.feicao.camadaId, feicao: r.feicao, coordenada: r.coordenada }, true) === true;
    if (assumido || !this.p.abrirPopup || this.p.popupNoDuploClique?.() === false) return;
    this.p.abrirPopup(r.feicao);
  }

  /** Esquece a feição sob o cursor (ao destruir o componente). */
  public limpar(): void {
    this.hoverId = null;
  }
}
