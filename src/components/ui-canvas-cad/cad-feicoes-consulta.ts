/**
 * Consultas espaciais das feições do <ui-canvas-cad>: candidatas por envelope, snap e feição sob o cursor.
 * Responsabilidade única: ler o índice espacial das camadas desenhadas; nunca altera estado.
 */
import L from 'leaflet';
import type { CanvasLayerManager } from '../../gerencigeo-canvas/layer_manager';
import type { Feicao, LatLonPar } from '../../gerencigeo-canvas/feature_types';
import { LayerRendererFactory } from '../../gerencigeo-canvas/layer_renderer_factory';
import type { IRenderizadorFeicoes } from '../../gerencigeo-canvas/renderers/renderizador_feicoes_tipos';
import type { CaixaGeo } from '../../gerencigeo-canvas/feature_indice';
import { buscarSnap, TOLERANCIA_SNAP_PX, type ExcluirSnap } from '../../gerencigeo-canvas/feature_snap';
import { feicaoNoPonto } from '../../gerencigeo-canvas/feature_amostra';
import { TIPO_CAMADA_FEICOES } from './cad-feicoes-tipos';

export interface PortasConsulta {
  obterMapa: () => L.Map | null;
  obterLayerManager: () => CanvasLayerManager;
  desenhada: (f: Feicao) => boolean;
}

export class ConsultaEspacialFeicoes {
  constructor(private p: PortasConsulta) {}

  /** Feições visíveis das camadas de feições cujo envelope toca um quadrado de `tolPx` px em volta de `coord`. */
  public candidatasEm(coord: LatLonPar, tolPx: number): Feicao[] {
    const map = this.p.obterMapa();
    const lm = this.p.obterLayerManager();
    const renderer = LayerRendererFactory.get(TIPO_CAMADA_FEICOES) as IRenderizadorFeicoes | undefined;
    if (!map || !renderer) return [];
    const cursor = map.latLngToContainerPoint(coord);
    const a = map.containerPointToLatLng([cursor.x - tolPx, cursor.y + tolPx]);
    const b = map.containerPointToLatLng([cursor.x + tolPx, cursor.y - tolPx]);
    const caixa: CaixaGeo = {
      minLon: Math.min(a.lng, b.lng), maxLon: Math.max(a.lng, b.lng),
      minLat: Math.min(a.lat, b.lat), maxLat: Math.max(a.lat, b.lat)
    };
    const achadas: Feicao[] = [];
    for (const camada of lm.getLayers()) {
      if (camada.tipo !== TIPO_CAMADA_FEICOES || !camada.visivel) continue;
      const instancia = lm.getLayerInstance(camada.id);
      if (instancia) achadas.push(...renderer.consultarProximas(instancia as L.LayerGroup, caixa).filter((f) => this.p.desenhada(f)));
    }
    return achadas;
  }

  /** Snap de uma coordenada contra as feições visíveis de todas as camadas de feições (via índice espacial). */
  public buscarSnapEm(coord: [number, number], excluir?: ExcluirSnap) {
    const map = this.p.obterMapa();
    if (!map) return null;

    const cursor = map.latLngToContainerPoint(coord);
    const candidatas = this.candidatasEm(coord, TOLERANCIA_SNAP_PX);
    return buscarSnap({ x: cursor.x, y: cursor.y }, candidatas, (p) => map.latLngToContainerPoint(p), {}, excluir);
  }

  public feicaoSob(clientX: number, clientY: number): { feicao: Feicao | null; coordenada: LatLonPar } | null {
    const map = this.p.obterMapa();
    if (!map) return null;
    const r = map.getContainer().getBoundingClientRect();
    const px = L.point(clientX - r.left, clientY - r.top);
    const ll = map.containerPointToLatLng(px);
    const coordenada: LatLonPar = [ll.lat, ll.lng];
    const f = feicaoNoPonto({ x: px.x, y: px.y }, this.candidatasEm(coordenada, 8), (p) => map.latLngToContainerPoint(p));
    return { feicao: f, coordenada };
  }
}
