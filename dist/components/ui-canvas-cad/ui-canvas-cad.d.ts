import { default as L } from 'leaflet';
import { Ponto, Segmento, BancoPonto, Confrontante, CanvasLayerState, CanvasGraphicScale, ScaleMode, PontoCAD, ConexaoCAD, PoligonoCAD, DestacarElementoOpcoes } from '../../gerencigeo-canvas/types';
import { GerenciGeoMapaController } from '../../gerencigeo-canvas/mapa_controller';
import { CanvasLayerManager } from '../../gerencigeo-canvas/layer_manager';
export declare class UICanvasCAD extends HTMLElement {
    static get observedAttributes(): string[];
    private shadow;
    private mapContainer;
    private layersPanel;
    private controller;
    private isLayersPanelOpen;
    private initTimeout?;
    private uiListeners;
    private layerItemListeners;
    private customMarkerClickHandler?;
    private lastPopupActionEmit?;
    private lastCanvasClickTime;
    private mouseMovedSinceDown;
    private mouseDownPos;
    private _chaveGrupo?;
    private _zonaProjecao;
    private configBroadcastChannel;
    private _pontos;
    private _segmentos;
    private _bancoPontos;
    private _confrontantes;
    constructor();
    private resizeObserver;
    private resizeDebounceTimer;
    private lastHostWidth;
    private lastHostHeight;
    connectedCallback(): void;
    destroy(): void;
    disconnectedCallback(): void;
    /**
     * Conecta ao canal de BroadcastChannel especificado no atributo 'canal-configuracao'.
     * 100% configurável sem strings mágicas hardcoded.
     */
    private setupConfigBroadcastChannel;
    /**
     * Processa mensagens recebidas pelo barramento global de configuração.
     * Atualiza cursor, opacidades de camadas e emite evento 'ui-config-aplicada'.
     */
    private processarMensagemConfiguracao;
    /**
     * Instancia um ResizeObserver monitorando o elemento host (this).
     * Ao detectar variação de largura ou altura > 0, aciona a invalidação de dimensões com debounce de 25ms.
     */
    private setupResizeObserver;
    /**
     * Aciona a invalidação de dimensões do mapa com debounce (ex: 20ms a 30ms).
     */
    private triggerDebouncedResize;
    /**
     * Executa a invalidação dimensional do mapa com salvaguardas de estabilidade
     * absorvendo tentativas de leitura com panes desanexados (undefined._leaflet_pos).
     */
    invalidateSizeSafely(): void;
    attributeChangedCallback(name: string, oldVal: string, newVal: string): void;
    private initCAD;
    private setupUIEvents;
    /**
     * Monitora e processa cliques em áreas livres do mapa para emissão do evento 'ui-canvas-clique'.
     * Assegura que o evento não dispare indevidamente durante operações de arraste ou janelas de seleção CAD.
     */
    tratarCliqueLivreCanvas(e: MouseEvent | any, latLngParam?: {
        lat: number;
        lng?: number;
        lon?: number;
    }, containerPointParam?: {
        x: number;
        y: number;
    }): void;
    /**
     * Dispara o evento customizado 'ui-acao-popup' com as informações da ação acionada e fecha o popup.
     */
    dispararAcaoPopup(acaoId: string, elementoId: string | number, elemento?: any): void;
    toggleLayersPanel(): void;
    closeLayersPanel(): void;
    private renderLayersUI;
    get pontos(): Ponto[];
    set pontos(val: Ponto[]);
    get segmentos(): Segmento[];
    set segmentos(val: Segmento[]);
    get bancoPontos(): BancoPonto[];
    set bancoPontos(val: BancoPonto[]);
    get pontosHomologados(): BancoPonto[];
    set pontosHomologados(val: BancoPonto[]);
    get confrontantes(): Confrontante[];
    set confrontantes(val: Confrontante[]);
    get vizinhos(): Confrontante[];
    set vizinhos(val: Confrontante[]);
    /**
     * Alterna o modo de captura sequencial ponto a ponto (reflte atributo 'modo-sequencial').
     * Quando true, cliques em elementos geométricos suprimem popups e disparam 'ui-clique-sequencial'.
     * Não desseleciona elementos previamente ativos.
     */
    get modoSequencial(): boolean;
    set modoSequencial(val: boolean);
    /**
     * Propriedade de chave de agrupamento genérica para polilinhas e multi-geometrias.
     * Pontos de grupos distintos nunca compartilham uma aresta a menos que exista uma conexão explícita entre seus IDs.
     */
    get chaveGrupo(): string | undefined;
    set chaveGrupo(val: string | undefined);
    /**
     * Zona ou fuso de projeção cartográfica ativa (padrão: 22).
     * Validado estritamente para números inteiros positivos (> 0).
     * Sincronizado bidirecionalmente com os atributos 'zona-projecao' e 'fuso'.
     */
    get zonaProjecao(): number;
    set zonaProjecao(val: number);
    /**
     * Nome do canal de BroadcastChannel desacoplado para barramento global de configuração em tempo real.
     * 100% configurável via atributo 'canal-configuracao' sem strings mágicas hardcoded.
     */
    get canalConfiguracao(): string | null;
    set canalConfiguracao(val: string | null);
    fitBounds(pontos?: Ponto[], padding?: [number, number], incluirVizinhos?: boolean): void;
    zoomExtents(): void;
    selectPonto(id: number, zoomLevel?: number): void;
    limparSelecao(): void;
    setLayerVisibility(id: string, visivel: boolean): void;
    setLayerOpacity(id: string, opacidade: number): void;
    setLayerScaleMode(id: string, mode: ScaleMode): void;
    setGraphicScale(scale: Partial<CanvasGraphicScale>): void;
    exportState(): CanvasLayerState[];
    importState(state: CanvasLayerState[]): void;
    invalidateSize(): void;
    /**
     * Indica se há algum anel de destaque pulsante ativo no canvas.
     */
    get destaqueAtivo(): boolean;
    /**
     * Localiza, enquadra e pulsa visualmente qualquer elemento geométrico do canvas pelo identificador (ID).
     * Agnóstico a entidades pontuais, lineares e poligonais.
     * Não interfere no estado dos marcadores originais e limpa instâncias anteriores.
     *
     * @param id Identificador do elemento (número ou string)
     * @param opcoes Configurações opcionais de pan suave, nível de zoom, duracaoMs e cor do pulso
     */
    destacarElemento(id: string | number, opcoes?: DestacarElementoOpcoes): void;
    /**
     * Remove o anel de destaque pulsante ativo e limpa quaisquer temporizadores pendentes.
     */
    limparDestaque(): void;
    /**
     * Ingestão de nós pontuais na camada indicada (padrão: 'vertices').
     */
    plotarPontos(pontos?: PontoCAD[] | null, camadaId?: string, onClique?: (ponto: PontoCAD) => void): void;
    /**
     * Plota linhas vinculando pares de IDs.
     */
    plotarConexoes(conexoes?: ConexaoCAD[] | null, camadaId?: string): void;
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
     * Recebe a lista de vértices e atualiza a camada de pontos do layerManager.
     * Se receber um callback de clique, associa-o ao evento interno.
     */
    plotPontos(pontos?: Ponto[] | null, onMarkerClick?: (pontoId: number, isVizinho?: boolean) => void): void;
    /**
     * Recebe as divisas cadastradas e delega a renderização para a camada vetorial de linhas.
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
     * Alimenta a camada de vértices confrontantes.
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
    /**
     * Devolve o array de marcadores instanciados no Leaflet.
     */
    getMarkers(): L.Marker[];
    /**
     * Devolve o array de marcadores vizinhos/confrontantes instanciados no Leaflet.
     */
    getVizinhosMarkers(): L.Marker[];
    getMap(): L.Map | null;
    getController(): GerenciGeoMapaController;
    getLayerManager(): CanvasLayerManager;
}
