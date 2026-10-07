import type L from 'leaflet';
import type {
  Ponto, Segmento, BancoPonto, Confrontante, CanvasLayerState, CanvasGraphicScale,
  ScaleMode, PontoCAD, ConexaoCAD, PoligonoCAD, DestacarElementoOpcoes
} from '../../gerencigeo-canvas/types';
import { GerenciGeoMapaController } from '../../gerencigeo-canvas/mapa_controller';
import type { CanvasLayerManager } from '../../gerencigeo-canvas/layer_manager';
import { ListenerBag } from '../../core/listener-bag';
import { renderizarPainelCamadas } from './cad-painel-camadas';
import { processarCliqueLivreCanvas, processarAcaoPopup, ContextoEventosCanvas } from './cad-eventos-canvas';
import { criarControladorTamanho, ControladorTamanhoCanvas } from './cad-tamanho-observer';
import { GerenciadorBroadcastConfig } from './cad-broadcast';
import { GerenciadorToolbarPainel } from './cad-toolbar-painel';
import { GerenciadorColecoesDados } from './cad-colecoes-dados';
import { obterTemplateCanvasCAD } from './cad-template';
import { sincronizarAtributoCAD } from './cad-atributos-sync';
import { inicializarCAD } from './cad-inicializador';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';

export class UICanvasCAD extends SafeHTMLElement {
  static get observedAttributes() {
    return ['sat-opacity', 'scale-mode', 'crosshair', 'modo-sequencial', 'chave-grupo', 'zona-projecao', 'fuso', 'canal-configuracao'];
  }

  private shadow: ShadowRoot;
  private mapContainer: HTMLDivElement | null = null;
  private layersPanel: HTMLDivElement | null = null;
  private controller: GerenciGeoMapaController;
  private controladorTamanho: ControladorTamanhoCanvas;
  private toolbarPainel: GerenciadorToolbarPainel;
  private broadcastConfig: GerenciadorBroadcastConfig;
  private colecoesDados: GerenciadorColecoesDados;
  private layerItemListeners = new ListenerBag();
  private initTimeout?: number;
  private lastPopupActionEmit?: { acaoId: string; elementoId: string | number; time: number };
  private lastCanvasClickTime: number = 0;
  private _chaveGrupo?: string;
  private _zonaProjecao: number = 22;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.controller = new GerenciGeoMapaController();
    this.controladorTamanho = criarControladorTamanho(this, this.controller);
    this.shadow.innerHTML = obterTemplateCanvasCAD();

    this.mapContainer = this.shadow.getElementById('cad-map-container') as HTMLDivElement;
    this.layersPanel = this.shadow.getElementById('qgis-layer-panel') as HTMLDivElement;

    this.toolbarPainel = new GerenciadorToolbarPainel({
      shadow: this.shadow,
      mapContainer: this.mapContainer,
      layersPanel: this.layersPanel,
      onToggleCamadas: () => this.toggleLayersPanel(),
      onCloseCamadas: () => this.closeLayersPanel(),
      onZoomExtents: () => this.zoomExtents(),
      onLimparSelecao: () => this.limparSelecao(),
      onTratarCliqueCanvas: (e) => this.tratarCliqueLivreCanvas(e),
      onDispararAcaoPopup: (acaoId, elemId) => this.dispararAcaoPopup(acaoId, elemId)
    });

    this.broadcastConfig = new GerenciadorBroadcastConfig({
      host: this,
      controller: this.controller,
      mapContainer: this.mapContainer,
      setLayerOpacity: (id, op) => this.setLayerOpacity(id, op)
    });

    this.colecoesDados = new GerenciadorColecoesDados({
      obterController: () => this.controller,
      obterChaveGrupo: () => this.chaveGrupo,
      setLayerVisibility: (id, visivel) => this.setLayerVisibility(id, visivel)
    });
  }

  connectedCallback() {
    const attrZona = this.getAttribute('zona-projecao') || this.getAttribute('fuso');
    if (attrZona) {
      const parsed = parseInt(attrZona, 10);
      if (!isNaN(parsed) && parsed > 0) {
        this._zonaProjecao = parsed;
        this.controller.zonaProjecao = parsed;
        this.controller.context.zonaProjecao = parsed;
      }
    }
    this.controladorTamanho.observe();
    this.broadcastConfig.conectar();
    this.initTimeout = window.setTimeout(() => this.initCAD(), 0);
  }

  public destroy(): void {
    if (this.initTimeout) {
      window.clearTimeout(this.initTimeout);
      this.initTimeout = undefined;
    }
    this.controladorTamanho.disconnect();
    this.broadcastConfig.desconectar();
    this.limparDestaque();
    this.toolbarPainel.limpar();
    this.layerItemListeners.cleanup();
    this.controller.destroy();

    if (this.mapContainer && (this.mapContainer as any)._leaflet_id) {
      try {
        delete (this.mapContainer as any)._leaflet_id;
      } catch {
        (this.mapContainer as any)._leaflet_id = undefined;
      }
    }
  }

  disconnectedCallback() { this.destroy(); }
  public invalidateSizeSafely(): void { this.controladorTamanho.invalidateSizeSafely(); }

  attributeChangedCallback(name: string, oldVal: string, newVal: string) {
    sincronizarAtributoCAD(
      {
        host: this,
        controller: this.controller,
        mapContainer: this.mapContainer,
        broadcastConfig: this.broadcastConfig,
        setLayerOpacity: (id, op) => this.setLayerOpacity(id, op),
        setLayerScaleMode: (id, mode) => this.setLayerScaleMode(id, mode),
        atualizarZonaProjecao: (z) => { this._zonaProjecao = z; }
      },
      name,
      oldVal,
      newVal
    );
  }

  private initCAD() {
    inicializarCAD({
      host: this,
      shadow: this.shadow,
      mapContainer: this.mapContainer,
      controller: this.controller,
      toolbarPainel: this.toolbarPainel,
      colecoesDados: this.colecoesDados,
      obterContextoEventos: () => this.obterContextoEventos(),
      renderLayersUI: () => this.renderLayersUI(),
      invalidateSizeSafely: () => this.invalidateSizeSafely(),
      tratarCliqueLivreCanvas: (e, latlng, point) => this.tratarCliqueLivreCanvas(e, latlng, point),
      dispararAcaoPopup: (acao, id, elem) => this.dispararAcaoPopup(acao, id, elem)
    });
  }

  private obterContextoEventos(): ContextoEventosCanvas {
    return {
      host: this,
      controller: this.controller,
      mapContainer: this.mapContainer,
      modoSequencial: this.modoSequencial,
      mouseMovedSinceDown: this.toolbarPainel.houveMovimentoMouse,
      obterElementoPorId: (id) => this.colecoesDados.obterElementoPorId(id),
      fecharPopup: () => { this.controller.getMap()?.closePopup(); }
    };
  }

  public tratarCliqueLivreCanvas(e: MouseEvent | any, latLng?: any, pt?: any): void {
    const agora = Date.now();
    if (agora - this.lastCanvasClickTime < 50) return;
    this.lastCanvasClickTime = agora;
    processarCliqueLivreCanvas(this.obterContextoEventos(), e, latLng, pt);
  }

  public dispararAcaoPopup(acaoId: string, elementoId: string | number, elemento?: any): void {
    const now = Date.now();
    if (this.lastPopupActionEmit && this.lastPopupActionEmit.acaoId === acaoId && this.lastPopupActionEmit.elementoId === elementoId && now - this.lastPopupActionEmit.time < 50) return;
    this.lastPopupActionEmit = { acaoId, elementoId, time: now };
    processarAcaoPopup(this.obterContextoEventos(), acaoId, elementoId, elemento);
  }

  public toggleLayersPanel() { this.toolbarPainel.toggleLayersPanel(); }
  public closeLayersPanel() { this.toolbarPainel.closeLayersPanel(); }

  private renderLayersUI() {
    const container = this.shadow.getElementById('layers-list-container');
    renderizarPainelCamadas(container, this.controller.layerManager.getLayers(), this.layerItemListeners, {
      setLayerVisibility: (id, visivel) => this.setLayerVisibility(id, visivel),
      setLayerOpacity: (id, opacidade) => this.setLayerOpacity(id, opacidade),
      setLayerBlocked: (id, bloqueada) => this.controller.layerManager.setLayerBlocked(id, bloqueada),
      setLayerScaleMode: (id, mode) => this.setLayerScaleMode(id, mode)
    });
  }

  public get pontos(): Ponto[] { return this.colecoesDados.pontos; }
  public set pontos(val: Ponto[]) { this.colecoesDados.pontos = val; }
  public get segmentos(): Segmento[] { return this.colecoesDados.segmentos; }
  public set segmentos(val: Segmento[]) { this.colecoesDados.segmentos = val; }
  public get bancoPontos(): BancoPonto[] { return this.colecoesDados.bancoPontos; }
  public set bancoPontos(val: BancoPonto[]) { this.colecoesDados.bancoPontos = val; }
  public get pontosHomologados(): BancoPonto[] { return this.bancoPontos; }
  public set pontosHomologados(val: BancoPonto[]) { this.bancoPontos = val; }
  public get confrontantes(): Confrontante[] { return this.colecoesDados.confrontantes; }
  public set confrontantes(val: Confrontante[]) { this.colecoesDados.confrontantes = val; }
  public get vizinhos(): Confrontante[] { return this.confrontantes; }
  public set vizinhos(val: Confrontante[]) { this.confrontantes = val; }

  public get modoSequencial(): boolean { return this.hasAttribute('modo-sequencial'); }
  public set modoSequencial(val: boolean) {
    const isTruthy = Boolean(val);
    if (isTruthy) { if (!this.hasAttribute('modo-sequencial')) this.setAttribute('modo-sequencial', ''); }
    else { if (this.hasAttribute('modo-sequencial')) this.removeAttribute('modo-sequencial'); }
    this.controller.modoCliqueSequencialAtivo = isTruthy;
    this.controller.context.modoSequencial = isTruthy;
    if (isTruthy) this.controller.getMap()?.closePopup();
  }

  public get chaveGrupo(): string | undefined { return this.getAttribute('chave-grupo') || this._chaveGrupo; }
  public set chaveGrupo(val: string | undefined) {
    this._chaveGrupo = val;
    if (val) { if (this.getAttribute('chave-grupo') !== val) this.setAttribute('chave-grupo', val); }
    else { if (this.hasAttribute('chave-grupo')) this.removeAttribute('chave-grupo'); }
    this.controller.chaveGrupo = val;
    this.controller.context.chaveGrupo = val;
    this.controller.layerManager.updateContext({ chaveGrupo: val });
  }

  public get zonaProjecao(): number { return this._zonaProjecao ?? 22; }
  public set zonaProjecao(val: number) {
    const parsed = typeof val === 'number' ? Math.floor(val) : parseInt(String(val), 10);
    if (!isNaN(parsed) && parsed > 0) {
      this._zonaProjecao = parsed;
      const strVal = String(parsed);
      if (this.getAttribute('zona-projecao') !== strVal) this.setAttribute('zona-projecao', strVal);
      if (this.hasAttribute('fuso') && this.getAttribute('fuso') !== strVal) this.setAttribute('fuso', strVal);
      this.controller.zonaProjecao = parsed;
      this.controller.context.zonaProjecao = parsed;
    }
  }

  public get canalConfiguracao(): string | null { return this.getAttribute('canal-configuracao'); }
  public set canalConfiguracao(val: string | null) {
    if (val) this.setAttribute('canal-configuracao', val);
    else this.removeAttribute('canal-configuracao');
  }

  public fitBounds(pontos?: Ponto[], padding: [number, number] = [40, 40], incluirVizinhos: boolean = false): void {
    this.controller.fitBounds(pontos, padding, incluirVizinhos);
  }
  public zoomExtents(): void { this.controller.canvasInteracao.zoomExtents(); }
  public selectPonto(id: string | number, zoomLevel?: number): void { this.controller.selectPonto(id, zoomLevel); }
  public selecionarPonto(id: string | number, zoomLevel?: number): void { this.controller.selectPonto(id, zoomLevel); }
  public get pontosSelecionados(): (string | number)[] {
    return (this.controller.context as any).selectedPontoIds || this.controller.canvasInteracao.ctx.selectedPontoIds || [];
  }
  public set pontosSelecionados(ids: (string | number)[]) {
    const safeIds = Array.isArray(ids) ? ids : [];
    this.controller.canvasInteracao.ctx.selectedPontoIds = safeIds as any;
    (this.controller.context as any).selectedPontoIds = [...safeIds];
    this.controller.atualizarDestaqueMarcadores();
  }
  public atualizarDestaqueMarcadores(): void { this.controller.atualizarDestaqueMarcadores(); }
  public selectSegmento(id: string | number | null): void { this.controller.selectSegmento(id); }
  public get segmentoSelecionado(): string | number | null {
    return this.controller.context.selectedSegmentoId || null;
  }
  public set segmentoSelecionado(id: string | number | null) {
    this.controller.selectSegmento(id);
  }
  public limparSelecao(): void { this.controller.canvasInteracao.limparSelecao(); }
  public setLayerVisibility(id: string, visivel: boolean): void { this.controller.layerManager.setLayerVisibility(id, visivel); }
  public setLayerOpacity(id: string, opacidade: number): void { this.controller.layerManager.setLayerOpacity(id, opacidade); }
  public setLayerScaleMode(id: string, mode: ScaleMode): void { this.controller.layerManager.setLayerScaleMode(id, mode); }
  public setGraphicScale(scale: Partial<CanvasGraphicScale>): void { this.controller.setGraphicScale(scale); }
  public exportState(): CanvasLayerState[] { return this.controller.exportState(); }
  public importState(state: CanvasLayerState[]): void { this.controller.importState(state); }
  public invalidateSize(): void { this.invalidateSizeSafely(); }
  public get destaqueAtivo(): boolean { return this.controller.destaqueAtivo; }
  public destacarElemento(id: string | number, opcoes?: DestacarElementoOpcoes): void {
    if (!this.controller.getMap() && this.mapContainer) this.initCAD();
    this.controller.destacarElemento(id, opcoes);
  }
  public limparDestaque(): void { this.controller.limparDestaque(); }

  public plotarPontos(p?: PontoCAD[] | null, c: string = 'vertices', cl?: (p: PontoCAD) => void): void { this.colecoesDados.plotarPontos(p, c, cl); }
  public plotarConexoes(conexoes?: ConexaoCAD[] | null, camadaId: string = 'linhas'): void { this.colecoesDados.plotarConexoes(conexoes, camadaId); }
  public plotarPolilinhaSequencial(p?: PontoCAD[] | null, f: boolean = true, c: string = 'polilinha', cg?: string): void { this.colecoesDados.plotarPolilinhaSequencial(p, f, c, cg); }
  public plotarPoligonos(poligonos?: PoligonoCAD[] | null, camadaId: string = 'poligonos'): void { this.colecoesDados.plotarPoligonos(poligonos, camadaId); }
  public limparCamadas(idsCamadas?: string[]): void { this.colecoesDados.limparCamadas(idsCamadas); }
  public obterMarcadores(camadaId?: string): L.Marker[] { return this.colecoesDados.obterMarcadores(camadaId); }
  public plotPontos(p?: Ponto[] | null, cl?: (id: number, viz?: boolean) => void): void { this.colecoesDados.plotPontos(p, cl); }
  public plotSegmentos(s?: Segmento[] | null, p?: Ponto[] | null): void { this.colecoesDados.plotSegmentos(s, p); }
  public plotPolilinhaTemporaria(pontos?: Ponto[] | null): void { this.colecoesDados.plotPolilinhaTemporaria(pontos); }
  public plotPoligonalHomologada(bancoPontos?: BancoPonto[] | null): void { this.colecoesDados.plotPoligonalHomologada(bancoPontos); }
  public plotPontosVizinhos(pontos?: Ponto[] | null): void { this.colecoesDados.plotPontosVizinhos(pontos); }
  public plotPoligonosVizinhos(confrontantes?: Confrontante[] | null): void { this.colecoesDados.plotPoligonosVizinhos(confrontantes); }
  public clearOverlays(manterBanco: boolean = false): void { this.colecoesDados.clearOverlays(manterBanco); }
  public getMarkers(): L.Marker[] { return this.colecoesDados.getMarkers(); }
  public getVizinhosMarkers(): L.Marker[] { return this.colecoesDados.getVizinhosMarkers(); }
  public getMap(): L.Map | null { return this.controller.getMap(); }
  public getController(): GerenciGeoMapaController { return this.controller; }
  public getLayerManager(): CanvasLayerManager { return this.controller.layerManager; }
}

definirCustomElement('ui-canvas-cad', UICanvasCAD);
