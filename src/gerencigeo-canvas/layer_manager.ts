import L from 'leaflet';
import type { CanvasLayerDef, CanvasLayerState, CanvasRenderContext, CanvasGraphicScale } from './types';
import { LayerRendererFactory } from './layer_renderer_factory';
import { TileLayerRenderer } from './renderers/tile_renderer';
import { WmsLayerRenderer } from './renderers/wms_renderer';
import { VectorLinesLayerRenderer } from './renderers/vector_lines_renderer';
import { VectorPointsLayerRenderer } from './renderers/vector_points_renderer';
import { VectorPolygonsLayerRenderer } from './renderers/vector_polygons_renderer';
import { GridLayerRenderer } from './renderers/grid_renderer';

// Registra os renderizadores padrão no Factory
LayerRendererFactory.register('tile', new TileLayerRenderer());
LayerRendererFactory.register('wms', new WmsLayerRenderer());
LayerRendererFactory.register('vetorial-linhas', new VectorLinesLayerRenderer());
LayerRendererFactory.register('vetorial-pontos', new VectorPointsLayerRenderer());
LayerRendererFactory.register('vetorial-poligonos', new VectorPolygonsLayerRenderer());
LayerRendererFactory.register('grid', new GridLayerRenderer());

export const DEFAULT_LAYERS: CanvasLayerDef[] = [
  {
    id: 'satelite',
    nome: 'Satélite Google Híbrido',
    categoria: 'base',
    tipo: 'tile',
    visivel: true,
    opacidade: 1.0,
    zIndex: 200,
    interativo: false,
    bloqueada: false,
    estilo: { scaleMode: 'screen' }
  },
  {
    id: 'sigef',
    nome: 'Acervo Fundiário SIGEF (INCRA)',
    categoria: 'wms',
    tipo: 'wms',
    visivel: true,
    opacidade: 0.85,
    zIndex: 390,
    interativo: true,
    bloqueada: false,
    estilo: { scaleMode: 'screen' }
  },
  {
    id: 'homologados',
    nome: 'Poligonal Homologada (Banco)',
    categoria: 'referencia',
    tipo: 'vetorial-linhas',
    visivel: true,
    opacidade: 0.9,
    zIndex: 420,
    interativo: true,
    bloqueada: false,
    estilo: {
      corPrimaria: '#f59e0b',
      espessuraLinha: 2,
      dashArray: '6, 8',
      scaleMode: 'screen'
    }
  },
  {
    id: 'perimetro',
    nome: 'Divisas e Poligonal do Imóvel',
    categoria: 'levantamento',
    tipo: 'vetorial-linhas',
    visivel: true,
    opacidade: 1.0,
    zIndex: 450,
    interativo: true,
    bloqueada: false,
    estilo: {
      corPrimaria: '#00f5a0',
      espessuraLinha: 2,
      scaleMode: 'screen',
      dimensaoMetros: 0.3
    }
  },
  {
    id: 'vizinhos',
    nome: 'Imóveis Confrontantes (WKT/CSV)',
    categoria: 'referencia',
    tipo: 'vetorial-poligonos',
    visivel: true,
    opacidade: 0.8,
    zIndex: 500,
    interativo: true,
    bloqueada: false,
    estilo: {
      corPrimaria: '#a855f7',
      espessuraLinha: 1.5,
      dashArray: '4, 6',
      scaleMode: 'screen'
    }
  },
  {
    id: 'vertices',
    nome: 'Vértices e Marcos do Levantamento',
    categoria: 'levantamento',
    tipo: 'vetorial-pontos',
    visivel: true,
    opacidade: 1.0,
    zIndex: 650,
    interativo: true,
    bloqueada: false,
    estilo: {
      tamanhoMarcador: 8,
      scaleMode: 'screen',
      dimensaoMetros: 0.25
    }
  },
  {
    id: 'grade',
    nome: 'Grade de Coordenadas UTM',
    categoria: 'referencia',
    tipo: 'grid',
    visivel: true,
    opacidade: 0.5,
    zIndex: 700,
    interativo: false,
    bloqueada: false,
    estilo: {
      corPrimaria: 'rgba(0, 245, 160, 0.18)',
      espessuraLinha: 0.6,
      scaleMode: 'screen'
    }
  }
];

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

    this.layers.forEach(layer => {
      const paneName = `pane-${layer.id}`;
      let pane = this.map!.getPane(paneName);
      if (!pane) {
        pane = this.map!.createPane(paneName);
      }
      if (pane) {
        pane.style.zIndex = String(layer.zIndex);
        pane.style.pointerEvents = layer.interativo && !layer.bloqueada && layer.visivel ? 'auto' : 'none';
      }
    });
  }

  public renderAllLayers(): void {
    if (!this.map || !this.context) return;

    this.layers.forEach(layer => {
      if (this.layerInstances.has(layer.id)) {
        const instance = this.layerInstances.get(layer.id)!;
        const renderer = LayerRendererFactory.get(layer.tipo);
        if (renderer) renderer.destroy(instance, this.map!);
        this.layerInstances.delete(layer.id);
      }

      if (layer.visivel) {
        const renderer = LayerRendererFactory.get(layer.tipo);
        if (renderer) {
          const instance = renderer.render(layer, this.map!, this.context!);
          if (instance) {
            instance.addTo(this.map!);
            this.layerInstances.set(layer.id, instance);
          }
        }
      }
    });

    this.notifyChange();
  }

  public setLayerVisibility(id: string, visivel: boolean): void {
    const layer = this.layers.find(l => l.id === id);
    if (!layer || layer.visivel === visivel) return;

    layer.visivel = visivel;

    if (!this.map || !this.context) return;

    const paneName = `pane-${layer.id}`;
    const pane = this.map.getPane(paneName);
    if (pane) {
      pane.style.display = visivel ? '' : 'none';
      pane.style.pointerEvents = layer.visivel && layer.interativo && !layer.bloqueada ? 'auto' : 'none';
    }

    if (visivel) {
      if (!this.layerInstances.has(id)) {
        const renderer = LayerRendererFactory.get(layer.tipo);
        if (renderer) {
          const instance = renderer.render(layer, this.map, this.context);
          if (instance) {
            instance.addTo(this.map);
            this.layerInstances.set(id, instance);
          }
        }
      }
    } else {
      if (this.layerInstances.has(id)) {
        const instance = this.layerInstances.get(id)!;
        const renderer = LayerRendererFactory.get(layer.tipo);
        if (renderer) renderer.destroy(instance, this.map);
        this.layerInstances.delete(id);
      }
    }

    this.notifyChange();
  }

  public setLayerOpacity(id: string, opacidade: number): void {
    const layer = this.layers.find(l => l.id === id);
    if (!layer) return;

    layer.opacidade = Math.max(0, Math.min(1, opacidade));

    if (this.map) {
      const pane = this.map.getPane(`pane-${id}`);
      if (pane) {
        pane.style.opacity = String(layer.opacidade);
      }
    }

    const instance = this.layerInstances.get(id);
    if (instance && this.map && this.context) {
      const renderer = LayerRendererFactory.get(layer.tipo);
      if (renderer) {
        renderer.update(layer, instance, { opacidade: layer.opacidade }, this.context, this.map);
      }
    }

    this.notifyChange();
  }

  public setLayerZIndex(id: string, zIndex: number): void {
    const layer = this.layers.find(l => l.id === id);
    if (!layer) return;

    layer.zIndex = zIndex;
    if (this.map) {
      const pane = this.map.getPane(`pane-${id}`);
      if (pane) {
        pane.style.zIndex = String(zIndex);
      }
    }

    this.notifyChange();
  }

  public setLayerBlocked(id: string, bloqueada: boolean): void {
    const layer = this.layers.find(l => l.id === id);
    if (!layer) return;

    layer.bloqueada = bloqueada;
    if (this.map) {
      const pane = this.map.getPane(`pane-${id}`);
      if (pane) {
        pane.style.pointerEvents = layer.visivel && layer.interativo && !bloqueada ? 'auto' : 'none';
      }
    }

    this.notifyChange();
  }

  public setLayerScaleMode(id: string, mode: 'screen' | 'world'): void {
    const layer = this.layers.find(l => l.id === id);
    if (!layer) return;

    layer.estilo.scaleMode = mode;
    const instance = this.layerInstances.get(id);
    if (instance && this.map && this.context) {
      const renderer = LayerRendererFactory.get(layer.tipo);
      if (renderer) {
        renderer.update(layer, instance, { estilo: layer.estilo }, this.context, this.map);
      }
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
    return this.layers.map(l => ({
      id: l.id,
      visivel: l.visivel,
      opacidade: l.opacidade,
      zIndex: l.zIndex,
      bloqueada: l.bloqueada,
      estilo: { ...l.estilo }
    }));
  }

  public importState(state: CanvasLayerState[]): void {
    if (!state || !Array.isArray(state)) return;

    state.forEach(saved => {
      const layer = this.layers.find(l => l.id === saved.id);
      if (layer) {
        if (saved.visivel !== undefined) layer.visivel = saved.visivel;
        if (saved.opacidade !== undefined) layer.opacidade = saved.opacidade;
        if (saved.zIndex !== undefined) layer.zIndex = saved.zIndex;
        if (saved.bloqueada !== undefined) layer.bloqueada = saved.bloqueada;
        if (saved.estilo) layer.estilo = { ...layer.estilo, ...saved.estilo };
      }
    });

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

  public destroy(): void {
    if (this.map) {
      this.layerInstances.forEach((instance, layerId) => {
        const layer = this.layers.find(l => l.id === layerId);
        if (layer) {
          const renderer = LayerRendererFactory.get(layer.tipo);
          if (renderer) renderer.destroy(instance, this.map!);
        }
      });
      this.layerInstances.clear();
    }
    this.listeners = [];
  }
}
