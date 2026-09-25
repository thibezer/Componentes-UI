import L from 'leaflet';
import { leafletCss } from '../../core/leaflet-style';
import estilos from './ui-canvas-cad.css?inline';
import type {
  Ponto,
  Segmento,
  BancoPonto,
  Confrontante,
  CanvasLayerState,
  CanvasGraphicScale,
  ScaleMode,
  PontoCAD,
  ConexaoCAD,
  PoligonoCAD,
  DestacarElementoOpcoes
} from '../../gerencigeo-canvas/types';
import { GerenciGeoMapaController } from '../../gerencigeo-canvas/mapa_controller';
import type { CanvasLayerManager } from '../../gerencigeo-canvas/layer_manager';
import { ListenerBag } from '../../core/listener-bag';
import { renderizarPainelCamadas } from './cad-painel-camadas';
import { processarCliqueLivreCanvas, processarAcaoPopup } from './cad-eventos-canvas';
import { criarControladorTamanho, ControladorTamanhoCanvas } from './cad-tamanho-observer';

export class UICanvasCAD extends HTMLElement {
  static get observedAttributes() {
    return [
      'sat-opacity',
      'scale-mode',
      'crosshair',
      'modo-sequencial',
      'chave-grupo',
      'zona-projecao',
      'fuso',
      'canal-configuracao'
    ];
  }

  private shadow: ShadowRoot;
  private mapContainer: HTMLDivElement | null = null;
  private layersPanel: HTMLDivElement | null = null;
  private controller: GerenciGeoMapaController;
  private controladorTamanho: ControladorTamanhoCanvas;
  private isLayersPanelOpen: boolean = false;
  private initTimeout?: number;
  private uiListeners = new ListenerBag();
  private layerItemListeners = new ListenerBag();
  private customMarkerClickHandler?: (pontoId: number, isVizinho?: boolean) => void;
  private lastPopupActionEmit?: { acaoId: string; elementoId: string | number; time: number };
  private lastCanvasClickTime: number = 0;
  private mouseMovedSinceDown: boolean = false;
  private mouseDownPos = { x: 0, y: 0 };
  private _chaveGrupo?: string;
  private _zonaProjecao: number = 22;
  private configBroadcastChannel: BroadcastChannel | null = null;

  private _pontos: Ponto[] = [];
  private _segmentos: Segmento[] = [];
  private _bancoPontos: BancoPonto[] = [];
  private _confrontantes: Confrontante[] = [];

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.controller = new GerenciGeoMapaController();
    this.controladorTamanho = criarControladorTamanho(this, this.controller);

    this.shadow.innerHTML = `
      <style>
        ${leafletCss}
        ${estilos}
      </style>
      <div class="cad-root" id="cad-root">
        <!-- Mapa Leaflet Canvas -->
        <div class="cad-map-container" id="cad-map-container"></div>

        <!-- Painel de Camadas -->
        <div class="qgis-layer-panel collapsed" id="qgis-layer-panel">
          <div class="layer-panel-header">
            <div class="layer-panel-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
              Camadas
            </div>
            <button class="layer-panel-close" id="btn-close-layers" type="button" title="Fechar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="layer-panel-body" id="layers-list-container">
            <!-- Camadas renderizadas dinamicamente -->
          </div>
        </div>

        <!-- Toolbar Rápida do Canvas -->
        <div class="cad-quick-toolbar">
          <button class="cad-btn-tool" id="btn-toggle-layers" type="button" title="Camadas">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          </button>
          <button class="cad-btn-tool" id="btn-zoom-extents" type="button" title="Enquadrar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
          </button>
          <button class="cad-btn-tool" id="btn-clear-selection" type="button" title="Limpar seleção">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
          </button>
        </div>
      </div>
    `;

    this.mapContainer = this.shadow.getElementById('cad-map-container') as HTMLDivElement;
    this.layersPanel = this.shadow.getElementById('qgis-layer-panel') as HTMLDivElement;
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
    this.setupConfigBroadcastChannel();

    this.initTimeout = window.setTimeout(() => {
      this.initCAD();
    }, 0);
  }

  public destroy(): void {
    if (this.initTimeout) {
      window.clearTimeout(this.initTimeout);
      this.initTimeout = undefined;
    }
    this.controladorTamanho.disconnect();
    if (this.configBroadcastChannel) {
      try {
        this.configBroadcastChannel.close();
      } catch {}
      this.configBroadcastChannel = null;
    }
    this.limparDestaque();
    this.uiListeners.cleanup();
    this.layerItemListeners.cleanup();
    this.controller.destroy();

    // Limpa a propriedade interna do Leaflet no elemento container, se existir
    if (this.mapContainer && (this.mapContainer as any)._leaflet_id) {
      try {
        delete (this.mapContainer as any)._leaflet_id;
      } catch (e) {
        (this.mapContainer as any)._leaflet_id = undefined;
      }
    }
  }

  disconnectedCallback() {
    this.destroy();
  }

  /**
   * Conecta ao canal de BroadcastChannel especificado no atributo 'canal-configuracao'.
   * 100% configurável sem strings mágicas hardcoded.
   */
  private setupConfigBroadcastChannel(canalNome?: string | null): void {
    if (this.configBroadcastChannel) {
      try {
        this.configBroadcastChannel.close();
      } catch {}
      this.configBroadcastChannel = null;
    }

    const nome = canalNome !== undefined ? canalNome : this.getAttribute('canal-configuracao');
    if (!nome || typeof BroadcastChannel === 'undefined') return;

    try {
      this.configBroadcastChannel = new BroadcastChannel(nome);
      this.configBroadcastChannel.onmessage = (event: MessageEvent) => {
        this.processarMensagemConfiguracao(event.data);
      };
    } catch (err) {
      console.warn(`[ui-canvas-cad] Erro ao conectar ao BroadcastChannel "${nome}":`, err);
    }
  }

  /**
   * Processa mensagens recebidas pelo barramento global de configuração.
   * Atualiza cursor, opacidades de camadas e emite evento 'ui-config-aplicada'.
   */
  private processarMensagemConfiguracao(data: any): void {
    if (!data || typeof data !== 'object') return;

    const tipo = data.tipo || 'ESTILOS_ALTERADOS';
    const config = data.configuracoes || data;

    // 1. Atualizar estilo de mira/cursor (crosshair vs default)
    if (config.crosshair !== undefined) {
      const isCrosshair = Boolean(config.crosshair);
      if (this.mapContainer) {
        this.mapContainer.style.cursor = isCrosshair ? 'crosshair' : '';
      }
      const map = this.controller.getMap();
      if (map) {
        const c = map.getContainer();
        if (c) c.style.cursor = isCrosshair ? 'crosshair' : '';
      }
      this.controller.core.config.crosshair = isCrosshair;
    }

    // 2. Atualizar opacidade base (ex: satelite)
    if (config.opacidadeBase !== undefined) {
      const op = parseFloat(config.opacidadeBase);
      if (!isNaN(op)) {
        this.setLayerOpacity('satelite', op);
      }
    }
    if (config.satOpacity !== undefined) {
      const op = parseFloat(config.satOpacity);
      if (!isNaN(op)) {
        this.setLayerOpacity('satelite', op);
      }
    }

    // 3. Atualizar opacidades de outras camadas se fornecidas
    if (config.opacidades && typeof config.opacidades === 'object') {
      Object.entries(config.opacidades).forEach(([camadaId, opVal]) => {
        const op = parseFloat(opVal as any);
        if (!isNaN(op)) {
          this.setLayerOpacity(camadaId, op);
        }
      });
    }

    // 4. Disparar evento customizado 'ui-config-aplicada'
    this.dispatchEvent(new CustomEvent('ui-config-aplicada', {
      detail: {
        tipo,
        configuracoes: config
      },
      bubbles: true,
      composed: true
    }));
  }

  /**
   * Executa a invalidação dimensional do mapa com salvaguardas de estabilidade
   * absorvendo tentativas de leitura com panes desanexados (undefined._leaflet_pos).
   */
  public invalidateSizeSafely(): void {
    this.controladorTamanho.invalidateSizeSafely();
  }

  attributeChangedCallback(name: string, oldVal: string, newVal: string) {
    if (oldVal !== newVal) {
      if (name === 'sat-opacity') {
        const op = parseFloat(newVal);
        if (!isNaN(op)) this.setLayerOpacity('satelite', op);
      } else if (name === 'scale-mode') {
        if (newVal === 'world' || newVal === 'screen') {
          this.setLayerScaleMode('perimetro', newVal);
          this.setLayerScaleMode('vertices', newVal);
        }
      } else if (name === 'modo-sequencial') {
        const isAtivo = newVal !== null && newVal !== 'false';
        this.modoSequencial = isAtivo;
      } else if (name === 'chave-grupo') {
        this.chaveGrupo = newVal || undefined;
      } else if (name === 'zona-projecao' || name === 'fuso') {
        const parsed = parseInt(newVal, 10);
        if (!isNaN(parsed) && parsed > 0) {
          this._zonaProjecao = parsed;
          if (name === 'fuso' && this.getAttribute('zona-projecao') !== newVal) {
            this.setAttribute('zona-projecao', newVal);
          } else if (name === 'zona-projecao' && this.hasAttribute('fuso') && this.getAttribute('fuso') !== newVal) {
            this.setAttribute('fuso', newVal);
          }
          this.controller.zonaProjecao = parsed;
          this.controller.context.zonaProjecao = parsed;
        }
      } else if (name === 'canal-configuracao') {
        this.setupConfigBroadcastChannel(newVal);
      } else if (name === 'crosshair') {
        const isCrosshair = newVal !== null && newVal !== 'false';
        if (this.mapContainer) this.mapContainer.style.cursor = isCrosshair ? 'crosshair' : '';
        const map = this.controller.getMap();
        if (map) {
          const c = map.getContainer();
          if (c) c.style.cursor = isCrosshair ? 'crosshair' : '';
        }
        this.controller.core.config.crosshair = isCrosshair;
      }
    }
  }

  private initCAD() {
    if (!this.mapContainer) return;

    // Limpa preventivamente _leaflet_id caso o container tenha sido reciclado pelo SPA
    if ((this.mapContainer as any)._leaflet_id && !this.controller.getMap()) {
      try {
        delete (this.mapContainer as any)._leaflet_id;
      } catch (e) {
        (this.mapContainer as any)._leaflet_id = undefined;
      }
    }

    this.controller.init(this.mapContainer, this.shadow);
    this.setupUIEvents();
    this.renderLayersUI();

    // Sincroniza estado de modo-sequencial se foi definido via atributo inicial
    if (this.hasAttribute('modo-sequencial')) {
      this.controller.modoCliqueSequencialAtivo = true;
      this.controller.context.modoSequencial = true;
    }

    // Sincroniza propriedade chave-grupo se foi definida via atributo inicial
    if (this.hasAttribute('chave-grupo')) {
      const cg = this.getAttribute('chave-grupo');
      if (cg) {
        this.chaveGrupo = cg;
      }
    }

    // Sincroniza zona-projecao se foi definida via atributo inicial
    if (this.hasAttribute('zona-projecao') || this.hasAttribute('fuso')) {
      const z = this.zonaProjecao;
      this.controller.zonaProjecao = z;
      this.controller.context.zonaProjecao = z;
    }

    // Sincroniza crosshair se foi definido via atributo inicial
    if (this.hasAttribute('crosshair')) {
      const isCrosshair = this.getAttribute('crosshair') !== 'false';
      if (this.mapContainer) this.mapContainer.style.cursor = isCrosshair ? 'crosshair' : '';
      this.controller.core.config.crosshair = isCrosshair;
    }

    // Sincroniza dados iniciais se já tiverem sido definidos
    if (this._pontos.length > 0) this.controller.setPontos(this._pontos);
    if (this._segmentos.length > 0) this.controller.setSegmentos(this._segmentos);
    if (this._bancoPontos.length > 0) this.controller.setBancoPontos(this._bancoPontos);
    if (this._confrontantes.length > 0) this.controller.setConfrontantes(this._confrontantes);

    // Escuta mudanças de camadas para re-renderizar a UI do painel
    this.controller.layerManager.onChange((layers) => {
      this.renderLayersUI();
      this.dispatchEvent(new CustomEvent('ui-camadas-alteradas', {
        detail: { layers },
        bubbles: true,
        composed: true
      }));
    });

    // Escuta cliques em marcadores do Leaflet e entidades geométricas
    const prevMarkerClick = this.controller.context.onMarkerClick;
    this.controller.context.onMarkerClick = (
      pId: string | number,
      isVizinho?: boolean,
      elemento?: any,
      coords?: { lat: number; lon: number }
    ) => {
      // Resolve elemento e coordenadas com fallback seguro
      let safeElemento = elemento;
      if (!safeElemento) {
        safeElemento = this._pontos.find(p => String(p.id) === String(pId))
          || this._bancoPontos.find(p => String(p.id) === String(pId))
          || this._confrontantes.find(c => String(c.id) === String(pId));
      }

      let safeCoords = coords;
      if (!safeCoords && safeElemento) {
        const rawLat = safeElemento.lat ?? (safeElemento as any).latitude ?? 0;
        const rawLon = safeElemento.lon ?? safeElemento.lng ?? (safeElemento as any).longitude ?? 0;
        safeCoords = { lat: Number(rawLat), lon: Number(rawLon) };
      }
      if (!safeCoords) {
        safeCoords = { lat: 0, lon: 0 };
      }

      if (this.modoSequencial) {
        // Quando modo-sequencial === true:
        // 1. Suprimir a exibição de popups ou tooltips nativos do elemento
        this.controller.getMap()?.closePopup();

        // 2. Disparar o evento customizado:
        // Nome: ui-clique-sequencial
        // Detail: { id: string | number, elemento: any, coordenadas: { lat: number, lon: number } }
        // Config: bubbles: true, composed: true
        this.dispatchEvent(new CustomEvent('ui-clique-sequencial', {
          detail: {
            id: pId,
            elemento: safeElemento ?? { id: pId, lat: safeCoords.lat, lon: safeCoords.lon },
            coordenadas: safeCoords
          },
          bubbles: true,
          composed: true
        }));

        // Critério de Aceite: O clique em modo sequencial NÃO desseleciona elementos previamente ativos.
        return;
      }

      // Quando modo-sequencial === false:
      // Restaurar o comportamento padrão de abrir popup ou emitir ui-elemento-selecionado e ui-ponto-selecionado
      if (this.customMarkerClickHandler) {
        try {
          this.customMarkerClickHandler(Number(pId), isVizinho);
        } catch (err) {
          console.error('Erro no callback de clique de marcador:', err);
        }
      }
      if (prevMarkerClick) {
        try {
          prevMarkerClick(pId, isVizinho, safeElemento, safeCoords);
        } catch (err) {
          console.error('Erro no handler anterior de marker click:', err);
        }
      }
      this.dispatchEvent(new CustomEvent('ui-ponto-selecionado', {
        detail: { selectedIds: [pId], lastSelectedId: pId, isVizinho },
        bubbles: true,
        composed: true
      }));
      this.dispatchEvent(new CustomEvent('ui-elemento-selecionado', {
        detail: { id: pId, elemento: safeElemento, tipo: isVizinho ? 'vizinho' : 'vertice', coordenadas: safeCoords },
        bubbles: true,
        composed: true
      }));
    };

    // Escuta ações customizadas disparadas nos botões de popup
    this.controller.context.onPopupAcao = (acaoId: string, elementoId: string | number, elemento: any) => {
      this.dispararAcaoPopup(acaoId, elementoId, elemento);
    };

    // Escuta cliques livres no mapa Leaflet
    const map = this.controller.getMap();
    if (map) {
      map.on('click', (e: any) => {
        if (this.mouseMovedSinceDown) return;
        this.tratarCliqueLivreCanvas(e, e.latlng, e.containerPoint);
      });
    }

    // Acomodação dimensional inicial com salvaguarda
    setTimeout(() => {
      this.invalidateSizeSafely();
    }, 150);
  }

  private setupUIEvents() {
    this.uiListeners.cleanup();

    const btnToggleLayers = this.shadow.getElementById('btn-toggle-layers');
    const btnCloseLayers = this.shadow.getElementById('btn-close-layers');
    const btnZoomExtents = this.shadow.getElementById('btn-zoom-extents');
    const btnClearSelection = this.shadow.getElementById('btn-clear-selection');

    this.uiListeners.add(btnToggleLayers, 'click', () => {
      this.toggleLayersPanel();
    });

    this.uiListeners.add(btnCloseLayers, 'click', () => {
      this.closeLayersPanel();
    });

    this.uiListeners.add(btnZoomExtents, 'click', () => {
      this.zoomExtents();
    });

    this.uiListeners.add(btnClearSelection, 'click', () => {
      this.limparSelecao();
    });

    // Monitora mousedown/mousemove no mapContainer para filtrar arraste/pan vs clique
    if (this.mapContainer) {
      this.uiListeners.add(this.mapContainer, 'mousedown', (e: MouseEvent) => {
        if (e.button === 0) {
          this.mouseDownPos = { x: e.clientX, y: e.clientY };
          this.mouseMovedSinceDown = false;
        }
      });

      this.uiListeners.add(this.mapContainer, 'mousemove', (e: MouseEvent) => {
        if (Math.hypot(e.clientX - this.mouseDownPos.x, e.clientY - this.mouseDownPos.y) >= 4) {
          this.mouseMovedSinceDown = true;
        }
      });

      this.uiListeners.add(this.mapContainer, 'click', (e: MouseEvent) => {
        if (e.button !== 0) return;
        if (this.mouseMovedSinceDown) return;
        this.tratarCliqueLivreCanvas(e);
      });
    }

    // Intercepta cliques delegados nos botões de ação do popup
    this.uiListeners.add(this.shadow, 'click', (evt: Event) => {
      const target = (evt.composedPath ? evt.composedPath()[0] : evt.target) as HTMLElement | null;
      const btn = target?.closest?.('.ui-popup-btn') as HTMLElement | null;
      if (btn) {
        evt.preventDefault();
        evt.stopPropagation();
        const acaoId = btn.getAttribute('data-acao-id');
        const elementoId = btn.getAttribute('data-elemento-id');
        if (acaoId && elementoId !== null) {
          this.dispararAcaoPopup(acaoId, elementoId);
        }
      }
    });
  }

  /**
   * Monitora e processa cliques em áreas livres do mapa para emissão do evento 'ui-canvas-clique'.
   * Assegura que o evento não dispare indevidamente durante operações de arraste ou janelas de seleção CAD.
   */
  public tratarCliqueLivreCanvas(
    e: MouseEvent | any,
    latLngParam?: { lat: number; lng?: number; lon?: number },
    containerPointParam?: { x: number; y: number }
  ): void {
    const agora = Date.now();
    if (agora - this.lastCanvasClickTime < 50) return;
    this.lastCanvasClickTime = agora;

    processarCliqueLivreCanvas(
      {
        host: this,
        controller: this.controller,
        mapContainer: this.mapContainer,
        modoSequencial: this.modoSequencial,
        mouseMovedSinceDown: this.mouseMovedSinceDown,
        obterElementoPorId: (id) => this.obterElementoPorId(id),
        fecharPopup: () => { this.controller.getMap()?.closePopup(); }
      },
      e,
      latLngParam,
      containerPointParam
    );
  }

  /**
   * Dispara o evento customizado 'ui-acao-popup' com as informações da ação acionada e fecha o popup.
   */
  public dispararAcaoPopup(acaoId: string, elementoId: string | number, elemento?: any): void {
    const now = Date.now();
    if (
      this.lastPopupActionEmit &&
      this.lastPopupActionEmit.acaoId === acaoId &&
      this.lastPopupActionEmit.elementoId === elementoId &&
      now - this.lastPopupActionEmit.time < 50
    ) {
      return;
    }
    this.lastPopupActionEmit = { acaoId, elementoId, time: now };

    processarAcaoPopup(
      {
        host: this,
        controller: this.controller,
        mapContainer: this.mapContainer,
        modoSequencial: this.modoSequencial,
        mouseMovedSinceDown: this.mouseMovedSinceDown,
        obterElementoPorId: (id) => this.obterElementoPorId(id),
        fecharPopup: () => { this.controller.getMap()?.closePopup(); }
      },
      acaoId,
      elementoId,
      elemento
    );
  }

  private obterElementoPorId(id: string | number): any {
    return this._pontos.find(p => String(p.id) === String(id))
      || this._bancoPontos.find(p => String(p.id) === String(id))
      || this._confrontantes.find(c => String(c.id) === String(id));
  }

  public toggleLayersPanel() {
    this.isLayersPanelOpen = !this.isLayersPanelOpen;
    if (this.layersPanel) {
      if (this.isLayersPanelOpen) {
        this.layersPanel.classList.remove('collapsed');
      } else {
        this.layersPanel.classList.add('collapsed');
      }
    }
    const btn = this.shadow.getElementById('btn-toggle-layers');
    btn?.classList.toggle('active', this.isLayersPanelOpen);
  }

  public closeLayersPanel() {
    this.isLayersPanelOpen = false;
    this.layersPanel?.classList.add('collapsed');
    const btn = this.shadow.getElementById('btn-toggle-layers');
    btn?.classList.remove('active');
  }

  private renderLayersUI() {
    const container = this.shadow.getElementById('layers-list-container');
    const layers = this.controller.layerManager.getLayers();
    renderizarPainelCamadas(container, layers, this.layerItemListeners, {
      setLayerVisibility: (id, visivel) => this.setLayerVisibility(id, visivel),
      setLayerOpacity: (id, opacidade) => this.setLayerOpacity(id, opacidade),
      setLayerBlocked: (id, bloqueada) => this.controller.layerManager.setLayerBlocked(id, bloqueada),
      setLayerScaleMode: (id, mode) => this.setLayerScaleMode(id, mode)
    });
  }

  // --- API de Propriedades Públicas ---

  public get pontos(): Ponto[] {
    return this._pontos;
  }

  public set pontos(val: Ponto[]) {
    this._pontos = val || [];
    this.controller.setPontos(this._pontos);
  }

  public get segmentos(): Segmento[] {
    return this._segmentos;
  }

  public set segmentos(val: Segmento[]) {
    this._segmentos = val || [];
    this.controller.setSegmentos(this._segmentos);
  }

  public get bancoPontos(): BancoPonto[] {
    return this._bancoPontos;
  }

  public set bancoPontos(val: BancoPonto[]) {
    this._bancoPontos = val || [];
    this.controller.setBancoPontos(this._bancoPontos);
  }

  public get pontosHomologados(): BancoPonto[] {
    return this.bancoPontos;
  }

  public set pontosHomologados(val: BancoPonto[]) {
    this.bancoPontos = val;
  }

  public get confrontantes(): Confrontante[] {
    return this._confrontantes;
  }

  public set confrontantes(val: Confrontante[]) {
    this._confrontantes = val || [];
    this.controller.setConfrontantes(this._confrontantes);
  }

  public get vizinhos(): Confrontante[] {
    return this.confrontantes;
  }

  public set vizinhos(val: Confrontante[]) {
    this.confrontantes = val;
  }

  /**
   * Alterna o modo de captura sequencial ponto a ponto (reflte atributo 'modo-sequencial').
   * Quando true, cliques em elementos geométricos suprimem popups e disparam 'ui-clique-sequencial'.
   * Não desseleciona elementos previamente ativos.
   */
  public get modoSequencial(): boolean {
    return this.hasAttribute('modo-sequencial');
  }

  public set modoSequencial(val: boolean) {
    const isTruthy = Boolean(val);
    const hasAttr = this.hasAttribute('modo-sequencial');
    if (isTruthy) {
      if (!hasAttr) this.setAttribute('modo-sequencial', '');
    } else {
      if (hasAttr) this.removeAttribute('modo-sequencial');
    }
    this.controller.modoCliqueSequencialAtivo = isTruthy;
    this.controller.context.modoSequencial = isTruthy;
    if (isTruthy) {
      this.controller.getMap()?.closePopup();
    }
  }

  /**
   * Propriedade de chave de agrupamento genérica para polilinhas e multi-geometrias.
   * Pontos de grupos distintos nunca compartilham uma aresta a menos que exista uma conexão explícita entre seus IDs.
   */
  public get chaveGrupo(): string | undefined {
    return this.getAttribute('chave-grupo') || this._chaveGrupo;
  }

  public set chaveGrupo(val: string | undefined) {
    this._chaveGrupo = val;
    if (val) {
      if (this.getAttribute('chave-grupo') !== val) {
        this.setAttribute('chave-grupo', val);
      }
    } else {
      if (this.hasAttribute('chave-grupo')) {
        this.removeAttribute('chave-grupo');
      }
    }
    this.controller.chaveGrupo = val;
    this.controller.context.chaveGrupo = val;
    this.controller.layerManager.updateContext({ chaveGrupo: val });
  }

  /**
   * Zona ou fuso de projeção cartográfica ativa (padrão: 22).
   * Validado estritamente para números inteiros positivos (> 0).
   * Sincronizado bidirecionalmente com os atributos 'zona-projecao' e 'fuso'.
   */
  public get zonaProjecao(): number {
    return this._zonaProjecao ?? 22;
  }

  public set zonaProjecao(val: number) {
    const parsed = typeof val === 'number' ? Math.floor(val) : parseInt(String(val), 10);
    if (!isNaN(parsed) && parsed > 0) {
      this._zonaProjecao = parsed;
      const strVal = String(parsed);
      if (this.getAttribute('zona-projecao') !== strVal) {
        this.setAttribute('zona-projecao', strVal);
      }
      if (this.hasAttribute('fuso') && this.getAttribute('fuso') !== strVal) {
        this.setAttribute('fuso', strVal);
      }
      this.controller.zonaProjecao = parsed;
      this.controller.context.zonaProjecao = parsed;
    }
  }

  /**
   * Nome do canal de BroadcastChannel desacoplado para barramento global de configuração em tempo real.
   * 100% configurável via atributo 'canal-configuracao' sem strings mágicas hardcoded.
   */
  public get canalConfiguracao(): string | null {
    return this.getAttribute('canal-configuracao');
  }

  public set canalConfiguracao(val: string | null) {
    if (val) {
      this.setAttribute('canal-configuracao', val);
    } else {
      this.removeAttribute('canal-configuracao');
    }
  }

  // --- Métodos Públicos ---

  public fitBounds(pontos?: Ponto[], padding: [number, number] = [40, 40], incluirVizinhos: boolean = false): void {
    this.controller.fitBounds(pontos, padding, incluirVizinhos);
  }

  public zoomExtents(): void {
    this.controller.canvasInteracao.zoomExtents();
  }

  public selectPonto(id: number, zoomLevel?: number): void {
    this.controller.selectPonto(id, zoomLevel);
  }

  public limparSelecao(): void {
    this.controller.canvasInteracao.limparSelecao();
  }

  public setLayerVisibility(id: string, visivel: boolean): void {
    this.controller.layerManager.setLayerVisibility(id, visivel);
  }

  public setLayerOpacity(id: string, opacidade: number): void {
    this.controller.layerManager.setLayerOpacity(id, opacidade);
  }

  public setLayerScaleMode(id: string, mode: ScaleMode): void {
    this.controller.layerManager.setLayerScaleMode(id, mode);
  }

  public setGraphicScale(scale: Partial<CanvasGraphicScale>): void {
    this.controller.setGraphicScale(scale);
  }

  public exportState(): CanvasLayerState[] {
    return this.controller.exportState();
  }

  public importState(state: CanvasLayerState[]): void {
    this.controller.importState(state);
  }

  public invalidateSize(): void {
    this.invalidateSizeSafely();
  }

  /**
   * Indica se há algum anel de destaque pulsante ativo no canvas.
   */
  public get destaqueAtivo(): boolean {
    return this.controller.destaqueAtivo;
  }

  /**
   * Localiza, enquadra e pulsa visualmente qualquer elemento geométrico do canvas pelo identificador (ID).
   * Agnóstico a entidades pontuais, lineares e poligonais.
   * Não interfere no estado dos marcadores originais e limpa instâncias anteriores.
   *
   * @param id Identificador do elemento (número ou string)
   * @param opcoes Configurações opcionais de pan suave, nível de zoom, duracaoMs e cor do pulso
   */
  public destacarElemento(
    id: string | number,
    opcoes?: DestacarElementoOpcoes
  ): void {
    if (!this.controller.getMap() && this.mapContainer) {
      this.initCAD();
    }
    this.controller.destacarElemento(id, opcoes);
  }

  /**
   * Remove o anel de destaque pulsante ativo e limpa quaisquer temporizadores pendentes.
   */
  public limparDestaque(): void {
    this.controller.limparDestaque();
  }

  // --- Fachada Agnóstica de Entidades Vetoriais e Camadas (API Pública) ---

  /**
   * Ingestão de nós pontuais na camada indicada (padrão: 'vertices').
   */
  public plotarPontos(
    pontos?: PontoCAD[] | null,
    camadaId: string = 'vertices',
    onClique?: (ponto: PontoCAD) => void
  ): void {
    const safePontos = pontos || [];
    if (camadaId === 'vertices') {
      this._pontos = safePontos as any[];
    }
    this.controller.plotarPontos(safePontos, camadaId, onClique);
  }

  /**
   * Plota linhas vinculando pares de IDs.
   */
  public plotarConexoes(
    conexoes?: ConexaoCAD[] | null,
    camadaId: string = 'linhas'
  ): void {
    const safeConexoes = conexoes || [];
    this.controller.plotarConexoes(safeConexoes, camadaId);
  }

  public plotarPolilinhaSequencial(
    pontos?: PontoCAD[] | null,
    fechar: boolean = true,
    camadaId: string = 'polilinha',
    chaveGrupo?: string
  ): void {
    const safePontos = pontos || [];
    if (camadaId === 'polilinha' || camadaId === 'perimetro') {
      this._pontos = safePontos as any[];
      this._segmentos = [];
    }
    const resolvedChave = chaveGrupo ?? this.chaveGrupo;
    this.controller.plotarPolilinhaSequencial(safePontos, fechar, camadaId, resolvedChave);
  }

  /**
   * Plota áreas a partir de anéis de coordenadas ou strings WKT.
   */
  public plotarPoligonos(
    poligonos?: PoligonoCAD[] | null,
    camadaId: string = 'poligonos'
  ): void {
    const safePoligonos = poligonos || [];
    this.controller.plotarPoligonos(safePoligonos, camadaId);
  }

  /**
   * Remove entidades das camadas especificadas ou de todas as camadas vetoriais se omitido.
   */
  public limparCamadas(idsCamadas?: string[]): void {
    if (!idsCamadas || idsCamadas.length === 0) {
      this._pontos = [];
      this._segmentos = [];
      this._confrontantes = [];
    } else {
      if (idsCamadas.includes('vertices')) this._pontos = [];
      if (idsCamadas.includes('linhas') || idsCamadas.includes('perimetro') || idsCamadas.includes('polilinha')) this._segmentos = [];
      if (idsCamadas.includes('poligonos') || idsCamadas.includes('vizinhos')) this._confrontantes = [];
    }
    this.controller.limparCamadas(idsCamadas);
  }

  /**
   * Retorna as instâncias gráficas ativas no canvas (de uma camada específica ou de todas).
   */
  public obterMarcadores(camadaId?: string): L.Marker[] {
    return this.controller.obterMarcadores(camadaId);
  }

  // --- Fachada de Compatibilidade Legada ---

  /**
   * Recebe a lista de vértices e atualiza a camada de pontos do layerManager.
   * Se receber um callback de clique, associa-o ao evento interno.
   */
  public plotPontos(
    pontos?: Ponto[] | null,
    onMarkerClick?: (pontoId: number, isVizinho?: boolean) => void
  ): void {
    if (onMarkerClick) {
      this.customMarkerClickHandler = onMarkerClick;
    }
    const safePontos = pontos || [];
    this._pontos = safePontos;
    this.controller.plotPontos(safePontos, onMarkerClick);
  }

  /**
   * Recebe as divisas cadastradas e delega a renderização para a camada vetorial de linhas.
   */
  public plotSegmentos(
    segmentos?: Segmento[] | null,
    pontos?: Ponto[] | null
  ): void {
    const safeSegmentos = segmentos || [];
    if (pontos !== undefined && pontos !== null) {
      this._pontos = pontos || [];
    }
    this._segmentos = safeSegmentos;
    this.controller.plotSegmentos(safeSegmentos, pontos);
  }

  /**
   * Define os pontos e limpa os segmentos para forçar o fechamento automático da poligonal pelo caminhamento (Pn -> P1).
   */
  public plotPolilinhaTemporaria(pontos?: Ponto[] | null): void {
    const safePontos = pontos || [];
    this._pontos = safePontos;
    this._segmentos = [];
    this.controller.plotPolilinhaTemporaria(safePontos);
  }

  /**
   * Alimenta a camada de vértices homologados do SIGEF.
   */
  public plotPoligonalHomologada(bancoPontos?: BancoPonto[] | null): void {
    const safeBanco = bancoPontos || [];
    this._bancoPontos = safeBanco;
    this.controller.plotPoligonalHomologada(safeBanco);
    this.setLayerVisibility('homologados', true);
    this.setLayerVisibility('homologados-pontos', true);
  }

  /**
   * Alimenta a camada de vértices confrontantes.
   */
  public plotPontosVizinhos(pontos?: Ponto[] | null): void {
    const safePontos = pontos || [];
    this.controller.plotPontosVizinhos(safePontos);
    this._confrontantes = this.controller.context.confrontantes || [];
  }

  /**
   * Alimenta a camada de limites em polígonos WKT.
   */
  public plotPoligonosVizinhos(confrontantes?: Confrontante[] | null): void {
    const safeConfrontantes = confrontantes || [];
    this.controller.plotPoligonosVizinhos(safeConfrontantes);
    this._confrontantes = this.controller.context.confrontantes || [];
  }

  /**
   * Reseta as camadas vetoriais de trabalho, permitindo preservar opcionalmente o banco de pontos homologados.
   */
  public clearOverlays(manterBanco: boolean = false): void {
    this._pontos = [];
    this._segmentos = [];
    this._confrontantes = [];
    if (!manterBanco) {
      this._bancoPontos = [];
    }
    this.controller.clearOverlays(manterBanco);
  }

  /**
   * Devolve o array de marcadores instanciados no Leaflet.
   */
  public getMarkers(): L.Marker[] {
    return this.controller.getMarkers();
  }

  /**
   * Devolve o array de marcadores vizinhos/confrontantes instanciados no Leaflet.
   */
  public getVizinhosMarkers(): L.Marker[] {
    return this.controller.getVizinhosMarkers();
  }

  public getMap(): L.Map | null {
    return this.controller.getMap();
  }

  public getController(): GerenciGeoMapaController {
    return this.controller;
  }

  public getLayerManager(): CanvasLayerManager {
    return this.controller.layerManager;
  }
}

if (!customElements.get('ui-canvas-cad')) {
  customElements.define('ui-canvas-cad', UICanvasCAD);
}
