import L from 'leaflet';
import { caminhoSvg, nosDaGeometria, passosDaCurva } from './feature_curvas';
import type { GeometriaFeicao, LatLonPar, NoCurva } from './feature_types';

/*
 * Linha e polígono Leaflet que desenham a curva de Bézier de verdade (como um <path d="... C ...">), recalculada
 * a cada zoom, em vez de uma poligonal de trechos retos. Os vértices de apoio (`coordenadas`/`aneis`) continuam
 * sendo os latLngs da camada: o Leaflet os usa para limites, recorte e clique; só o traçado é trocado.
 */

interface RendererInterno {
  _drawing?: boolean;
  _ctx?: CanvasRenderingContext2D;
  _fillStroke?: (ctx: CanvasRenderingContext2D, layer: unknown) => void;
  _setPath?: (layer: unknown, caminho: string) => void;
}

interface CamadaInterna {
  _renderer?: RendererInterno;
  _map?: L.Map;
  _parts?: unknown[];
  _nosCurva?: NoCurva[] | null;
}

/** Desenha a curva da camada. `false` = não há curva (ou renderizador sem suporte): o traçado normal segue. */
function desenharCurva(camada: CamadaInterna, fechada: boolean): boolean {
  const nos = camada._nosCurva;
  const r = camada._renderer;
  const map = camada._map;
  if (!nos || nos.length < 2 || !r || !map) return false;
  const projetar = (p: LatLonPar): L.Point => map.latLngToLayerPoint([p[0], p[1]]);

  if (r._ctx && r._fillStroke) {
    if (!r._drawing) return true;
    if (!camada._parts?.length) return true; // fora da tela
    const ctx = r._ctx;
    ctx.beginPath();
    for (const passo of passosDaCurva(nos, fechada)) {
      const q = (passo.pts as LatLonPar[]).map(projetar);
      if (passo.cmd === 'M') ctx.moveTo(q[0].x, q[0].y);
      else if (passo.cmd === 'L') ctx.lineTo(q[0].x, q[0].y);
      else ctx.bezierCurveTo(q[0].x, q[0].y, q[1].x, q[1].y, q[2].x, q[2].y);
    }
    if (fechada) ctx.closePath();
    r._fillStroke(ctx, camada);
    return true;
  }
  if (r._setPath) {
    r._setPath(camada, camada._parts?.length ? caminhoSvg(nos, fechada, projetar) : 'M0 0');
    return true;
  }
  return false;
}

/** Linha cujo traçado é a curva `nos`. */
export class LinhaCurva extends L.Polyline {
  public _nosCurva: NoCurva[] | null = null;

  /** Troca a curva; chame antes de `setLatLngs` (que é quem redesenha). */
  public definirCurva(nos: NoCurva[] | null): void {
    this._nosCurva = nos;
  }

  protected _updatePath(): void {
    if (!desenharCurva(this as unknown as CamadaInterna, false)) (L.Polyline.prototype as any)._updatePath.call(this);
  }
}

/** Polígono (um anel) cujo contorno é a curva fechada `nos`. */
export class PoligonoCurvo extends L.Polygon {
  public _nosCurva: NoCurva[] | null = null;

  public definirCurva(nos: NoCurva[] | null): void {
    this._nosCurva = nos;
  }

  protected _updatePath(): void {
    if (!desenharCurva(this as unknown as CamadaInterna, true)) (L.Polygon.prototype as any)._updatePath.call(this);
  }
}

export { nosDaGeometria };

/** Cria a camada Leaflet de uma linha/polígono com `curva`, ou `null` se a geometria não é curva. */
export function criarCamadaCurva(g: GeometriaFeicao, opcoes: L.PolylineOptions): LinhaCurva | PoligonoCurvo | null {
  const nos = nosDaGeometria(g);
  if (!nos) return null;
  const camada = g.tipo === 'Polygon' ? new PoligonoCurvo(g.aneis[0], opcoes) : new LinhaCurva((g as { coordenadas: LatLonPar[] }).coordenadas, opcoes);
  camada.definirCurva(nos);
  return camada;
}

/** Atualiza uma camada criada por `criarCamadaCurva` (curva primeiro, depois os vértices, que redesenham). */
export function atualizarCamadaCurva(camada: LinhaCurva | PoligonoCurvo, g: GeometriaFeicao): void {
  camada.definirCurva(nosDaGeometria(g));
  camada.setLatLngs(g.tipo === 'Polygon' ? g.aneis[0] : (g as { coordenadas: LatLonPar[] }).coordenadas);
}
