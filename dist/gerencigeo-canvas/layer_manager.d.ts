import { default as L } from 'leaflet';
import { CanvasLayerDef, CanvasLayerState, CanvasRenderContext, CanvasGraphicScale, CanvasLayerType, CanvasLayerCategory } from './types';
export declare const DEFAULT_LAYERS: CanvasLayerDef[];
export declare class CanvasLayerManager {
    private layers;
    private layerInstances;
    private map;
    private context;
    private listeners;
    constructor(initialLayers?: CanvasLayerDef[]);
    attachMap(map: L.Map, context: CanvasRenderContext): void;
    ensurePanes(): void;
    renderAllLayers(): void;
    setLayerVisibility(id: string, visivel: boolean): void;
    setLayerOpacity(id: string, opacidade: number): void;
    setLayerZIndex(id: string, zIndex: number): void;
    setLayerBlocked(id: string, bloqueada: boolean): void;
    setLayerScaleMode(id: string, mode: 'screen' | 'world'): void;
    setGraphicScale(scale: Partial<CanvasGraphicScale>): void;
    updateContext(newContext: Partial<CanvasRenderContext>): void;
    getLayers(): CanvasLayerDef[];
    getActiveSelectableLayers(): CanvasLayerDef[];
    isLayerActiveAndSelectable(layerId: string): boolean;
    getLayerInstance(layerId: string): L.Layer | L.LayerGroup | undefined;
    getAllLayerInstances(): (L.Layer | L.LayerGroup)[];
    /**
     * Obtém uma camada existente ou a cria dinamicamente de forma agnóstica.
     */
    getOrCreateLayer(id: string, tipo?: CanvasLayerType, nome?: string, categoria?: CanvasLayerCategory): CanvasLayerDef;
    /**
     * Define os dados de uma camada e solicita re-renderização ao renderizador correspondente.
     */
    setLayerData(id: string, dados: any): void;
    /**
     * Remove entidades das camadas especificadas ou de todas as camadas vetoriais se omitido.
     */
    clearLayers(idsCamadas?: string[]): void;
    exportState(): CanvasLayerState[];
    importState(state: CanvasLayerState[]): void;
    onChange(callback: (layers: CanvasLayerDef[]) => void): () => void;
    private notifyChange;
    destroy(): void;
}
