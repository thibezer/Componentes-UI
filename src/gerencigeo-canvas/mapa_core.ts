import L from 'leaflet';
import { MapaConfigManager } from './mapa_config';
import type { MapaConfiguracoes } from './types';
import { escapeHtml } from './utils';

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

  constructor(controller: MapaCoreControllerRef) {
    this.controller = controller;
  }

  public init(containerIdOrElement: string | HTMLElement): L.Map | null {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    const container = typeof containerIdOrElement === 'string'
      ? document.getElementById(containerIdOrElement)
      : containerIdOrElement;

    if (!container) return null;
    this.containerElement = container;

    // Instância Leaflet com preferCanvas e aceleração de renderização
    this.map = L.map(container, {
      maxZoom: 24,
      scrollWheelZoom: true,
      preferCanvas: this.config.preferCanvas !== undefined ? this.config.preferCanvas : true,
      zoomControl: false // O controle de zoom é gerenciado pelo CAD ou scroll
    }).setView([-23.7661, -53.3204], 14);

    this.listenConfigBroadcast();
    this.applyMapStyles();

    // 1. Controle de Escala Métrica
    L.control.scale({
      metric: true,
      imperial: false,
      position: 'bottomleft'
    }).addTo(this.map);

    // 2. Consulta SIGEF ao clicar no mapa
    this.map.on('click', (e: L.LeafletMouseEvent) => {
      if (this.controller.modoCliqueSequencialAtivo) {
        return;
      }

      if (this.controller.canvasInteracao && this.controller.canvasInteracao.selectionHappened) {
        this.controller.canvasInteracao.selectionHappened = false;
        return;
      }

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

  public invalidateSize(): void {
    if (this.map) {
      try {
        this.map.invalidateSize();
      } catch {
        // Ignora erros caso o container DOM tenha sido desmontado
      }
    }
  }

  private applyMapStyles() {
    const container = this.containerElement || document.getElementById('mapa-triagem');
    if (container) {
      if (this.config.crosshair) {
        container.style.cursor = 'crosshair';
      } else {
        container.style.cursor = '';
      }
    }
  }

  private listenConfigBroadcast() {
    if (typeof BroadcastChannel === 'undefined') return;
    try {
      const bc = new BroadcastChannel('gerencigeo_map_config');
      bc.onmessage = (event) => {
        if (event.data === 'RELOAD_REQUIRED') {
          this.config = this.configManager.getConfig();
          this.applyMapStyles();
          window.dispatchEvent(new CustomEvent('gerencigeo:map_config_changed', { detail: this.config }));
        }
      };
    } catch {
      // Ignora indisponibilidade do BroadcastChannel
    }
  }

  public preCarregarTilesRegiao(bounds: L.LatLngBounds): void {
    if (!this.map) return;

    const currentZoom = this.map.getZoom();
    const minZoom = Math.max(Math.floor(currentZoom) - 2, 10);
    const maxZoom = Math.min(Math.floor(currentZoom) + 3, 20);

    const expandedBounds = bounds.pad(0.5);
    const subdomains = ['mt0', 'mt1', 'mt2', 'mt3'];
    let tileCount = 0;
    const MAX_TILES = 300;

    for (let z = minZoom; z <= maxZoom && tileCount < MAX_TILES; z++) {
      const nw = expandedBounds.getNorthWest();
      const se = expandedBounds.getSouthEast();

      const tileMinX = this.lonToTileX(nw.lng, z);
      const tileMaxX = this.lonToTileX(se.lng, z);
      const tileMinY = this.latToTileY(nw.lat, z);
      const tileMaxY = this.latToTileY(se.lat, z);

      for (let x = tileMinX; x <= tileMaxX && tileCount < MAX_TILES; x++) {
        for (let y = tileMinY; y <= tileMaxY && tileCount < MAX_TILES; y++) {
          const subdomain = subdomains[(x + y) % subdomains.length];
          const url = `https://${subdomain}.google.com/vt/lyrs=s,h&x=${x}&y=${y}&z=${z}`;

          const img = new Image();
          img.src = url;
          tileCount++;
        }
      }
    }
  }

  private lonToTileX(lon: number, zoom: number): number {
    return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
  }

  private latToTileY(lat: number, zoom: number): number {
    const latRad = (lat * Math.PI) / 180;
    return Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
        Math.pow(2, zoom)
    );
  }

  private async consultarSigef(e: L.LeafletMouseEvent): Promise<void> {
    if (!this.map) return;

    const size = this.map.getSize();
    const bounds = this.map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();

    const bbox = `${sw.lng},${sw.lat},${ne.lng},${ne.lat}`;
    const x = Math.round(this.map.layerPointToContainerPoint(e.layerPoint).x);
    const y = Math.round(this.map.layerPointToContainerPoint(e.layerPoint).y);

    const targetUrl = `https://acervofundiario.incra.gov.br/i3geo/ogc.php?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&FORMAT=image/png&TRANSPARENT=true&QUERY_LAYERS=certificada_sigef_particular_pr&LAYERS=certificada_sigef_particular_pr&INFO_FORMAT=application/json&X=${x}&Y=${y}&WIDTH=${size.x}&HEIGHT=${size.y}&SRS=EPSG:4326&BBOX=${bbox}`;

    const mapContainer = this.map.getContainer();
    mapContainer.style.cursor = 'wait';

    const loadingPopup = L.popup({
      className: 'compact-sigef-popup',
      maxWidth: 250
    })
      .setLatLng(e.latlng)
      .setContent(`
        <div style="font-family:sans-serif; display:flex; align-items:center; gap:8px; color:#555; font-size:12px;">
          <svg style="animation:spin 1s linear infinite; width:14px; height:14px; flex-shrink:0;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="#ccc" stroke-width="4" fill="none"></circle>
            <path fill="#10b981" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Consultando SIGEF...
        </div>
      `)
      .openOn(this.map);

    try {
      const isLocal = typeof window !== 'undefined' && (
        window.location.origin.includes('localhost') || 
        window.location.origin.includes('127.0.0.1') || 
        window.location.origin.includes('[::1]')
      );

      const proxyFetchUrl = isLocal 
        ? `${this.apiBaseUrl}/proxy/sigef?url=${encodeURIComponent(targetUrl)}`
        : `${window.location.origin}/api.php?action=proxy_sigef&url=${encodeURIComponent(targetUrl)}`;

      const res = await fetch(proxyFetchUrl);
      let data: any = null;
      if (res.ok) {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = null;
        }
      }

      if (data && data.features && data.features.length > 0) {
        const feature = data.features[0];
        const props = feature.properties;
        const uuid = feature.id || props.parcela_codigo || props.co_parcela || props.id_parcela;

        if (uuid) {
          const downloadUrl = `https://sigef.incra.gov.br/geo/exportar/parcela/shp/${uuid}/`;
          const sigefConsultarUrl = `https://sigef.incra.gov.br/geo/parcela/detalhe/${uuid}/`;

          const popupContent = `
            <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.4; min-width:180px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; padding-bottom:5px; border-bottom:1px solid rgba(255, 255, 255, 0.1);">
                <span style="font-weight:700; font-size:11px; color:#10b981; text-transform:uppercase; letter-spacing:0.5px;">SIGEF</span>
                <span style="font-size:10px; color:rgba(255, 255, 255, 0.5);">${escapeHtml(props.situacao_informada || props.status || 'Certificada')}</span>
              </div>
              <div style="font-weight:700; font-size:12px; margin-bottom:4px; color:#ffffff; word-break:break-word;">${escapeHtml(props.nome_area || props.nome_imovel || 'Imóvel Sem Nome')}</div>
              <div style="font-size:11px; color:rgba(255, 255, 255, 0.7); margin-bottom:2px;">Cód: <span style="font-family:monospace;">${escapeHtml(props.codigo_imovel || 'N/A')}</span></div>
              <div style="display:flex; gap:12px; font-size:11px; color:rgba(255, 255, 255, 0.7); margin-bottom:6px;">
                <span>Mat: <strong style="color:#ffffff;">${escapeHtml(props.registro_matricula || props.matricula || 'N/A')}</strong></span>
                <span>${escapeHtml(props.data_submissao || '')}</span>
              </div>
              <div style="display:flex; flex-direction:column; gap:5px; padding-top:6px; border-top:1px solid rgba(255, 255, 255, 0.1);">
                <a href="${downloadUrl}" target="_blank" style="display:flex; align-items:center; justify-content:center; gap:5px; padding:5px 8px; background:rgba(16, 185, 129, 0.15); border:1px solid rgba(16, 185, 129, 0.3); color:#34d399; font-size:11px; font-weight:700; border-radius:5px; text-decoration:none; cursor:pointer;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Baixar Shapefile
                </a>
                <button onclick="window.dispatchEvent(new CustomEvent('gerencigeo:importar_vizinho_sigef', { detail: { uuid: '${uuid}', nome: '${(props.nome_area || props.nome_imovel || 'Imóvel').replace(/'/g, "\\'")}' } }))" style="display:flex; align-items:center; justify-content:center; gap:5px; padding:5px 8px; background:rgba(14, 165, 233, 0.15); border:1px solid rgba(14, 165, 233, 0.3); color:#38bdf8; font-size:11px; font-weight:700; border-radius:5px; cursor:pointer; width:100%; text-align:center;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Importar Confrontante (CSV)
                </button>
                <a href="${sigefConsultarUrl}" target="_blank" style="display:flex; align-items:center; justify-content:center; gap:4px; padding:4px 6px; background:rgba(255, 255, 255, 0.05); border:1px solid rgba(255, 255, 255, 0.1); color:rgba(255, 255, 255, 0.7); font-size:10px; font-weight:600; border-radius:5px; text-decoration:none; cursor:pointer;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                  Abrir no SIGEF
                </a>
              </div>
            </div>
          `;

          loadingPopup.setContent(popupContent);
        } else {
          loadingPopup.setContent(`
            <div style="font-family:sans-serif; font-size:12px; color:#b45309; padding:2px 0;">
              Lote identificado, mas código da parcela indisponível.
            </div>
          `);
        }
      } else {
        loadingPopup.setContent(`
          <div style="font-family:sans-serif; font-size:12px; color:rgba(255, 255, 255, 0.7); padding:2px 0;">
            Nenhum imóvel SIGEF certificado neste ponto.
          </div>
        `);
      }
    } catch (err) {
      console.warn('Erro ao consultar SIGEF:', err);
      loadingPopup.setContent(`
        <div style="font-family:sans-serif; font-size:12px; color:#f59e0b; padding:2px 0;">
          Serviço de consulta SIGEF indisponível nesta área.
        </div>
      `);
    } finally {
      mapContainer.style.cursor = '';
    }
  }
}
