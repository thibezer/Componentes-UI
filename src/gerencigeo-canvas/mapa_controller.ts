import L from 'leaflet';
import type { Ponto, Segmento, BancoPonto, Confrontante, CanvasRenderContext, CanvasGraphicScale, CanvasLayerState, CanvasLayerDef } from './types';
import { MapaCore } from './mapa_core';
import { CanvasInteracao } from './canvas_interacao';
import { CanvasLayerManager } from './layer_manager';

export class GerenciGeoMapaController {
  public core: MapaCore;
  public layerManager: CanvasLayerManager;
  public canvasInteracao: CanvasInteracao;

  public context: CanvasRenderContext;
  public modoCliqueSequencialAtivo: boolean = false;
  public levantamentoId: number | null = null;

  constructor(customLayers?: CanvasLayerDef[]) {
    this.core = new MapaCore(this);
    this.layerManager = new CanvasLayerManager(customLayers);
    this.canvasInteracao = new CanvasInteracao({
      mapaController: this,
      layerManager: this.layerManager
    });

    this.context = {
      pontos: [],
      segmentos: [],
      bancoPontos: [],
      confrontantes: [],
      config: this.core.config,
      graphicScale: {
        markerScaleMultiplier: 1.0,
        lineScaleMultiplier: 1.0,
        scaleModeGlobal: 'screen'
      },
      onMarkerClick: (pId: number, isVizinho?: boolean) => {
        if (isVizinho) {
          this.canvasInteracao.ctx.selectedVizinhoPontoIds = [pId];
        } else {
          this.canvasInteracao.ctx.selectedPontoIds = [pId];
          this.canvasInteracao.ctx.lastSelectedPontoId = pId;
        }
        window.dispatchEvent(new CustomEvent('gerencigeo:ponto-selecionado', {
          detail: { selectedPontoIds: [pId], lastSelectedPontoId: pId, isVizinho }
        }));
      }
    };
  }

  public init(containerIdOrElement: string | HTMLElement, hostRoot?: HTMLElement | ShadowRoot): L.Map | null {
    const map = this.core.init(containerIdOrElement);
    if (map) {
      this.layerManager.attachMap(map, this.context);
      this.canvasInteracao.ativar(this, hostRoot);
    }
    return map;
  }

  public invalidateSize(): void {
    try {
      this.core?.invalidateSize();
    } catch {
      // Ignora chamadas em desmontagem
    }
  }

  public setPontos(pontos: Ponto[]): void {
    this.context.pontos = pontos;
    this.canvasInteracao.ctx.pontosList = pontos;
    this.layerManager.updateContext({ pontos });
  }

  public setSegmentos(segmentos: Segmento[]): void {
    this.context.segmentos = segmentos;
    this.layerManager.updateContext({ segmentos });
  }

  public setBancoPontos(bancoPontos: BancoPonto[]): void {
    this.context.bancoPontos = bancoPontos;
    this.layerManager.updateContext({ bancoPontos });
  }

  public setConfrontantes(confrontantes: Confrontante[]): void {
    this.context.confrontantes = confrontantes;
    this.layerManager.updateContext({ confrontantes });
  }

  public setGraphicScale(scale: Partial<CanvasGraphicScale>): void {
    this.layerManager.setGraphicScale(scale);
  }

  public exportState(): CanvasLayerState[] {
    return this.layerManager.exportState();
  }

  public importState(state: CanvasLayerState[]): void {
    this.layerManager.importState(state);
  }

  public selectPonto(pId: number, zoomLevel?: number): void {
    if (!this.core.map) return;
    const markers = this.getMarkers();
    const marker = markers.find(m => (m as any).pontoId === pId);
    if (marker) {
      const targetZoom = zoomLevel !== undefined ? zoomLevel : this.core.map.getZoom();
      this.core.map.setView(marker.getLatLng(), targetZoom);
      marker.openPopup();
    }
  }

  public fitBounds(
    pontos?: Ponto[],
    padding: [number, number] = [40, 40],
    incluirVizinhos: boolean = false
  ): void {
    if (!this.core.map) return;

    const sourcePontos = pontos || this.context.pontos || [];
    let todosPontos = [...sourcePontos];

    if (incluirVizinhos && this.context.confrontantes) {
      this.context.confrontantes.forEach(c => {
        if (c.pontos) todosPontos.push(...c.pontos);
      });
    }

    const validCoords = todosPontos
      .map(p => {
        const rawLat = p.lat ?? (p as any).latitude ?? (p as any).y;
        const rawLon = p.lon ?? (p as any).lng ?? (p as any).longitude ?? (p as any).x;
        const lat = typeof rawLat === 'string' ? parseFloat(rawLat) : Number(rawLat);
        const lon = typeof rawLon === 'string' ? parseFloat(rawLon) : Number(rawLon);
        if (lat !== undefined && lon !== undefined && !isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
          return L.latLng(lat, lon);
        }
        return null;
      })
      .filter((coord): coord is L.LatLng => coord !== null);

    if (validCoords.length > 0) {
      const bounds = L.latLngBounds(validCoords);
      this.core.map.fitBounds(bounds, { padding });
      this.core.map.once('moveend', () => {
        this.core.preCarregarTilesRegiao(bounds);
      });
    }

    try {
      this.core.map.invalidateSize();
    } catch {
      // Ignora exceções de desmontagem DOM
    }
  }

  public getMarkers(): L.Marker[] {
    const markers: L.Marker[] = [];
    if (this.core.map) {
      this.core.map.eachLayer(l => {
        if (l instanceof L.Marker && (l as any).pontoId) {
          markers.push(l);
        }
      });
    }
    return markers;
  }

  public getVizinhosMarkers(): L.Marker[] {
    return this.getMarkers().filter(m => (m as any).isVizinho);
  }

  public destroy(): void {
    this.canvasInteracao.desativar();
    this.layerManager.destroy();
    if (this.core.map) {
      this.core.map.remove();
      this.core.map = null;
    }
  }

  public getMap(): L.Map | null {
    return this.core.map;
  }
}
