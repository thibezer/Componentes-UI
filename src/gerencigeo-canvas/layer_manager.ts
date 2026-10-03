import L from 'leaflet';
import type { CanvasLayerDef, CanvasLayerState, CanvasRenderContext, CanvasGraphicScale } from './types';
import { DEFAULT_LAYERS } from './layer_defaults';
import { exportarEstadoCamadas, importarEstadoCamadas, aplicarDadosCamada } from './layer_state_ops';
import {
  garantirPanes,
  aplicarVisibilidadePane,
  aplicarOpacidadePane,
  aplicarZIndexPane,
  aplicarBloqueioPane
} from './layer_pane_ops';
import { montarInstancia, destruirInstancia, atualizarInstancia } from './layer_instance_ops';

export { DEFAULT_LAYERS };

export class CanvasLayerManager {
  private layers: CanvasLayerDef[] = [];
  private layerInstances = new Map<string, L.Layer | L.LayerGroup>();
  private map: L.Map | null = null;
  private context: CanvasRenderContext | null = null;
  private listeners: Array<(layers: CanvasLayerDef[]) => void> = [];

  constructor(initialLayers?: CanvasLayerDef[]) {
    this.layers = (initialLayers || DEFAULT_LAYERS).map(l => ({ ...l, estilo: { ...l.estilo } }));
  }

  public attachMap(map: L.Map, context: CanvasRenderContext): void {
    this.map = map;
    this.context = context;
    this.ensurePanes();
    this.renderAllLayers();
  }

  public ensurePanes(): void {
    if (!this.map) return;
    garantirPanes(this.map, this.layers);
  }

  public renderAllLayers(): void {
    if (!this.map || !this.context) return;

    this.layers.forEach(layer => {
      destruirInstancia(layer, this.map!, this.layerInstances);
      if (layer.visivel) {
        montarInstancia(layer, this.map!, this.context!, this.layerInstances);
      }
    });

    this.notifyChange();
  }

  public setLayerVisibility(id: string, visivel: boolean): void {
    const layer = this.layers.find(l => l.id === id);
    if (!layer || layer.visivel === visivel) return;

    layer.visivel = visivel;

    if (!this.map || !this.context) return;

    aplicarVisibilidadePane(this.map, layer);

    if (visivel) {
      if (!this.layerInstances.has(id)) {
        montarInstancia(layer, this.map, this.context, this.layerInstances);
      }
    } else {
      destruirInstancia(layer, this.map, this.layerInstances);
    }

    this.notifyChange();
  }

  public setLayerOpacity(id: string, opacidade: number): void {
    const layer = this.layers.find(l => l.id === id);
    if (!layer) return;

    layer.opacidade = Math.max(0, Math.min(1, opacidade));

    if (this.map) {
      aplicarOpacidadePane(this.map, layer);
      if (this.context) {
        atualizarInstancia(layer, { opacidade: layer.opacidade }, this.map, this.context, this.layerInstances);
      }
    }

    this.notifyChange();
  }

  public setLayerZIndex(id: string, zIndex: number): void {
    const layer = this.layers.find(l => l.id === id);
    if (!layer) return;

    layer.zIndex = zIndex;
    if (this.map) aplicarZIndexPane(this.map, layer);

    this.notifyChange();
  }

  public setLayerBlocked(id: string, bloqueada: boolean): void {
    const layer = this.layers.find(l => l.id === id);
    if (!layer) return;

    layer.bloqueada = bloqueada;
    if (this.map) aplicarBloqueioPane(this.map, layer);

    this.notifyChange();
  }

  public setLayerScaleMode(id: string, mode: 'screen' | 'world'): void {
    const layer = this.layers.find(l => l.id === id);
    if (!layer) return;

    layer.estilo.scaleMode = mode;
    if (this.map && this.context) {
      atualizarInstancia(layer, { estilo: layer.estilo }, this.map, this.context, this.layerInstances);
    }

    this.notifyChange();
  }

  public setGraphicScale(scale: Partial<CanvasGraphicScale>): void {
    if (!this.context) return;
    this.context.graphicScale = { ...this.context.graphicScale, ...scale };
    this.renderAllLayers();
  }

  public updateContext(newContext: Partial<CanvasRenderContext>): void {
    if (!this.context) return;
    this.context = { ...this.context, ...newContext };
    this.renderAllLayers();
  }

  public getLayers(): CanvasLayerDef[] {
    return [...this.layers];
  }

  public getActiveSelectableLayers(): CanvasLayerDef[] {
    return this.layers.filter(l => l.visivel && l.interativo && !l.bloqueada);
  }

  public isLayerActiveAndSelectable(layerId: string): boolean {
    const layer = this.layers.find(l => l.id === layerId);
    return !!(layer && layer.visivel && layer.interativo && !layer.bloqueada);
  }

  public exportState(): CanvasLayerState[] {
    return exportarEstadoCamadas(this.layers);
  }

  public importState(state: CanvasLayerState[]): void {
    if (!state || !Array.isArray(state)) return;

    importarEstadoCamadas(this.layers, state);

    this.ensurePanes();
    this.renderAllLayers();
  }

  public onChange(callback: (layers: CanvasLayerDef[]) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notifyChange(): void {
    const copy = this.getLayers();
    this.listeners.forEach(cb => {
      try {
        cb(copy);
      } catch (err) {
        console.error('Erro no listener de camadas:', err);
      }
    });
  }

  public getAllLayerInstances(): (L.Layer | L.LayerGroup)[] {
    return Array.from(this.layerInstances.values());
  }

  public getLayerInstance(id: string): L.Layer | L.LayerGroup | undefined {
    return this.layerInstances.get(id);
  }

  public getLayer(id: string): CanvasLayerDef | undefined {
    return this.layers.find(l => l.id === id);
  }

  public getLayerDef(id: string): CanvasLayerDef | undefined {
    return this.layers.find(l => l.id === id);
  }

  public getOrCreateLayer(id: string, tipo: string, nome: string): CanvasLayerDef {
    let layer = this.layers.find(l => l.id === id);
    if (!layer) {
      layer = {
        id,
        nome,
        categoria: 'custom',
        tipo,
        visivel: true,
        opacidade: 1.0,
        zIndex: 600,
        interativo: true,
        bloqueada: false,
        estilo: { scaleMode: 'screen' }
      };
      this.layers.push(layer);
      this.ensurePanes();
    }
    return layer;
  }

  public setLayerData(id: string, dados: any): void {
    const layer = this.layers.find(l => l.id === id);
    if (!layer) return;

    aplicarDadosCamada(layer, dados, this.map, this.context, this.layerInstances);

    this.notifyChange();
  }

  public clearLayers(ids?: string[]): void {
    const toClear = ids && ids.length > 0
      ? ids
      : Array.from(this.layerInstances.keys());

    toClear.forEach(id => {
      const layer = this.layers.find(l => l.id === id);
      if (layer) {
        destruirInstancia(layer, this.map!, this.layerInstances);
      } else {
        this.layerInstances.delete(id);
      }
    });

    this.notifyChange();
  }

  public destroy(): void {
    if (this.map) {
      this.layers.forEach(layer => destruirInstancia(layer, this.map!, this.layerInstances));
      this.layerInstances.clear();
    }
    this.listeners = [];
  }
}
