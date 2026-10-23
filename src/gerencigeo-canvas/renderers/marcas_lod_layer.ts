import L from 'leaflet';
import { pintarMarcas, type ContextoMarcas, type MarcaLOD } from '../feature_lod';

/*
 * Camada Leaflet com UM canvas por camada de feições para as marcas de LOD (feições menores que ~3 px).
 * Substitui um objeto Leaflet por feição minúscula por um `fillRect` em lote. Quem decide o que é marca é o
 * renderizador de feições; aqui só se posiciona o canvas sobre a vista e se pinta.
 *
 * O redesenho é pedido pelo renderizador depois de cada reconciliação (que já acontece a cada moveend/zoomend), então
 * a pintura roda uma vez por mudança de vista. Durante a animação de zoom o canvas fica escondido.
 */

/** Folga ao redor da vista, como fração do tamanho do mapa (a mesma ideia do padding do L.Canvas). */
const FOLGA_CANVAS = 0.1;
const DPR_MAXIMO = 2;

const agendarQuadro: (cb: () => void) => void =
  typeof requestAnimationFrame === 'function' ? (cb) => { requestAnimationFrame(cb); } : (cb) => { setTimeout(cb, 16); };

export class CamadaMarcasLOD extends L.Layer {
  private canvas: HTMLCanvasElement | null = null;
  private agendado = false;
  private vivo = false;
  private readonly nomePane: string;
  private readonly obterMarcas: () => Iterable<MarcaLOD>;
  /** Quantas marcas caíram dentro do canvas na última pintura (diagnóstico e testes). */
  public ultimaPintura = 0;

  constructor(nomePane: string, obterMarcas: () => Iterable<MarcaLOD>) {
    super();
    this.nomePane = nomePane;
    this.obterMarcas = obterMarcas;
  }

  public onAdd(map: L.Map): this {
    const pane = map.getPane(this.nomePane);
    if (!pane) return this;
    const canvas = L.DomUtil.create('canvas', 'leaflet-zoom-animated cad-marcas-lod') as HTMLCanvasElement;
    canvas.style.pointerEvents = 'none';
    canvas.setAttribute('aria-hidden', 'true');
    pane.appendChild(canvas);
    this.canvas = canvas;
    this.vivo = true;
    map.on('zoomstart', this.esconder, this);
    map.on('resize', this.solicitarRedesenho, this);
    this.solicitarRedesenho();
    return this;
  }

  public onRemove(map: L.Map): this {
    this.vivo = false;
    map.off('zoomstart', this.esconder, this);
    map.off('resize', this.solicitarRedesenho, this);
    this.canvas?.remove();
    this.canvas = null;
    return this;
  }

  /** Pede um redesenho no próximo quadro (vários pedidos viram um só). */
  public solicitarRedesenho(): void {
    if (this.agendado || !this.vivo) return;
    this.agendado = true;
    agendarQuadro(() => {
      this.agendado = false;
      if (this.vivo) this.redesenhar();
    });
  }

  private esconder(): void {
    if (this.canvas) this.canvas.style.display = 'none';
  }

  /** Posiciona o canvas sobre a vista atual e pinta as marcas. Nunca lança: mapa sem vista ou sem Canvas 2D só não pinta. */
  public redesenhar(): void {
    const map = (this as unknown as { _map?: L.Map })._map;
    const canvas = this.canvas;
    if (!map || !canvas) return;
    try {
      const tamanho = map.getSize();
      const largura = Math.ceil(tamanho.x * (1 + 2 * FOLGA_CANVAS));
      const altura = Math.ceil(tamanho.y * (1 + 2 * FOLGA_CANVAS));
      if (!(largura > 0 && altura > 0)) return;
      const dpr = Math.min(DPR_MAXIMO, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
      const canto = map.containerPointToLayerPoint([-tamanho.x * FOLGA_CANVAS, -tamanho.y * FOLGA_CANVAS]).round();
      if (canvas.width !== Math.round(largura * dpr) || canvas.height !== Math.round(altura * dpr)) {
        canvas.width = Math.round(largura * dpr);
        canvas.height = Math.round(altura * dpr);
      }
      canvas.style.width = `${largura}px`;
      canvas.style.height = `${altura}px`;
      L.DomUtil.setPosition(canvas, canto);
      canvas.style.display = '';
      const ctx = canvas.getContext('2d') as (CanvasRenderingContext2D & ContextoMarcas) | null;
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, largura, altura);
      const origem = map.getPixelOrigin().add(canto);
      this.ultimaPintura = pintarMarcas(ctx, this.obterMarcas(), map.getZoom(), origem.x, origem.y, largura, altura);
    } catch {
      // mapa ainda sem vista (Leaflet lança "Set map center and zoom first"): tenta de novo no próximo pedido
    }
  }
}
