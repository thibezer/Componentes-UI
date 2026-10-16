import type L from 'leaflet';
import type {
  Ponto, Segmento, BancoPonto, Confrontante, CanvasLayerState, CanvasGraphicScale,
  ScaleMode, PontoCAD, ConexaoCAD, PoligonoCAD, DestacarElementoOpcoes
} from '../../gerencigeo-canvas/types';
import { GerenciGeoMapaController } from '../../gerencigeo-canvas/mapa_controller';
import type { CanvasLayerManager } from '../../gerencigeo-canvas/layer_manager';
import { ListenerBag } from '../../core/listener-bag';
import { RegraVersoes } from '../../gerencigeo-canvas/feature_versoes';
import type { UsuarioRemoto } from '../../gerencigeo-canvas/feature_cursores';
import { renderizarPainelCamadas } from './cad-painel-camadas';
import { processarCliqueLivreCanvas, processarAcaoPopup, ContextoEventosCanvas } from './cad-eventos-canvas';
import { criarControladorTamanho, ControladorTamanhoCanvas } from './cad-tamanho-observer';
import { GerenciadorBroadcastConfig } from './cad-broadcast';
import { GerenciadorToolbarPainel } from './cad-toolbar-painel';
import { GerenciadorColecoesDados } from './cad-colecoes-dados';
import { obterTemplateCanvasCAD } from './cad-template';
import { sincronizarAtributoCAD } from './cad-atributos-sync';
import { inicializarCAD } from './cad-inicializador';
import { GerenciadorFeicoes, OpcoesCamadaFeicoes, OpcoesLote, LoteFeicoes, ResultadoLote, ResultadoFeicoes, ResultadoEdicao, ResultadoFerramenta } from './cad-feicoes';
import { BarraFerramentas, interpretarFerramentas, barraPedeEdicao } from './cad-ferramentas-barra';
import type { EstiloFeicao } from '../../gerencigeo-canvas/feature_types';
import type { Feicao } from '../../gerencigeo-canvas/feature_types';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { EstilosExternosShadow, type EstilosExternos } from './cad-estilos-externos';

export class UICanvasCAD extends SafeHTMLElement {
  static get observedAttributes() {
    return ['sat-opacity', 'scale-mode', 'crosshair', 'modo-sequencial', 'chave-grupo', 'zona-projecao', 'fuso', 'canal-configuracao', 'ferramentas', 'sem-atalho-snap', 'aceitar-origem', 'sem-camadas-padrao', 'sem-painel-camadas', 'sem-barra-rapida'];
  }

  private shadow: ShadowRoot;
  private mapContainer: HTMLDivElement | null = null;
  private layersPanel: HTMLDivElement | null = null;
  private controller: GerenciGeoMapaController;
  private controladorTamanho: ControladorTamanhoCanvas;
  private toolbarPainel: GerenciadorToolbarPainel;
  private broadcastConfig: GerenciadorBroadcastConfig;
  private colecoesDados: GerenciadorColecoesDados;
  private feicoes: GerenciadorFeicoes;
  private barraFerramentas: BarraFerramentas;
  private hoverListeners = new ListenerBag();
  private layerItemListeners = new ListenerBag();
  private initTimeout?: number;
  private estilosExternos: EstilosExternosShadow;
  private lastPopupActionEmit?: { acaoId: string; elementoId: string | number; time: number };
  private lastCanvasClickTime: number = 0;
  /** Mouse sobre o componente: junto com o foco dentro dele, decide se S e Enter valem quando há vários canvases na página. */
  private ponteiroSobre = false;
  private _chaveGrupo?: string;
  private _zonaProjecao: number = 22;

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.controller = new GerenciGeoMapaController();
    this.controladorTamanho = criarControladorTamanho(this, this.controller);
    this.shadow.innerHTML = obterTemplateCanvasCAD();
    this.estilosExternos = new EstilosExternosShadow(this.shadow);

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
      onToggleSnap: () => this.feicoes.alternarSnap(),
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

    const regraVersoes = new RegraVersoes();
    // Object.assign (e não `obj.x = ...`): o analisador do manifesto confundiria a atribuição com propriedades do elemento
    const contextoRender = this.controller.context;
    const contextoInteracao = this.controller.canvasInteracao.ctx;
    Object.assign(contextoRender, { regraVersoes });
    this.feicoes = new GerenciadorFeicoes({
      obterLayerManager: () => this.controller.layerManager,
      obterMapa: () => this.controller.getMap(),
      regra: regraVersoes,
      aoFerramenta: (f) => { this.barraFerramentas.marcar(f); },
      aoEdicao: (ativa) => { this.barraFerramentas.marcarEdicao(ativa); },
      atalhoValido: () => this.ponteiroSobre || this.matchesFocoInterno() || this.ehUnicoCanvas(),
      aoSnapMudar: (ligado) => { this.shadow.getElementById('btn-toggle-snap')?.classList.toggle('active', ligado); },
      emitir: (evento, detalhe, cancelavel) => {
        const ev = new CustomEvent(evento, { detail: detalhe, bubbles: true, composed: true, cancelable: !!cancelavel });
        this.dispatchEvent(ev);
        return ev.defaultPrevented;
      }
    });
    Object.assign(contextoRender, {
      onLayerAction: (acao: string, detalhe: { camadaId: string; feicao: Feicao; aditivo?: boolean }) => {
        const evento = this.feicoes.tratarAcaoCamada(acao, detalhe);
        if (evento) this.dispatchEvent(new CustomEvent(evento, { detail: detalhe, bubbles: true, composed: true }));
      }
    });
    this.barraFerramentas = new BarraFerramentas({
      raiz: this.shadow.getElementById('cad-root') as HTMLElement,
      aoEscolher: (f) => { this.feicoes.alternarFerramenta(f); },
      aoEditar: () => { this.feicoes.alternarEdicaoDaSelecao(); }
    });
    this.montarBarra(this.getAttribute('ferramentas'));
    Object.assign(contextoInteracao, {
      aoMenuContexto: (e: MouseEvent) => this.feicoes.menuContexto(e),
      ferramentaAtiva: () => this.feicoes.ferramentaAtiva !== null,
      aoLimparSelecao: () => this.feicoes.aoPedirLimpeza(),
      selecionarFeicoesNaCaixa: (caixa: { x1: number; y1: number; x2: number; y2: number }, modo: 'window' | 'crossing', aditivo: boolean) =>
        this.feicoes.selecionarNaCaixa(caixa, modo, aditivo)
    });
    this.shadow.getElementById('btn-toggle-snap')?.classList.add('active');
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
    this.feicoes.conectarTeclado();
    this.hoverListeners.cleanup();
    if (this.mapContainer) this.hoverListeners.add(this.mapContainer, 'mousemove', (e: MouseEvent) => this.feicoes.aoMoverMouse(e));
    this.hoverListeners.add(this, 'mouseenter', () => { this.ponteiroSobre = true; });
    this.hoverListeners.add(this, 'mouseleave', () => { this.ponteiroSobre = false; });
    this.montarBarra(this.getAttribute('ferramentas'));
    this.broadcastConfig.conectar();
    this.estilosExternos.aplicar();
    this.initTimeout = window.setTimeout(() => { this.initTimeout = undefined; this.inicializarAgora(); }, 0);
  }

  private montarBarra(valor: string | null): void {
    this.barraFerramentas?.montar(interpretarFerramentas(valor), barraPedeEdicao(valor));
  }

  /** Único canvas da página: os atalhos valem em qualquer lugar (comportamento de sempre). Com vários, só no que está sob o mouse ou com foco. */
  private ehUnicoCanvas(): boolean {
    const raiz = this.getRootNode() as Document | ShadowRoot;
    return (raiz.querySelectorAll?.('ui-canvas-cad').length ?? 1) <= 1;
  }

  /** O foco do teclado está dentro do componente (inclusive no shadow DOM)? */
  private matchesFocoInterno(): boolean {
    try {
      return this.matches(':focus-within');
    } catch {
      return false;
    }
  }

  public destroy(): void {
    if (this.initTimeout) {
      window.clearTimeout(this.initTimeout);
      this.initTimeout = undefined;
    }
    this.controladorTamanho.disconnect();
    this.estilosExternos.limpar();
    this.feicoes.pararEdicao();
    this.feicoes.desativarFerramenta();
    this.feicoes.limparMedicao();
    this.feicoes.desconectarTeclado();
    this.feicoes.destruir();
    this.hoverListeners.cleanup();
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
    if (name === 'sem-atalho-snap') {
      this.feicoes?.definirAtalhoSnap(newVal === null);
      return;
    }
    // lidos na inicialização do mapa (camadas) ou só por CSS (barra); o painel aberto fecha ao ser desligado
    if (name === 'sem-camadas-padrao' || name === 'sem-barra-rapida') return;
    if (name === 'sem-painel-camadas') {
      if (newVal !== null) this.toolbarPainel?.closeLayersPanel();
      return;
    }
    if (name === 'aceitar-origem') {
      if (this.feicoes) this.feicoes.aceitarOrigem = newVal !== null && newVal !== 'false';
      return;
    }
    if (name === 'ferramentas') {
      this.montarBarra(newVal);
      this.barraFerramentas?.marcar(this.feicoes?.ferramentaAtiva ?? null);
      this.barraFerramentas?.marcarEdicao(!!this.feicoes?.editando);
      return;
    }
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

  /**
   * Cria o mapa agora, sem esperar o agendamento do `connectedCallback`. Idempotente: se o mapa já existe,
   * devolve o mesmo; nunca cria um segundo. Devolve `null` se não houver contêiner (ex.: componente já destruído).
   */
  public inicializarAgora(): L.Map | null {
    if (this.initTimeout !== undefined) {
      window.clearTimeout(this.initTimeout);
      this.initTimeout = undefined;
    }
    const existente = this.controller.getMap();
    if (existente) return existente;
    if (this.hasAttribute('sem-camadas-padrao')) this.controller.layerManager.descartarCamadasPadrao();
    this.initCAD();
    return this.controller.getMap();
  }

  /**
   * CSS do consumidor dentro do shadow root (popups, rótulos...). Aceita texto ou folhas (`document.styleSheets`,
   * copiadas como texto); cada chamada substitui a anterior, `null`/`[]` remove. `destroy()` tira as folhas do
   * shadow root e uma reconexão as recoloca.
   */
  public definirEstilosExternos(css: EstilosExternos): void {
    this.estilosExternos.definir(css);
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

  public toggleLayersPanel() { if (!this.hasAttribute('sem-painel-camadas')) this.toolbarPainel.toggleLayersPanel(); }
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

  /**
   * Aceita a coordenada (0, 0) exata nas feições (atributo `aceitar-origem`). Padrão `false`: (0, 0) costuma ser
   * placeholder de erro e a feição com vértice ali é recusada. Vale para as feições enviadas daqui para frente.
   */
  public get aceitarOrigem(): boolean { return this.hasAttribute('aceitar-origem') && this.getAttribute('aceitar-origem') !== 'false'; }
  public set aceitarOrigem(val: boolean) {
    if (val) this.setAttribute('aceitar-origem', '');
    else this.removeAttribute('aceitar-origem');
  }

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
  public limparSelecao(): void { this.controller.canvasInteracao.limparSelecao(); this.feicoes.limparSelecaoFeicoes(); }
  public setLayerVisibility(id: string, visivel: boolean): void { this.controller.layerManager.setLayerVisibility(id, visivel); }
  public setLayerOpacity(id: string, opacidade: number): void { this.controller.layerManager.setLayerOpacity(id, opacidade); }
  public setLayerScaleMode(id: string, mode: ScaleMode): void { this.controller.layerManager.setLayerScaleMode(id, mode); }
  public setGraphicScale(scale: Partial<CanvasGraphicScale>): void { this.controller.setGraphicScale(scale); }
  public exportState(): CanvasLayerState[] { return this.controller.exportState(); }
  public importState(state: CanvasLayerState[]): void { this.controller.importState(state); }
  public invalidateSize(): void { this.invalidateSizeSafely(); }
  public get destaqueAtivo(): boolean { return this.controller.destaqueAtivo; }
  public destacarElemento(id: string | number, opcoes?: DestacarElementoOpcoes): void {
    this.inicializarAgora();
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
  /** Cria (se preciso) a camada de feições e a preenche. Nenhuma camada de feições existe até esta chamada. */
  public definirFeicoes(camadaId: string, feicoes: unknown[], opcoes?: OpcoesCamadaFeicoes): ResultadoFeicoes {
    return this.feicoes.definirFeicoes(camadaId, feicoes, opcoes);
  }
  public adicionarFeicao(camadaId: string, feicao: unknown, opcoes?: OpcoesCamadaFeicoes): Feicao | null {
    return this.feicoes.adicionarFeicao(camadaId, feicao, opcoes);
  }
  /**
   * Mescla `parcial` na feição (estilo e propriedades também). Com `opcoes.substituirPropriedades`, as `propriedades`
   * informadas trocam as atuais por inteiro, para refletir atributos apagados no consumidor.
   */
  public atualizarFeicao(camadaId: string, id: string, parcial: Record<string, any>, opcoes?: { substituirPropriedades?: boolean }): Feicao | null {
    return this.feicoes.atualizarFeicao(camadaId, id, parcial, opcoes);
  }
  /**
   * Várias mudanças numa só regravação da camada: remove, atualiza e adiciona (nessa ordem). Adicionar um id existente
   * substitui a feição mantendo a posição. Devolve contagens e os ids recusados.
   */
  public aplicarLote(camadaId: string, lote: LoteFeicoes, opcoes?: OpcoesLote): ResultadoLote {
    return this.feicoes.aplicarLote(camadaId, lote, opcoes);
  }
  public removerFeicao(camadaId: string, id: string): boolean { return this.feicoes.removerFeicao(camadaId, id); }
  public obterFeicoes(camadaId: string): Feicao[] { return this.feicoes.obterFeicoes(camadaId); }
  public selecionarFeicoes(refs: Array<{ camadaId: string; id: string }>, aditivo = false): void { this.feicoes.selecionarFeicoes(refs, aditivo); }
  public selecionarFeicao(camadaId: string, id: string): void { this.feicoes.selecionarFeicoes([{ camadaId, id }]); }
  public alternarSelecaoFeicao(camadaId: string, id: string): void { this.feicoes.alternarSelecaoFeicao({ camadaId, id }); }
  public limparSelecaoFeicoes(): void { this.feicoes.limparSelecaoFeicoes(); }
  public obterFeicoesSelecionadas(): Feicao[] { return this.feicoes.obterFeicoesSelecionadas(); }
  /** Edita os vértices da feição (ponto, linha ou polígono de um anel). Recusas também saem em `cad-edicao-recusada`. */
  public editarVertices(camadaId: string, id: string): ResultadoEdicao { return this.feicoes.iniciarEdicao(camadaId, id); }
  public pararEdicaoVertices(): void { this.feicoes.pararEdicao(); }
  public get editandoVertices(): boolean { return this.feicoes.editando; }
  public get snapLigado(): boolean { return this.feicoes.snapLigado; }
  public definirSnap(ligado: boolean): void { this.feicoes.definirSnap(ligado); }
  public alternarSnap(): void { this.feicoes.alternarSnap(); }
  // ---- ferramentas de desenho (nenhuma camada de desenho existe até o consumidor escolher uma) ----
  /** Camada que recebe o que for desenhado; criada na primeira feição se ainda não existir. */
  public definirCamadaDesenho(camadaId: string | null): void { this.feicoes.definirCamadaDesenho(camadaId); }
  public get camadaDesenho(): string | null { return this.feicoes.camadaDeDesenho; }
  public definirEstiloDesenho(estilo: EstiloFeicao): void { this.feicoes.definirEstiloDesenho(estilo); }
  public obterEstiloDesenho(): EstiloFeicao { return this.feicoes.obterEstiloDesenho(); }
  /**
   * Ferramentas: ponto, linha, poligono, retangulo, elipse, poligono-regular, estrela, circulo, texto, caneta,
   * medir-distancia, medir-area, dividir, selecao-laco, conta-gotas. `iniciarEm` ([lat, lon]) registra o primeiro clique.
   */
  public definirFerramenta(nome: string | null, opcoes?: { fechar?: boolean; iniciarEm?: [number, number] }): ResultadoFerramenta {
    if (nome === null) { this.feicoes.desativarFerramenta(); return { ok: true }; }
    return this.feicoes.ativarFerramenta(nome, opcoes);
  }
  public get ferramentaAtiva(): string | null { return this.feicoes.ferramentaAtiva; }
  public limparMedicao(): void { this.feicoes.limparMedicao(); }
  /** Vértices já colocados na figura em andamento. */
  public get nosDesenho(): number { return this.feicoes.nosDesenho; }
  /** Desfaz o último vértice da figura em andamento; devolve se havia algo a desfazer. */
  public desfazerVerticeDesenho(): boolean { return this.feicoes.desfazerVerticeDesenho(); }
  /** Desliga a tecla S do snap para quem já trata a tecla; o botão e `definirSnap` seguem funcionando. */
  public definirAtalhoSnap(ligado: boolean): void { this.feicoes.definirAtalhoSnap(ligado); }
  public gerarBuffer(camadaId: string, id: string, metros: number, opcoes?: { camadaDestino?: string; id?: string }): Feicao | null { return this.feicoes.gerarBuffer(camadaId, id, metros, opcoes); }
  public duplicarFeicao(camadaId: string, id: string, deslocamento?: { lesteM?: number; norteM?: number }, opcoes?: { id?: string }): Feicao | null { return this.feicoes.duplicarFeicao(camadaId, id, deslocamento, opcoes); }
  public juntarFeicoes(camadaId: string, ids: string[], opcoes?: { toleranciaM?: number; id?: string }): Feicao | null { return this.feicoes.juntarFeicoes(camadaId, ids, opcoes); }
  public zoomParaFeicao(camadaId: string, id: string): boolean { return this.feicoes.zoomParaFeicao(camadaId, id); }
  public zoomParaFeicoes(refs: Array<{ camadaId: string; id: string }>): boolean { return this.feicoes.zoomParaFeicoes(refs); }
  /** Enquadra todas as feições das camadas de feições visíveis. */
  public ajustarTudo(): boolean { return this.feicoes.ajustarTudo(); }
  /** Enquadra a camada; se estiver oculta, torna-a visível. */
  public ajustarCamada(camadaId: string): boolean { return this.feicoes.ajustarCamada(camadaId); }
  // ---- versões: oficial × prévia ----
  public get previasGlobais(): boolean { return this.feicoes.previasGlobais; }
  public definirPreviasGlobais(ligado: boolean): void { this.feicoes.definirPreviasGlobais(ligado); }
  public alternarPreviasGlobais(): void { this.feicoes.alternarPreviasGlobais(); }
  public alternarPrevia(camadaId: string, id: string): boolean | null { return this.feicoes.alternarPrevia(camadaId, id); }
  public previaSolicitada(camadaId: string, id: string): boolean { return this.feicoes.previaSolicitada(camadaId, id); }
  // ---- colaboração ----
  /** Cursor de outro operador. Nome e cor vêm da rede: o nome é escapado e a cor só vale como #hex. */
  public atualizarCursorRemoto(usuario: UsuarioRemoto, posicao: [number, number] | { lat: number; lng?: number; lon?: number }): boolean { return this.feicoes.atualizarCursorRemoto(usuario, posicao); }
  public removerCursorRemoto(id: string): boolean { return this.feicoes.removerCursorRemoto(id); }
  public limparCursoresRemotos(): void { this.feicoes.limparCursoresRemotos(); }
  public fecharPopupFeicao(): void { this.feicoes.fecharPopup(); }
  /**
   * Opções do popup. `copiarParaAreaDeTransferencia` (padrão `true`): a ação "copiar" também grava as coordenadas na área de
   * transferência; com `false` só sai `cad-feicao-acao` e o consumidor decide (ex.: para mostrar o próprio aviso).
   */
  public definirOpcoesPopup(opcoes: { copiarParaAreaDeTransferencia?: boolean }): void { this.feicoes.definirOpcoesPopup(opcoes); }
  /** Distância (px) que o auto-pan do popup mantém de barras, tabelas ou painéis laterais sobrepostos ao mapa. */
  public definirMargensPopup(margens: { topo?: number; base?: number; esquerda?: number; direita?: number }): void { this.feicoes.definirMargensPopup(margens); }

  /**
   * Margens (px) de barras e painéis sobrepostos ao mapa; os HUDs de desenho e de edição de vértices se centralizam
   * na área visível. Padrão: `{ topo: 0, base: 16, esquerda: 0, direita: 0 }`. Em CSS: `--cad-hud-base`, `--cad-hud-esquerda`,
   * `--cad-hud-direita` e `--cad-hud-topo` no host.
   */
  public definirMargensHud(margens: { topo?: number; base?: number; esquerda?: number; direita?: number }): void { this.feicoes.definirMargensHud(margens); }

  public getMap(): L.Map | null { return this.controller.getMap(); }
  public getController(): GerenciGeoMapaController { return this.controller; }
  public getLayerManager(): CanvasLayerManager { return this.controller.layerManager; }
}

definirCustomElement('ui-canvas-cad', UICanvasCAD);
