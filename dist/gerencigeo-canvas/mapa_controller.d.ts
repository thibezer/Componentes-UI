import { default as L } from 'leaflet';
import { Ponto, Segmento, BancoPonto, Confrontante, CanvasRenderContext, CanvasGraphicScale, CanvasLayerState, CanvasLayerDef, PontoCAD, ConexaoCAD, PoligonoCAD, DestacarElementoOpcoes } from './types';
import { MapaCore } from './mapa_core';
import { CanvasInteracao } from './canvas_interacao';
import { CanvasLayerManager } from './layer_manager';
export declare class GerenciGeoMapaController {
    core: MapaCore;
    layerManager: CanvasLayerManager;
    canvasInteracao: CanvasInteracao;
    context: CanvasRenderContext;
    modoCliqueSequencialAtivo: boolean;
    chaveGrupo?: string;
    levantamentoId: number | null;
    customMarkerClickCallback?: (pId: number, isVizinho?: boolean) => void;
    customPopupActionCallback?: (acaoId: string, elementoId: string | number, elemento: any) => void;
    private destaqueMarker;
    private destaqueTimeoutId;
    constructor(customLayers?: CanvasLayerDef[]);
    init(containerIdOrElement: string | HTMLElement, hostRoot?: HTMLElement | ShadowRoot): L.Map | null;
    invalidateSize(): void;
    setPontos(pontos?: Ponto[] | null): void;
    setSegmentos(segmentos?: Segmento[] | null): void;
    setBancoPontos(bancoPontos?: BancoPonto[] | null): void;
    setConfrontantes(confrontantes?: Confrontante[] | null): void;
    /**
     * Ingestão de nós pontuais na camada indicada (padrão: 'vertices').
     */
    plotarPontos(pontos?: PontoCAD[] | null, camadaId?: string, onClique?: (ponto: PontoCAD) => void): void;
    /**
     * Plota linhas vinculando pares de IDs (origemId -> destinoId).
     */
    plotarConexoes(conexoes?: ConexaoCAD[] | null, camadaId?: string): void;
    /**
     * Conecta a lista ordenada de pontos em sequência (P1 -> P2 -> ... -> Pn) com fechamento opcional (Pn -> P1).
     */
    plotarPolilinhaSequencial(pontos?: PontoCAD[] | null, fechar?: boolean, camadaId?: string, chaveGrupo?: string): void;
    /**
     * Plota áreas a partir de anéis de coordenadas ou strings WKT.
     */
    plotarPoligonos(poligonos?: PoligonoCAD[] | null, camadaId?: string): void;
    /**
     * Remove entidades das camadas especificadas ou de todas as camadas vetoriais se omitido.
     */
    limparCamadas(idsCamadas?: string[]): void;
    /**
     * Retorna as instâncias gráficas ativas no canvas (de uma camada específica ou de todas).
     */
    obterMarcadores(camadaId?: string): L.Marker[];
    /**
     * Plota os pontos do levantamento e opcionalmente associa callback de clique.
     */
    plotPontos(pontos?: Ponto[] | null, onMarkerClick?: (pontoId: number, isVizinho?: boolean) => void): void;
    /**
     * Plota os segmentos cadastrados conectando os pontos correspondentes.
     */
    plotSegmentos(segmentos?: Segmento[] | null, pontos?: Ponto[] | null): void;
    /**
     * Define os pontos e limpa os segmentos para forçar o fechamento automático da poligonal pelo caminhamento (Pn -> P1).
     */
    plotPolilinhaTemporaria(pontos?: Ponto[] | null): void;
    /**
     * Alimenta a camada de vértices homologados do SIGEF.
     */
    plotPoligonalHomologada(bancoPontos?: BancoPonto[] | null): void;
    /**
     * Alimenta a camada de vértices confrontantes com marcadores e polilinhas.
     */
    plotPontosVizinhos(pontos?: Ponto[] | null): void;
    /**
     * Alimenta a camada de limites em polígonos WKT.
     */
    plotPoligonosVizinhos(confrontantes?: Confrontante[] | null): void;
    /**
     * Reseta as camadas vetoriais de trabalho, permitindo preservar opcionalmente o banco de pontos homologados.
     */
    clearOverlays(manterBanco?: boolean): void;
    setGraphicScale(scale: Partial<CanvasGraphicScale>): void;
    exportState(): CanvasLayerState[];
    importState(state: CanvasLayerState[]): void;
    selectPonto(pId: number, zoomLevel?: number): void;
    fitBounds(pontos?: Ponto[], padding?: [number, number], incluirVizinhos?: boolean): void;
    getMarkers(): L.Marker[];
    getVizinhosMarkers(): L.Marker[];
    get destaqueAtivo(): boolean;
    /**
     * Localiza a coordenada geográfica central de qualquer elemento geométrico do canvas pelo identificador (ID).
     * Agnóstico a entidades pontuais, lineares e poligonais.
     */
    localizarCoordenadasElemento(id: string | number): L.LatLng | null;
    /**
     * Localiza, enquadra e pulsa visualmente qualquer elemento geométrico do canvas pelo identificador.
     * Não interfere no estado dos marcadores originais e limpa instâncias anteriores.
     *
     * @param id Identificador do elemento (número ou string)
     * @param opcoes Configurações de câmera, duração e cor de destaque
     */
    destacarElemento(id: string | number, opcoes?: DestacarElementoOpcoes): void;
    /**
     * Remove o anel de destaque pulsante ativo e cancela temporizadores pendentes.
     */
    limparDestaque(): void;
    destroy(): void;
    getMap(): L.Map | null;
}
export { GerenciGeoMapaController as CanvasCADController, GerenciGeoMapaController as CADMapaController };
