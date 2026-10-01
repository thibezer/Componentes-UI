import L from 'leaflet';
import type {
  Ponto, Segmento, BancoPonto, Confrontante, CanvasRenderContext, CanvasGraphicScale,
  CanvasLayerState, CanvasLayerDef, PontoCAD, ConexaoCAD, PoligonoCAD, DestacarElementoOpcoes
} from './types';
import { MapaCore } from './mapa_core';
import { CanvasInteracao } from './canvas_interacao';
import { CanvasLayerManager } from './layer_manager';
import {
  executarDestaqueElemento, limparDestaqueElemento, localizarCoordenadasElemento, DestaqueState
} from './canvas_destaque';
import {
  processarPontosVizinhos, processarPoligonosVizinhos, calcularBoundsGeometrias, coletarMarcadoresLeaflet,
  executarPlotarPontos, executarPlotarConexoes, executarPlotarPolilinha, executarPlotarPoligonos,
  executarPlotSegmentos, executarClearOverlays
} from './controller_dados_ops';
import { getPointShapeHtml } from './mapa_pontos_shapes';

export class GerenciGeoMapaController {
  public core: MapaCore;
  public layerManager: CanvasLayerManager;
  public canvasInteracao: CanvasInteracao;

  public context: CanvasRenderContext;
  public modoCliqueSequencialAtivo: boolean = false;
  public chaveGrupo?: string;
  public zonaProjecao: number = 22;
  public levantamentoId: number | null = null;

  public customMarkerClickCallback?: (pId: number, isVizinho?: boolean) => void;
  public customPopupActionCallback?: (acaoId: string, elementoId: string | number, elemento: any) => void;

  private destaqueState: DestaqueState = {
    destaqueMarker: null,
    destaqueTimeoutId: null
  };

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
      zonaProjecao: 22,
      config: this.core.config,
      graphicScale: {
        markerScaleMultiplier: 1.0,
        lineScaleMultiplier: 1.0,
        scaleModeGlobal: 'screen'
      },
      onMarkerClick: (pId: string | number, isVizinho?: boolean) => {
        if (this.modoCliqueSequencialAtivo || this.context.modoSequencial) return;
        const parsedId = (pId !== undefined && pId !== null && !isNaN(Number(pId)) && String(pId).trim() !== '')
          ? Number(pId)
          : pId;
        if (this.customMarkerClickCallback) {
          try { this.customMarkerClickCallback(parsedId as any, isVizinho); } catch (err) { console.error('Erro no customMarkerClickCallback:', err); }
        }
        if (isVizinho) {
          this.canvasInteracao.ctx.selectedVizinhoPontoIds = [parsedId as any];
        } else {
          this.canvasInteracao.ctx.selectedPontoIds = [parsedId as any];
          this.canvasInteracao.ctx.lastSelectedPontoId = parsedId as any;
        }
        (this.context as any).selectedPontoIds = [...this.canvasInteracao.ctx.selectedPontoIds];
        this.atualizarDestaqueMarcadores();
        window.dispatchEvent(new CustomEvent('gerencigeo:ponto-selecionado', {
          detail: { selectedPontoIds: [parsedId], lastSelectedPontoId: parsedId, isVizinho }
        }));
      },
      onPopupAcao: (acaoId: string, elementoId: string | number, elemento: any) => {
        if (this.customPopupActionCallback) {
          try { this.customPopupActionCallback(acaoId, elementoId, elemento); } catch (err) { console.error('Erro no customPopupActionCallback:', err); }
        }
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
      if (this.core) {
        if (typeof (this.core as any).invalidateSize === 'function') {
          (this.core as any).invalidateSize();
        } else if (this.core.map && typeof this.core.map.invalidateSize === 'function') {
          this.core.map.invalidateSize();
        }
      }
    } catch {}
  }

  public setPontos(pontos?: Ponto[] | null): void {
    const safe = pontos || [];
    this.context.pontos = safe;
    this.canvasInteracao.ctx.pontosList = safe;
    this.layerManager.updateContext({ pontos: safe });
  }

  public setSegmentos(segmentos?: Segmento[] | null): void {
    const safe = segmentos || [];
    this.context.segmentos = safe;
    this.layerManager.updateContext({ segmentos: safe });
  }

  public setBancoPontos(bancoPontos?: BancoPonto[] | null): void {
    const safe = bancoPontos || [];
    this.context.bancoPontos = safe;
    this.layerManager.updateContext({ bancoPontos: safe });
  }

  public setConfrontantes(confrontantes?: Confrontante[] | null): void {
    const safe = confrontantes || [];
    this.context.confrontantes = safe;
    this.layerManager.updateContext({ confrontantes: safe });
  }

  public plotarPontos(p?: PontoCAD[] | null, c: string = 'vertices', cl?: (p: PontoCAD) => void): void {
    executarPlotarPontos(this, p, c, cl);
  }

  public plotarConexoes(conexoes?: ConexaoCAD[] | null, camadaId: string = 'linhas'): void {
    executarPlotarConexoes(this, conexoes, camadaId);
  }

  public plotarPolilinhaSequencial(p?: PontoCAD[] | null, fechar: boolean = true, camadaId: string = 'polilinha', cg?: string): void {
    executarPlotarPolilinha(this, p, fechar, camadaId, cg);
  }

  public plotarPoligonos(poligonos?: PoligonoCAD[] | null, camadaId: string = 'poligonos'): void {
    executarPlotarPoligonos(this, poligonos, camadaId);
  }

  public limparCamadas(idsCamadas?: string[]): void {
    this.layerManager.clearLayers(idsCamadas);
    if (!idsCamadas || idsCamadas.length === 0) {
      this.canvasInteracao.limparSelecao();
    }
  }

  public obterMarcadores(camadaId?: string): L.Marker[] {
    if (camadaId) {
      const markers: L.Marker[] = [];
      const instance = this.layerManager.getLayerInstance(camadaId);
      if (instance) {
        const collect = (l: any) => { if (l instanceof L.Marker) markers.push(l); };
        collect(instance);
        if (typeof (instance as any).eachLayer === 'function') (instance as any).eachLayer(collect);
      }
      return markers;
    }
    return this.getMarkers();
  }

  public plotPontos(pontos?: Ponto[] | null, onMarkerClick?: (pontoId: number, isVizinho?: boolean) => void): void {
    if (onMarkerClick) this.customMarkerClickCallback = onMarkerClick;
    this.setPontos(pontos || []);
  }

  public plotSegmentos(segmentos?: Segmento[] | null, pontos?: Ponto[] | null): void {
    executarPlotSegmentos(this, segmentos, pontos);
  }

  public plotPolilinhaTemporaria(pontos?: Ponto[] | null): void {
    const safePontos = pontos || [];
    this.context.pontos = safePontos;
    this.context.segmentos = [];
    this.canvasInteracao.ctx.pontosList = safePontos;
    this.layerManager.updateContext({ pontos: safePontos, segmentos: [] });
  }

  public plotPoligonalHomologada(bancoPontos?: BancoPonto[] | null): void {
    const safeBanco = bancoPontos || [];
    this.setBancoPontos(safeBanco);
    this.layerManager.setLayerVisibility('homologados', true);
    this.layerManager.setLayerVisibility('homologados-pontos', true);
  }

  public plotPontosVizinhos(pontos?: Ponto[] | null): void {
    const novos = processarPontosVizinhos(pontos || [], this.context.confrontantes || []);
    this.setConfrontantes(novos);
    this.layerManager.setLayerVisibility('vizinhos', true);
  }

  public plotPoligonosVizinhos(confrontantes?: Confrontante[] | null): void {
    const novos = processarPoligonosVizinhos(confrontantes || [], this.context.confrontantes || []);
    this.setConfrontantes(novos);
    this.layerManager.setLayerVisibility('vizinhos', true);
  }

  public clearOverlays(manterBanco: boolean = false): void {
    executarClearOverlays(this, manterBanco);
  }

  public setGraphicScale(scale: Partial<CanvasGraphicScale>): void { this.layerManager.setGraphicScale(scale); }
  public exportState(): CanvasLayerState[] { return this.layerManager.exportState(); }
  public importState(state: CanvasLayerState[]): void { this.layerManager.importState(state); }

  public selectPonto(pId: string | number, zoomLevel?: number): void {
    if (!this.core.map) return;
    const strId = String(pId);
    const marker = this.getMarkers().find(m => String((m as any).pontoId) === strId);
    if (marker) {
      const targetZoom = zoomLevel !== undefined ? zoomLevel : this.core.map.getZoom();
      this.core.map.setView(marker.getLatLng(), targetZoom);
      marker.openPopup();
    }
    const parsedId = (pId !== undefined && pId !== null && !isNaN(Number(pId)) && String(pId).trim() !== '') ? Number(pId) : pId;
    this.canvasInteracao.ctx.selectedPontoIds = [parsedId as any];
    this.canvasInteracao.ctx.lastSelectedPontoId = parsedId as any;
    (this.context as any).selectedPontoIds = [parsedId as any];
    this.atualizarDestaqueMarcadores();
  }

  public atualizarDestaqueMarcadores(): void {
    const selectedIds = ((this.context as any).selectedPontoIds || []) as (string | number)[];
    const selectedVizinhos = (this.canvasInteracao.ctx.selectedVizinhoPontoIds || []) as (string | number)[];
    const allSelected = new Set([
      ...selectedIds.map(String),
      ...selectedVizinhos.map(String)
    ]);

    const markers = this.getMarkers();
    for (const marker of markers) {
      const anyMarker = marker as any;
      const pId = anyMarker.pontoId;
      if (pId === undefined || pId === null) continue;

      const isSelected = allSelected.has(String(pId));
      if (anyMarker.isSelected !== isSelected) {
        anyMarker.isSelected = isSelected;

        if (isSelected) {
          marker.setZIndexOffset(2000);
        } else {
          marker.setZIndexOffset(0);
        }

        if (anyMarker.shapeStyle && anyMarker.baseSize && anyMarker.markerBg) {
          const layerDef = this.layerManager.getLayerDef(anyMarker.layerId);
          const baseSize = anyMarker.baseSize || 8;
          let size = baseSize;
          if (this.core.map && layerDef?.estilo?.scaleMode === 'world') {
            const dimMetros = layerDef.estilo.dimensaoMetros || 0.25;
            const center = this.core.map.getCenter();
            const zoom = this.core.map.getZoom();
            const metersPerPixel = (40075016.686 * Math.abs(Math.cos((center.lat * Math.PI) / 180))) / Math.pow(2, zoom + 8);
            const px = dimMetros / (metersPerPixel > 0 ? metersPerPixel : 1);
            const multiplier = this.context.graphicScale?.markerScaleMultiplier || 1.0;
            size = Math.max(3, Math.round(px * multiplier));
          } else {
            const multiplier = this.context.graphicScale?.markerScaleMultiplier || 1.0;
            size = Math.max(4, Math.round(baseSize * multiplier));
          }

          const animClass = this.context.config.enableAnimations ? 'transition-all duration-150' : '';
          const markerHtml = getPointShapeHtml(
            anyMarker.shapeStyle,
            size,
            anyMarker.markerBg,
            animClass,
            `map-marker-${anyMarker.layerId || 'pts'}-${pId}`,
            isSelected
          );

          const customIcon = L.divIcon({
            html: markerHtml,
            className: `custom-leaflet-marker flex items-center justify-center ${isSelected ? 'cad-marker-selected ponto-selecionado' : ''}`,
            iconSize: [size + 6, size + 6]
          });
          marker.setIcon(customIcon);
        }

        const el = marker.getElement();
        if (el) {
          if (isSelected) {
            el.classList.add('cad-marker-selected', 'ponto-selecionado');
          } else {
            el.classList.remove('cad-marker-selected', 'ponto-selecionado');
          }
        }
      }
    }
  }

  public fitBounds(pontos?: Ponto[], padding: [number, number] = [40, 40], incluirVizinhos: boolean = false): void {
    if (!this.core.map) return;
    const res = calcularBoundsGeometrias(pontos || this.context.pontos || [], this.context.confrontantes, incluirVizinhos);
    if (!res) return;

    if (res.single) {
      this.core.map.setView(res.single, 18);
    } else if (res.bounds) {
      this.core.map.fitBounds(res.bounds, { padding });
      this.core.map.once('moveend', () => {
        this.core.preCarregarTilesRegiao(res.bounds!);
      });
    }

    try { this.core.map.invalidateSize(); } catch {}
  }

  public getMarkers(): L.Marker[] {
    return coletarMarcadoresLeaflet(this.core.map, this.layerManager);
  }

  public getVizinhosMarkers(): L.Marker[] {
    return this.getMarkers().filter(m => !!(m as any).isVizinho);
  }

  public get destaqueAtivo(): boolean {
    return this.destaqueState.destaqueMarker !== null;
  }

  public localizarCoordenadasElemento(id: string | number): L.LatLng | null {
    return localizarCoordenadasElemento(this, id);
  }

  public destacarElemento(id: string | number, opcoes?: DestacarElementoOpcoes): void {
    executarDestaqueElemento(this, this.destaqueState, id, opcoes);
  }

  public limparDestaque(): void {
    limparDestaqueElemento(this.destaqueState, this.getMap());
  }

  public destroy(): void {
    this.limparDestaque();
    this.canvasInteracao.desativar();
    this.layerManager.destroy();
    this.core.destroy();
    if (this.core.map) {
      try { this.core.map.off(); this.core.map.remove(); } catch {} finally { this.core.map = null; }
    }
  }

  public getMap(): L.Map | null {
    return this.core.map;
  }
}

export { GerenciGeoMapaController as CanvasCADController, GerenciGeoMapaController as CADMapaController };
