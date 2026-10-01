import L from 'leaflet';
import { MapaConfigManager } from './mapa_config';
import type { MapaConfiguracoes } from './types';
import { consultarSigefNoPonto, SigefConsultorState } from './sigef_consultor';
import { preCarregarTilesRegiao } from './tile_preloader';

export interface MapaCoreControllerRef {
  modoCliqueSequencialAtivo?: boolean;
  canvasInteracao?: { selectionHappened?: boolean };
  layerManager?: any;
}

export class MapaCore {
  public map: L.Map | null = null;
  public configManager = MapaConfigManager.getInstance();
  public config: MapaConfiguracoes = this.configManager.getConfig();
  public apiBaseUrl: string = '/api';
  public bancoPontosGroup: L.LayerGroup = L.layerGroup();
  public pontosVizinhosGroup: L.LayerGroup = L.layerGroup();
  private controller: MapaCoreControllerRef;
  private containerElement: HTMLElement | null = null;
  private bc?: BroadcastChannel;
  private sigefState: SigefConsultorState = {};

  constructor(controller: MapaCoreControllerRef) {
    this.controller = controller;
  }

  public init(containerIdOrElement: string | HTMLElement): L.Map | null {
    if (this.map) {
      try {
        this.map.off();
        this.map.remove();
      } catch {
        // Silencia exceções caso o container já tenha sido reciclado ou desanexado pelo SPA
      } finally {
        this.map = null;
      }
    }

    const container = typeof containerIdOrElement === 'string'
      ? document.getElementById(containerIdOrElement)
      : containerIdOrElement;

    if (!container) return null;
    this.containerElement = container;

    // Limpa preventivamente a propriedade do Leaflet caso o container tenha sido reaproveitado
    if ((container as any)._leaflet_id) {
      try {
        delete (container as any)._leaflet_id;
      } catch {
        (container as any)._leaflet_id = undefined;
      }
    }

    this.map = L.map(container, {
      maxZoom: 24,
      scrollWheelZoom: true,
      preferCanvas: this.config.preferCanvas !== undefined ? this.config.preferCanvas : true,
      zoomControl: false
    }).setView([-23.7661, -53.3204], 14);

    this.listenConfigBroadcast();
    this.applyMapStyles();

    // Criação dos panes cartográficos padronizados
    if (!this.map.getPane('sigefPane')) {
      const p = this.map.createPane('sigefPane');
      p.style.zIndex = '390';
    }
    if (!this.map.getPane('perimetroPane')) {
      const p = this.map.createPane('perimetroPane');
      p.style.zIndex = '450';
    }
    if (!this.map.getPane('verticesPane')) {
      const p = this.map.createPane('verticesPane');
      p.style.zIndex = '650';
    }

    L.control.scale({
      metric: true,
      imperial: false,
      position: 'bottomleft'
    }).addTo(this.map);

    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.controller.modoCliqueSequencialAtivo) return;
      if (this.controller.canvasInteracao && this.controller.canvasInteracao.selectionHappened) return;

      const isSigefActive = this.controller.layerManager 
        ? this.controller.layerManager.isLayerActiveAndSelectable('sigef')
        : false;

      if (isSigefActive) {
        this.consultarSigef(e);
      }
    });

    setTimeout(() => {
      this.invalidateSize();
    }, 250);

    return this.map;
  }

  public invalidateSize(animate: boolean = false): void {
    if (!this.map) return;
    try {
      const container = this.map.getContainer?.();
      if (!container || !container.parentNode) return;
      this.map.invalidateSize({ animate, pan: false });
    } catch {}
  }

  private applyMapStyles() {
    const container = this.containerElement || document.getElementById('mapa-triagem');
    if (container) {
      container.style.cursor = this.config.crosshair ? 'crosshair' : '';
    }
  }

  private listenConfigBroadcast() {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      this.bc = new BroadcastChannel('gerencigeo_map_config');
      this.bc.onmessage = (event) => {
        if (event.data === 'RELOAD_REQUIRED') {
          this.config = this.configManager.getConfig();
          this.applyMapStyles();
          window.dispatchEvent(new CustomEvent('gerencigeo:map_config_changed', { detail: this.config }));
        }
      };
    } catch {}
  }

  public destroy(): void {
    if (this.sigefState.currentAbortController) {
      this.sigefState.currentAbortController.abort();
      this.sigefState.currentAbortController = undefined;
    }
    if (this.bc) {
      try {
        this.bc.close();
      } catch {}
      this.bc = undefined;
    }

    if (this.map) {
      try {
        this.map.off();
        this.map.remove();
      } catch {
      } finally {
        this.map = null;
      }
    }

    if (this.containerElement && (this.containerElement as any)._leaflet_id) {
      try {
        delete (this.containerElement as any)._leaflet_id;
      } catch {
        (this.containerElement as any)._leaflet_id = undefined;
      }
    }
  }

  public preCarregarTilesRegiao(bounds: L.LatLngBounds): void {
    preCarregarTilesRegiao(this.map, bounds);
  }

  private async consultarSigef(e: L.LeafletMouseEvent): Promise<void> {
    if (!this.map) return;
    await consultarSigefNoPonto(this.map, e, this.apiBaseUrl, this.sigefState);
  }
}
