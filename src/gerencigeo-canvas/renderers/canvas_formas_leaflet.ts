import L from 'leaflet';
import type { CaixaGeo } from '../feature_indice';
import type { PontoMundo } from '../motor/tipos';
import type { RegiaoPx } from './renderizador_formas';

/*
 * Canvas do Leaflet que só abre o quadro e deixa a pintura para o renderizador das formas.
 *
 * Estende `L.Canvas` para herdar tudo o que o Leaflet já resolve bem em volta de um canvas de pane: tamanho da vista
 * com folga, retina, escala durante a animação de zoom e remoção limpa. No pan o canvas se move por CSS junto com o
 * mapa (zero repintura durante o arraste). Ao fim do movimento o Leaflet recentra o canvas; aqui o bitmap já pintado é
 * DESLOCADO para o novo quadro e só as faixas expostas são repintadas (pan incremental): o custo do pan passa a ser
 * proporcional à faixa nova, não à vista inteira. Mudança de zoom, de tamanho ou dos dados repinta tudo.
 * Nenhuma forma é registrada no canvas do Leaflet (`_layers` fica vazio): é só a superfície.
 *
 * Usa internos do Leaflet (`_bounds`, `_ctx`, `_container`, `_update`, `_updatePaths`), como o resto do kit já faz
 * com `_paneRenderers`.
 */

/** Tudo que o renderizador precisa para pintar um quadro. */
export interface QuadroCanvas {
  ctx: CanvasRenderingContext2D;
  /** Multiplicador de retina do Leaflet (1 ou 2). */
  dpr: number;
  /** Tamanho do canvas em px CSS. */
  larguraPx: number;
  alturaPx: number;
  /** Pixels de mundo, no zoom, do canto superior esquerdo do canvas. */
  origemPx: PontoMundo;
  /** O que cabe no canvas, em coordenadas geográficas. */
  caixa: CaixaGeo;
  zoom: number;
  /**
   * `null`: pintar o canvas inteiro. Lista: o bitmap já foi deslocado e só estas regiões (px CSS) estão vazias e
   * precisam ser pintadas (vazia = nada novo ficou à mostra).
   */
  regioes: RegiaoPx[] | null;
  /**
   * O bitmap está em branco antes desta pintura? Quem pinta pode então não tocar no canvas quando não há o que desenhar:
   * qualquer chamada de desenho (até um `clearRect`) faz o navegador reenviar o canvas inteiro ao compositor.
   */
  branco: boolean;
}

/**
 * Devolve quantos itens de canvas a pintura deixou no bitmap (numa faixa do pan, quantos ACRESCENTOU), ou só se deixou
 * algo (`true`/`void`: algo, quantidade desconhecida; `false`: nada).
 */
export type PintarQuadro = (quadro: QuadroCanvas) => number | boolean | void;

interface InternosCanvas {
  _postponeUpdatePaths?: boolean;
  _bounds?: L.Bounds;
  _ctx?: CanvasRenderingContext2D;
  _container?: HTMLCanvasElement;
  _map?: L.Map & { _animatingZoom?: boolean };
  _zoom?: number;
}

export interface OpcoesCanvasFormas extends L.RendererOptions {
  /** Pan incremental: desloca o bitmap e pinta só as faixas expostas (padrão: não; a sobreposição repinta inteira). */
  incremental?: boolean;
  /** Pan incremental com até tantos itens no bitmap: repinta inteiro em vez de deslocar (padrão: `CanvasFormas.limiteRepintar`). */
  limiteRepintar?: number;
}

/** Regiões que ficam vazias quando o conteúdo se desloca de (`dx`, `dy`) px: a faixa vertical inteira e a horizontal sem a quina. */
export function regioesExpostas(largura: number, altura: number, dx: number, dy: number): RegiaoPx[] {
  const regioes: RegiaoPx[] = [];
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax > 0) regioes.push({ x: dx > 0 ? largura - ax : 0, y: 0, largura: ax, altura });
  if (ay > 0) regioes.push({ x: dx > 0 ? 0 : ax, y: dy > 0 ? altura - ay : 0, largura: largura - ax, altura: ay });
  return regioes;
}

export class CanvasFormas extends L.Canvas {
  /**
   * Com poucos itens no bitmap, repintar a vista inteira custa menos que deslocá-lo: o deslocamento copia o bitmap
   * todo (3072×1920 com dpr 2), seja qual for o conteúdo. Medido (sem GPU): ~180 itens por camada repintam 3× mais
   * rápido; ~650 empatam; ~1 500 já perdem. Ajustável (benchmark); ver docs/desempenho-feicoes.md.
   */
  public static limiteRepintar = 500;
  private readonly aoPintar: PintarQuadro;
  private readonly incremental: boolean;
  private readonly limiteProprio: number | undefined;
  /** Itens de canvas no bitmap (estimativa por cima entre repinturas completas: as faixas só somam). */
  private itens = 0;
  /** O bitmap tem um quadro completo válido (deslocável)? Cai para falso ao redimensionar ou se a pintura falhar. */
  private conteudoValido = false;
  /**
   * O bitmap está em branco? Canvas em branco não é deslocado no pan nem apagado de novo no `_update`: com várias
   * camadas sem nada na vista (zoom alto, camada esparsa), o pan deixa de reenviar canvases vazios ao compositor.
   */
  private branco = true;
  /** Canto superior esquerdo do bitmap em pixels de MUNDO no último `_update`: o deslocamento do conteúdo se mede aqui. */
  private mundoMin: PontoMundo | null = null;
  /** Regiões a pintar no próximo quadro (calculadas no `_update`); `null` = canvas inteiro. */
  private regioesDaVez: RegiaoPx[] | null = null;
  /** Quantas pinturas falharam (e a última causa): diagnóstico, já que a falha é engolida. */
  public falhas = 0;
  public ultimoErro: unknown = null;

  constructor(opcoes: OpcoesCanvasFormas, aoPintar: PintarQuadro) {
    super(opcoes);
    this.aoPintar = aoPintar;
    this.incremental = !!opcoes.incremental;
    this.limiteProprio = opcoes.limiteRepintar;
  }

  private get limiteRepintar(): number {
    const l = this.limiteProprio ?? CanvasFormas.limiteRepintar;
    return l > 0 ? l : 0; // NaN e negativo: sempre desloca; Infinity: sempre repinta
  }

  /**
   * O primeiro `update` do canvas acontece antes de o Leaflet ouvi-lo (e o `onAdd` do L.Canvas ainda limpa o canvas):
   * por isso o primeiro quadro é pintado aqui.
   */
  public onAdd(map: L.Map): this {
    super.onAdd(map);
    this.regioesDaVez = null;
    this.pintar();
    return this;
  }

  /**
   * Reposiciona o canvas para a vista (moveend, zoomend, resize). Igual ao `L.Canvas._update`, exceto que o bitmap é
   * preservado e deslocado quando só houve pan, em vez de ser sempre apagado pelo redimensionamento.
   */
  protected _update(): void {
    const i = this as unknown as InternosCanvas;
    const map = i._map;
    if (!map || (map._animatingZoom && i._bounds)) return;
    const antes = i._bounds ? { mundo: this.mundoMin, x: i._bounds.getSize().x, y: i._bounds.getSize().y, zoom: i._zoom } : null;
    (L.Renderer.prototype as unknown as { _update(): void })._update.call(this);

    const b = i._bounds!;
    // O conteúdo está em coordenadas de mundo. Os pontos de camada do Leaflet mudam de referência a cada `viewreset`
    // (mesmo sem trocar o zoom), então o deslocamento tem que ser medido em pixels de mundo, não de camada.
    const origemMapa = map.getPixelOrigin();
    const mundo = { x: origemMapa.x + b.min!.x, y: origemMapa.y + b.min!.y };
    const container = i._container!;
    const ctx = i._ctx!;
    const tamanho = b.getSize();
    const m = L.Browser.retina ? 2 : 1;
    L.DomUtil.setPosition(container, b.min!);

    const mesmoQuadro = this.incremental && this.conteudoValido && !!antes && antes.zoom === i._zoom && antes.x === tamanho.x && antes.y === tamanho.y &&
      container.width === m * tamanho.x && container.height === m * tamanho.y;
    let regioes: RegiaoPx[] | null = null;
    /** Pan com poucos itens: repintura completa sobre o mesmo bitmap (sem deslocar nem redimensionar). */
    let repintar = false;
    if (mesmoQuadro && antes && antes.mundo) {
      const dx = mundo.x - antes.mundo.x;
      const dy = mundo.y - antes.mundo.y;
      if (!this.branco && this.itens <= this.limiteRepintar) repintar = true;
      else if (Math.abs(dx) < tamanho.x && Math.abs(dy) < tamanho.y) {
        if ((dx !== 0 || dy !== 0) && !this.branco) {
          // o conteúdo acompanha o novo canto do canvas; `copy` apaga o que não é coberto (as faixas expostas)
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.globalCompositeOperation = 'copy';
          ctx.drawImage(container, -dx * m, -dy * m);
          ctx.restore();
        }
        regioes = regioesExpostas(tamanho.x, tamanho.y, dx, dy);
      }
    }
    if (!regioes && !repintar) {
      // redimensionar apaga o canvas (como no L.Canvas); em branco e do mesmo tamanho, já está apagado
      if (!this.branco || container.width !== m * tamanho.x || container.height !== m * tamanho.y) {
        container.width = m * tamanho.x;
        container.height = m * tamanho.y;
      }
      this.branco = true;
      container.style.width = `${tamanho.x}px`;
      container.style.height = `${tamanho.y}px`;
      this.conteudoValido = false;
    }
    this.regioesDaVez = regioes;
    this.mundoMin = mundo;
    ctx.setTransform(1, 0, 0, 1, 0, 0); // a pintura define a própria transformação (retina)
    this.fire('update');
  }

  /** O Leaflet chama isto depois de cada `update` do canvas (moveend, zoomend, resize); aqui vai a pintura. */
  protected _updatePaths(): void {
    if ((this as unknown as InternosCanvas)._postponeUpdatePaths) return; // viewprereset: o `_reset` repinta uma vez só
    this.pintarQuadro(this.regioesDaVez);
  }

  /** Repinta o canvas INTEIRO agora (dados, estilo ou seleção que afeta o conjunto mudaram). */
  public pintar(): void {
    this.pintarQuadro(null);
  }

  private pintarQuadro(regioes: RegiaoPx[] | null): void {
    const quadro = this.quadroAtual(regioes);
    this.regioesDaVez = null;
    if (!quadro) return;
    try {
      const r = this.aoPintar(quadro);
      const n = typeof r === 'number' ? (r > 0 ? r : 0) : r === false ? 0 : Number.POSITIVE_INFINITY;
      // faixa do pan: soma ao que já estava no bitmap; quadro completo: é o total
      this.itens = regioes ? (this.branco ? 0 : this.itens) + n : n;
      this.branco = this.itens === 0;
      this.conteudoValido = true;
    } catch (erro) {
      // Regra #0: uma falha de pintura não pode quebrar o ciclo de eventos do mapa; fica registrada para diagnóstico
      this.conteudoValido = false;
      this.branco = false; // estado do bitmap desconhecido
      this.itens = Number.POSITIVE_INFINITY;
      this.falhas++;
      this.ultimoErro = erro;
    }
  }

  /** O quadro com a vista atual do canvas, ou `null` se o canvas ainda não foi posicionado. */
  public quadroAtual(regioes: RegiaoPx[] | null = null): QuadroCanvas | null {
    const i = this as unknown as InternosCanvas;
    const map = i._map;
    const b = i._bounds;
    const ctx = i._ctx;
    if (!map || !b || !ctx) return null;
    try {
      const tamanho = b.getSize();
      const origem = map.getPixelOrigin();
      const sup = map.layerPointToLatLng(b.min!);
      const inf = map.layerPointToLatLng(b.max!);
      return {
        ctx,
        dpr: L.Browser.retina ? 2 : 1,
        larguraPx: tamanho.x,
        alturaPx: tamanho.y,
        origemPx: { x: origem.x + b.min!.x, y: origem.y + b.min!.y },
        caixa: { minLat: inf.lat, maxLat: sup.lat, minLon: sup.lng, maxLon: inf.lng },
        zoom: map.getZoom(),
        regioes,
        branco: this.branco
      };
    } catch {
      return null; // mapa sem vista ainda
    }
  }
}
