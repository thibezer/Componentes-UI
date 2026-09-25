import { default as L } from 'leaflet';
import { MapaConfigManager } from './mapa_config';
import { MapaConfiguracoes } from './types';
export interface MapaCoreControllerRef {
    modoCliqueSequencialAtivo?: boolean;
    canvasInteracao?: {
        selectionHappened?: boolean;
    };
    layerManager?: any;
}
export declare class MapaCore {
    map: L.Map | null;
    configManager: MapaConfigManager;
    config: MapaConfiguracoes;
    apiBaseUrl: string;
    bancoPontosGroup: L.LayerGroup;
    pontosVizinhosGroup: L.LayerGroup;
    private controller;
    private containerElement;
    private bc?;
    private currentSigefAbortController?;
    constructor(controller: MapaCoreControllerRef);
    init(containerIdOrElement: string | HTMLElement): L.Map | null;
    /**
     * Recalcula com segurança as dimensões do viewport Leaflet.
     * Absorve silenciosamente exceções de desmontagem e panes desanexados (undefined._leaflet_pos).
     */
    invalidateSize(animate?: boolean): void;
    private applyMapStyles;
    private listenConfigBroadcast;
    destroy(): void;
    preCarregarTilesRegiao(bounds: L.LatLngBounds): void;
    private lonToTileX;
    private latToTileY;
    private consultarSigef;
}
