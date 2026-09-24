import L from 'leaflet';
import { leafletCss } from '../../core/leaflet-style';
import estilos from './ui-mapa.css?inline';

const BASEMAPS: Record<string, { nome: string; layer: () => L.TileLayer }> = {
  osm: {
    nome: 'OpenStreetMap',
    layer: () => L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    })
  },
  satelite: {
    nome: 'Satélite (Esri)',
    layer: () => L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    })
  },
  topografia: {
    nome: 'Topografia',
    layer: () => L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/">CC-BY-SA</a>)'
    })
  },
  ruas: {
    nome: 'Ruas (Esri)',
    layer: () => L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
    })
  }
};

export class UIMapa extends HTMLElement {
  static get observedAttributes() {
    return ['lat', 'lng', 'zoom'];
  }

  private mapContainer: HTMLDivElement;
  private mapInstance: L.Map | null = null;
  private _initTimer: any = null;
  private _resizeObserver?: ResizeObserver;
  private _resizeTimer?: any;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        ${leafletCss}
        ${estilos}
      </style>
      <div class="ui-mapa-container" id="map-container"></div>
      <div style="display: none;"><slot></slot></div>
    `;
    this.mapContainer = shadow.getElementById('map-container') as HTMLDivElement;
  }

  connectedCallback() {
    // Timeout para garantir que o elemento está renderizado e tem dimensões
    this._initTimer = window.setTimeout(() => {
      this.initMap();
    }, 0);
  }

  disconnectedCallback() {
    if (this._initTimer) {
      window.clearTimeout(this._initTimer);
      this._initTimer = null;
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = undefined;
    }
    if (this._resizeTimer) {
      window.clearTimeout(this._resizeTimer);
      this._resizeTimer = null;
    }
    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
    }
  }

  attributeChangedCallback(_name: string, oldVal: string, newVal: string) {
    if (oldVal !== newVal && this.mapInstance) {
      const lat = parseFloat(this.getAttribute('lat') || '-23.550520');
      const lng = parseFloat(this.getAttribute('lng') || '-46.633308');
      const zoom = parseInt(this.getAttribute('zoom') || '13', 10);
      if (!isNaN(lat) && !isNaN(lng)) {
        this.mapInstance.setView([lat, lng], zoom);
      }
    }
  }
  
  private initMap() {
    if (this.mapInstance) return;
    
    const lat = parseFloat(this.getAttribute('lat') || '-23.550520'); // SP default
    const lng = parseFloat(this.getAttribute('lng') || '-46.633308');
    const zoom = parseInt(this.getAttribute('zoom') || '13', 10);
    
    this.mapInstance = L.map(this.mapContainer).setView([lat, lng], zoom);
    
    const camadasStr = this.getAttribute('camadas');
    let camadasAtivas: string[] = ['osm']; // Padrão
    
    if (camadasStr) {
      camadasAtivas = camadasStr.split(',').map(s => s.trim().toLowerCase()).filter(s => BASEMAPS[s]);
      if (camadasAtivas.length === 0) camadasAtivas = ['osm'];
    }
    
    // Adiciona a primeira camada da lista como camada padrão visível
    const layerPrincipal = BASEMAPS[camadasAtivas[0]].layer();
    layerPrincipal.addTo(this.mapInstance);

    // Se tiver múltiplas camadas, cria o controle
    if (camadasAtivas.length > 1) {
      const baseMaps: Record<string, L.TileLayer> = {};
      baseMaps[BASEMAPS[camadasAtivas[0]].nome] = layerPrincipal;
      
      for (let i = 1; i < camadasAtivas.length; i++) {
        const key = camadasAtivas[i];
        baseMaps[BASEMAPS[key].nome] = BASEMAPS[key].layer();
      }
      L.control.layers(baseMaps, undefined, { position: 'topright' }).addTo(this.mapInstance);
    }
    
    // Contorno para o problema do caminho das imagens do Leaflet no Webpack/Vite
    L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';

    // Monitora redimensionamento do contêiner com ResizeObserver
    if (typeof ResizeObserver !== 'undefined' && this.mapContainer) {
      this._resizeObserver = new ResizeObserver(() => {
        if (this._resizeTimer) clearTimeout(this._resizeTimer);
        this._resizeTimer = setTimeout(() => {
          if (this.mapInstance) this.mapInstance.invalidateSize();
        }, 60);
      });
      this._resizeObserver.observe(this.mapContainer);
    }

    // Forçar atualização de tamanho após inicialização
    setTimeout(() => {
      if (this.mapInstance) this.mapInstance.invalidateSize();
    }, 100);

    // Notifica elementos filhos ou containers que o mapa está pronto
    this.dispatchEvent(new CustomEvent('ui-mapa-pronto', {
      detail: { map: this.mapInstance },
      bubbles: true,
      composed: true
    }));
  }

  public getMap(): L.Map | null {
    return this.mapInstance;
  }
}

if (!customElements.get('ui-mapa')) {
  customElements.define('ui-mapa', UIMapa);
}
