/**
 * Seleção por região das feições do <ui-canvas-cad>: laço e caixa (window/crossing).
 * Responsabilidade única: achar as feições tocadas pela região e entregá-las à seleção.
 */
import type L from 'leaflet';
import type { CanvasLayerManager } from '../../gerencigeo-canvas/layer_manager';
import type { Feicao, LatLonPar } from '../../gerencigeo-canvas/feature_types';
import type { RefFeicao } from '../../gerencigeo-canvas/feature_selecao';
import { feicaoNaCaixa, feicaoNoLaco, type CaixaPx, type ModoCaixa } from '../../gerencigeo-canvas/feature_caixa';
import { TIPO_CAMADA_FEICOES } from './cad-feicoes-tipos';

export interface PortasSelecaoRegiao {
  obterMapa: () => L.Map | null;
  obterLayerManager: () => CanvasLayerManager;
  lista: (camadaId: string) => Feicao[];
  desenhada: (f: Feicao) => boolean;
  desativarFerramenta: () => void;
  selecionar: (refs: RefFeicao[]) => void;
  alternarVarias: (refs: RefFeicao[]) => void;
}

export class SelecaoPorRegiao {
  constructor(private p: PortasSelecaoRegiao) {}

  /** Laço: seleciona (substituindo) as feições de camadas selecionáveis tocadas pelo polígono; a ferramenta encerra. */
  public selecionarNoLaco(laco: LatLonPar[]): void {
    const refs: RefFeicao[] = [];
    for (const camada of this.p.obterLayerManager().getActiveSelectableLayers()) {
      if (camada.tipo !== TIPO_CAMADA_FEICOES) continue;
      for (const f of this.p.lista(camada.id)) {
        if (this.p.desenhada(f) && feicaoNoLaco(f, laco)) refs.push({ camadaId: camada.id, id: f.id });
      }
    }
    // encerra a ferramenta ANTES de selecionar: quem escuta `cad-selecao` já vê o mapa sem ferramenta ativa
    this.p.desativarFerramenta();
    this.p.selecionar(refs);
  }

  /** Caixa de seleção: só feições de camadas visíveis, interativas e desbloqueadas, com toque geométrico real. */
  public selecionarNaCaixa(caixa: CaixaPx, modo: ModoCaixa, aditivo: boolean): void {
    const map = this.p.obterMapa();
    if (!map) return;
    const projetar = (p: [number, number]) => map.latLngToContainerPoint(p);
    const refs: RefFeicao[] = [];
    for (const camada of this.p.obterLayerManager().getActiveSelectableLayers()) {
      if (camada.tipo !== TIPO_CAMADA_FEICOES) continue;
      for (const f of this.p.lista(camada.id)) {
        if (this.p.desenhada(f) && feicaoNaCaixa(f, caixa, projetar, modo)) refs.push({ camadaId: camada.id, id: f.id });
      }
    }
    if (aditivo) this.p.alternarVarias(refs);
    else this.p.selecionar(refs);
  }
}
