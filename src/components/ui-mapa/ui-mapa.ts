import type L from 'leaflet';
import { leafletCss } from '../../core/leaflet-style';
import estilos from './ui-mapa.css?inline';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { carregarLeafletTipado } from './mapa-leaflet';
import { obterBasemaps } from './mapa-basemaps';
import { lerCamadas, lerVista } from './mapa-atributos';

const ROTULO_PADRAO = 'Mapa';

const AVISO_SEM_LEAFLET = `
  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 140px; padding: 16px; box-sizing: border-box; text-align: center; color: var(--ui-cor-texto-secundario, #888899); font-family: var(--ui-fonte-base, 'Inter', sans-serif); font-size: 12px; background: var(--ui-cor-superficie, #141417); border-radius: var(--ui-raio-borda, 6px); border: 1px dashed var(--ui-cor-borda, rgba(255,255,255,0.15));">
    <span style="font-size: 20px; margin-bottom: 6px;" aria-hidden="true">🗺️</span>
    <strong style="color: var(--ui-cor-texto, #e1e1e6); margin-bottom: 4px;">Leaflet não encontrado</strong>
    <span style="max-width: 320px; line-height: 1.4;">Para utilizar o componente <code>&lt;ui-mapa&gt;</code>, instale a biblioteca <code>leaflet</code> ou inclua seu script no HTML: <code>&lt;script src=".../leaflet.js"&gt;&lt;/script&gt;</code>.</span>
  </div>
`;

/**
 * Mapa Leaflet encapsulado. Aceita `<ui-mapa-marcador>` e `<ui-mapa-linha>` como filhos.
 *
 * @attr {number} lat - Latitude do centro (-90..90; inválida cai no padrão).
 * @attr {number} lng - Longitude do centro (-180..180; inválida cai no padrão).
 * @attr {number} zoom - Zoom inicial (0..22; inválido cai no padrão).
 * @attr {string} camadas - Camadas base separadas por vírgula (`osm`, `satelite`, `topografia`, `ruas`).
 * @attr {string} aria-label - Nome acessível da região do mapa (padrão: "Mapa").
 * @fires ui-mapa-pronto - O mapa foi criado (`detail.map`); é emitido de novo se o elemento for reconectado.
 */
export class UIMapa extends SafeHTMLElement {
  static get observedAttributes() {
    return ['lat', 'lng', 'zoom', 'aria-label'];
  }

  private mapContainer: HTMLDivElement;
  private mapInstance: L.Map | null = null;
  private _initTimer: ReturnType<typeof setTimeout> | null = null;
  private _resizeObserver?: ResizeObserver;
  private _resizeTimer?: ReturnType<typeof setTimeout>;
  private _invalidarTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML = `
      <style>
        ${leafletCss}
        ${estilos}
      </style>
      <div class="ui-mapa-container" id="map-container" role="region"></div>
      <div style="display: none;"><slot></slot></div>
    `;
    this.mapContainer = shadow.getElementById('map-container') as HTMLDivElement;
    this.sincronizarRotulo();
  }

  connectedCallback() {
    this.sincronizarRotulo();
    // Timeout para garantir que o elemento está renderizado e tem dimensões
    this._initTimer = setTimeout(() => {
      this._initTimer = null;
      void this.initMap();
    }, 0);
  }

  disconnectedCallback() {
    if (this._initTimer) {
      clearTimeout(this._initTimer);
      this._initTimer = null;
    }
    this._resizeObserver?.disconnect();
    this._resizeObserver = undefined;
    if (this._resizeTimer) clearTimeout(this._resizeTimer);
    if (this._invalidarTimer) clearTimeout(this._invalidarTimer);
    this._resizeTimer = undefined;
    this._invalidarTimer = undefined;
    if (this.mapInstance) {
      this.mapInstance.remove();
      this.mapInstance = null;
    }
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal === newVal) return;
    if (name === 'aria-label') {
      this.sincronizarRotulo();
      return;
    }
    if (this.mapInstance) {
      const v = lerVista(this.getAttribute('lat'), this.getAttribute('lng'), this.getAttribute('zoom'));
      this.mapInstance.setView([v.lat, v.lng], v.zoom);
    }
  }

  /** Nome acessível da região: o `aria-label` do host ou "Mapa". */
  private sincronizarRotulo(): void {
    this.mapContainer?.setAttribute('aria-label', this.getAttribute('aria-label') || ROTULO_PADRAO);
  }

  private async initMap(): Promise<void> {
    if (this.mapInstance) return;

    const L = await carregarLeafletTipado();
    // desconectado (ou já inicializado por outra chamada) enquanto o Leaflet carregava: não cria mapa órfão
    if (!this.isConnected || this.mapInstance) return;

    if (!L) {
      this.mapContainer.innerHTML = AVISO_SEM_LEAFLET;
      return;
    }

    const basemaps = obterBasemaps(L);
    const v = lerVista(this.getAttribute('lat'), this.getAttribute('lng'), this.getAttribute('zoom'));
    const mapa = L.map(this.mapContainer).setView([v.lat, v.lng], v.zoom);
    this.mapInstance = mapa;

    const camadasAtivas = lerCamadas(this.getAttribute('camadas'), Object.keys(basemaps));

    // A primeira camada da lista é a visível; as demais entram no controle de camadas
    const principal = basemaps[camadasAtivas[0]].layer();
    principal.addTo(mapa);
    if (camadasAtivas.length > 1) {
      const baseMaps: Record<string, L.TileLayer> = { [basemaps[camadasAtivas[0]].nome]: principal };
      for (const chave of camadasAtivas.slice(1)) baseMaps[basemaps[chave].nome] = basemaps[chave].layer();
      L.control.layers(baseMaps, undefined, { position: 'topright' }).addTo(mapa);
    }

    // Contorno para o problema do caminho das imagens do Leaflet no Webpack/Vite
    if (L.Icon?.Default) {
      L.Icon.Default.imagePath = 'https://unpkg.com/leaflet@1.9.4/dist/images/';
    }

    // Monitora redimensionamento do contêiner com ResizeObserver
    if (typeof ResizeObserver !== 'undefined') {
      this._resizeObserver = new ResizeObserver(() => {
        if (this._resizeTimer) clearTimeout(this._resizeTimer);
        this._resizeTimer = setTimeout(() => this.mapInstance?.invalidateSize(), 60);
      });
      this._resizeObserver.observe(this.mapContainer);
    }

    // Força a atualização de tamanho após a inicialização
    this._invalidarTimer = setTimeout(() => this.mapInstance?.invalidateSize(), 100);

    // Notifica elementos filhos ou containers que o mapa está pronto
    this.dispatchEvent(new CustomEvent('ui-mapa-pronto', {
      detail: { map: mapa },
      bubbles: true,
      composed: true
    }));
  }

  public getMap(): L.Map | null {
    return this.mapInstance;
  }
}

definirCustomElement('ui-mapa', UIMapa);
