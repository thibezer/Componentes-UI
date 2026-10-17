/**
 * Câmera das feições do <ui-canvas-cad>: zoom para feição(ões), ajustar tudo e ajustar camada.
 * Responsabilidade única: calcular os limites e mover o mapa; mostrar o que estava escondido é delegado.
 */
import type L from 'leaflet';
import type { CanvasLayerManager } from '../../gerencigeo-canvas/layer_manager';
import type { Feicao } from '../../gerencigeo-canvas/feature_types';
import type { RefFeicao } from '../../gerencigeo-canvas/feature_selecao';
import { limitesDaGeometria } from '../../gerencigeo-canvas/feature_metricas';
import { TIPO_CAMADA_FEICOES } from './cad-feicoes-tipos';

export interface PortasCamera {
  obterMapa: () => L.Map | null;
  obterLayerManager: () => CanvasLayerManager;
  buscar: (camadaId: string, id: string) => Feicao | undefined;
  lista: (camadaId: string) => Feicao[];
  desenhada: (f: Feicao) => boolean;
  /** Liga a camada e a prévia da feição, se estiverem escondidas. */
  garantirVisivel: (f: Feicao) => void;
}

export class CameraFeicoes {
  constructor(private p: PortasCamera) {}

  private limitesDe(fs: Feicao[]): [[number, number], [number, number]] | null {
    let s = Infinity;
    let w = Infinity;
    let n = -Infinity;
    let e = -Infinity;
    for (const f of fs) {
      const [[a, b], [c, d]] = limitesDaGeometria(f.geometria);
      if (a < s) s = a;
      if (b < w) w = b;
      if (c > n) n = c;
      if (d > e) e = d;
    }
    return Number.isFinite(s) ? [[s, w], [n, e]] : null;
  }

  private enquadrar(fs: Feicao[]): boolean {
    const map = this.p.obterMapa();
    const lim = this.limitesDe(fs);
    if (!map || !lim) return false;
    const ponto = lim[0][0] === lim[1][0] && lim[0][1] === lim[1][1];
    if (ponto) map.flyTo([lim[0][0], lim[0][1]], Math.max(map.getZoom(), 17));
    else map.fitBounds(lim, { padding: [60, 60], maxZoom: 18 });
    return true;
  }

  /** Aproxima da feição; liga a camada e a prévia, se estiverem escondidas. Ponto: voa até z ≥ 17. */
  public zoomParaFeicao(camadaId: string, id: string): boolean {
    const f = this.p.buscar(camadaId, id);
    if (!f || f.excluida) return false;
    this.p.garantirVisivel(f);
    return this.enquadrar([f]);
  }

  public zoomParaFeicoes(refs: RefFeicao[]): boolean {
    const fs: Feicao[] = [];
    for (const r of Array.isArray(refs) ? refs : []) {
      const f = this.p.buscar(r.camadaId, r.id);
      if (f && !f.excluida) {
        this.p.garantirVisivel(f);
        fs.push(f);
      }
    }
    return fs.length > 0 && this.enquadrar(fs);
  }

  /** Enquadra todas as feições das camadas de feições visíveis (que aparecem pela regra de versões). */
  public ajustarTudo(): boolean {
    const fs: Feicao[] = [];
    for (const camada of this.p.obterLayerManager().getLayers()) {
      if (camada.tipo !== TIPO_CAMADA_FEICOES || !camada.visivel) continue;
      fs.push(...this.p.lista(camada.id).filter((f) => this.p.desenhada(f)));
    }
    return this.enquadrar(fs);
  }

  /** Enquadra a camada inteira; se estava oculta, torna-a visível. */
  public ajustarCamada(camadaId: string): boolean {
    const lm = this.p.obterLayerManager();
    const camada = lm.getLayerDef(camadaId);
    if (!camada || camada.tipo !== TIPO_CAMADA_FEICOES) return false;
    if (!camada.visivel) lm.setLayerVisibility(camadaId, true);
    return this.enquadrar(this.p.lista(camadaId).filter((f) => this.p.desenhada(f)));
  }
}
