import { default as L } from 'leaflet';
import { Ponto, Segmento, BancoPonto, Confrontante, CanvasRenderContext, CanvasGraphicScale, CanvasLayerState, CanvasLayerDef } from './types';
import { MapaCore } from './mapa_core';
import { CanvasInteracao } from './canvas_interacao';
import { CanvasLayerManager } from './layer_manager';
export declare class GerenciGeoMapaController {
    core: MapaCore;
    layerManager: CanvasLayerManager;
    canvasInteracao: CanvasInteracao;
    context: CanvasRenderContext;
    modoCliqueSequencialAtivo: boolean;
    levantamentoId: number | null;
    constructor(customLayers?: CanvasLayerDef[]);
    init(containerIdOrElement: string | HTMLElement, hostRoot?: HTMLElement | ShadowRoot): L.Map | null;
    invalidateSize(): void;
    setPontos(pontos: Ponto[]): void;
    setSegmentos(segmentos: Segmento[]): void;
    setBancoPontos(bancoPontos: BancoPonto[]): void;
    setConfrontantes(confrontantes: Confrontante[]): void;
    setGraphicScale(scale: Partial<CanvasGraphicScale>): void;
    exportState(): CanvasLayerState[];
    importState(state: CanvasLayerState[]): void;
    selectPonto(pId: number, zoomLevel?: number): void;
    fitBounds(pontos?: Ponto[], padding?: [number, number], incluirVizinhos?: boolean): void;
    getMarkers(): L.Marker[];
    getVizinhosMarkers(): L.Marker[];
    destroy(): void;
    getMap(): L.Map | null;
}
