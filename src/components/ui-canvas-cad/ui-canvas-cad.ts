import { leafletCss } from '../../core/leaflet-style';
import estilos from './ui-canvas-cad.css?inline';
import type { Ponto, Segmento, BancoPonto, Confrontante, CanvasLayerState, CanvasGraphicScale, ScaleMode } from '../../gerencigeo-canvas/types';
import { GerenciGeoMapaController } from '../../gerencigeo-canvas/mapa_controller';
import type { CanvasLayerManager } from '../../gerencigeo-canvas/layer_manager';
import { ListenerBag } from '../../core/listener-bag';

export class UICanvasCAD extends HTMLElement {
  static get observedAttributes() {
    return ['sat-opacity', 'scale-mode', 'crosshair'];
  }

  private shadow: ShadowRoot;
  private mapContainer: HTMLDivElement | null = null;
  private layersPanel: HTMLDivElement | null = null;
  private controller: GerenciGeoMapaController;
  private isLayersPanelOpen: boolean = false;
  private initTimeout?: number;
  private uiListeners = new ListenerBag();
  private layerItemListeners = new ListenerBag();

  private _pontos: Ponto[] = [];
  private _segmentos: Segmento[] = [];
  private _bancoPontos: BancoPonto[] = [];
  private _confrontantes: Confrontante[] = [];

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: 'open' });
    this.controller = new GerenciGeoMapaController();

    this.shadow.innerHTML = `
      <style>
        ${leafletCss}
        ${estilos}
      </style>
      <div class="cad-root" id="cad-root">
        <!-- Mapa Leaflet Canvas -->
        <div class="cad-map-container" id="cad-map-container"></div>

        <!-- Painel de Camadas estilo QGIS -->
        <div class="qgis-layer-panel collapsed" id="qgis-layer-panel">
          <div class="layer-panel-header">
            <div class="layer-panel-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
              Camadas (QGIS)
            </div>
            <button class="layer-panel-close" id="btn-close-layers" type="button" title="Fechar Painel">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="layer-panel-body" id="layers-list-container">
            <!-- Camadas renderizadas dinamicamente -->
          </div>
        </div>

        <!-- Toolbar Rápida do Canvas -->
        <div class="cad-quick-toolbar">
          <button class="cad-btn-tool" id="btn-toggle-layers" type="button" title="Gerenciador de Camadas (QGIS)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
          </button>
          <button class="cad-btn-tool" id="btn-zoom-extents" type="button" title="Enquadrar Levantamento (Zoom Extents)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>
          </button>
          <button class="cad-btn-tool" id="btn-clear-selection" type="button" title="Limpar Seleção (ESC)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="3 3"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
          </button>
        </div>
      </div>
    `;

    this.mapContainer = this.shadow.getElementById('cad-map-container') as HTMLDivElement;
    this.layersPanel = this.shadow.getElementById('qgis-layer-panel') as HTMLDivElement;
  }

  private resizeObserver?: ResizeObserver;
  private resizeDebounceTimer?: any;

  connectedCallback() {
    this.initTimeout = window.setTimeout(() => {
      this.initCAD();
    }, 0);
  }

  disconnectedCallback() {
    if (this.initTimeout) {
      window.clearTimeout(this.initTimeout);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = undefined;
    }
    if (this.resizeDebounceTimer) {
      clearTimeout(this.resizeDebounceTimer);
      this.resizeDebounceTimer = undefined;
    }
    this.uiListeners.cleanup();
    this.layerItemListeners.cleanup();
    this.controller.destroy();
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
      }
    }
  }

  private initCAD() {
    if (!this.mapContainer) return;

    this.controller.init(this.mapContainer, this.shadow);
    this.setupUIEvents();
    this.renderLayersUI();

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

    // Escuta cliques em marcadores do Leaflet
    this.controller.context.onMarkerClick = (pId: number, isVizinho?: boolean) => {
      this.dispatchEvent(new CustomEvent('ui-ponto-selecionado', {
        detail: { selectedIds: [pId], lastSelectedId: pId, isVizinho },
        bubbles: true,
        composed: true
      }));
    };

    // Monitora redimensionamento automático de contêineres e janelas
    if (typeof ResizeObserver !== 'undefined' && this.mapContainer) {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.resizeDebounceTimer) clearTimeout(this.resizeDebounceTimer);
        this.resizeDebounceTimer = setTimeout(() => {
          this.controller.invalidateSize();
        }, 60);
      });
      this.resizeObserver.observe(this.mapContainer);
    }

    setTimeout(() => {
      this.controller.invalidateSize();
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
    if (!container) return;

    const layers = this.controller.layerManager.getLayers();

    // Se já existem itens renderizados para as mesmas camadas, apenas sincroniza os valores
    const existingItems = container.querySelectorAll('.layer-item');
    if (existingItems.length === layers.length) {
      layers.forEach(layer => {
        const item = container.querySelector(`.layer-item[data-layer-id="${layer.id}"]`);
        if (item) {
          const chk = item.querySelector('.layer-chk-visibility') as HTMLInputElement | null;
          if (chk && chk.checked !== layer.visivel) chk.checked = layer.visivel;

          const slider = item.querySelector('.layer-opacity-slider') as HTMLInputElement | null;
          const percentLabel = item.querySelector('.opacity-percent-label') as HTMLSpanElement | null;
          const currentPct = Math.round(layer.opacidade * 100);
          if (slider && parseInt(slider.value, 10) !== currentPct) slider.value = String(currentPct);
          if (percentLabel) percentLabel.textContent = `${currentPct}%`;

          const lockBtn = item.querySelector('.btn-lock-layer') as HTMLButtonElement | null;
          if (lockBtn) {
            lockBtn.classList.toggle('active', !!layer.bloqueada);
            lockBtn.title = layer.bloqueada ? 'Desbloquear Camada' : 'Bloquear Camada';
          }

          const scalePill = item.querySelector('.btn-toggle-scale-mode') as HTMLSpanElement | null;
          if (scalePill && layer.estilo.scaleMode) {
            scalePill.textContent = layer.estilo.scaleMode === 'world' ? 'Métrico (m)' : 'Tela (px)';
          }
        }
      });
      return;
    }

    container.innerHTML = `
      <div class="layer-section-title">Camadas Ativas</div>
      ${layers.map(layer => `
        <div class="layer-item" data-layer-id="${layer.id}">
          <div class="layer-item-row">
            <label class="layer-item-label">
              <input type="checkbox" class="layer-chk-visibility" data-layer-id="${layer.id}" ${layer.visivel ? 'checked' : ''} />
              <span>${layer.nome}</span>
            </label>
            <div class="layer-item-actions">
              <button class="btn-layer-action btn-lock-layer ${layer.bloqueada ? 'active' : ''}" data-layer-id="${layer.id}" type="button" title="${layer.bloqueada ? 'Desbloquear Camada' : 'Bloquear Camada'}">
                ${layer.bloqueada 
                  ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`
                  : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`}
              </button>
              ${layer.estilo.scaleMode ? `
                <span class="scale-mode-pill btn-toggle-scale-mode" data-layer-id="${layer.id}" title="Alternar Tela (px) / Métrico (m)">
                  ${layer.estilo.scaleMode === 'world' ? 'Métrico (m)' : 'Tela (px)'}
                </span>
              ` : ''}
            </div>
          </div>
          <div class="layer-controls-row">
            <span>Opacidade</span>
            <input type="range" min="0" max="100" value="${Math.round(layer.opacidade * 100)}" class="layer-opacity-slider" data-layer-id="${layer.id}" />
            <span class="opacity-percent-label" style="font-family:monospace; font-size:9px; width:28px; text-align:right;">${Math.round(layer.opacidade * 100)}%</span>
          </div>
        </div>
      `).join('')}
    `;

    this.layerItemListeners.cleanup();

    // Eventos de checkboxes de visibilidade
    container.querySelectorAll('.layer-chk-visibility').forEach(chk => {
      this.layerItemListeners.add(chk, 'change', (e: Event) => {
        const id = (e.target as HTMLElement).getAttribute('data-layer-id');
        const checked = (e.target as HTMLInputElement).checked;
        if (id) this.setLayerVisibility(id, checked);
      });
    });

    // Eventos de slider de opacidade em tempo real
    container.querySelectorAll('.layer-opacity-slider').forEach(slider => {
      this.layerItemListeners.add(slider, 'input', (e: Event) => {
        const id = (e.target as HTMLElement).getAttribute('data-layer-id');
        const pct = parseInt((e.target as HTMLInputElement).value, 10);
        const val = pct / 100;
        const row = (e.target as HTMLElement).closest('.layer-item');
        const label = row?.querySelector('.opacity-percent-label');
        if (label) label.textContent = `${pct}%`;
        if (id) this.setLayerOpacity(id, val);
      });
    });

    // Eventos de bloqueio de camada
    container.querySelectorAll('.btn-lock-layer').forEach(btn => {
      this.layerItemListeners.add(btn, 'click', (e: Event) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-layer-id');
        if (id) {
          const l = this.controller.layerManager.getLayers().find(item => item.id === id);
          if (l) this.controller.layerManager.setLayerBlocked(id, !l.bloqueada);
        }
      });
    });

    // Eventos de alternância de modo de escala
    container.querySelectorAll('.btn-toggle-scale-mode').forEach(pill => {
      this.layerItemListeners.add(pill, 'click', (e: Event) => {
        const id = (e.currentTarget as HTMLElement).getAttribute('data-layer-id');
        if (id) {
          const l = this.controller.layerManager.getLayers().find(item => item.id === id);
          if (l) {
            const nextMode = l.estilo.scaleMode === 'world' ? 'screen' : 'world';
            this.setLayerScaleMode(id, nextMode);
          }
        }
      });
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
    this.controller.invalidateSize();
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
