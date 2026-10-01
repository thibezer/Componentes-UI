import type L from 'leaflet';
import { obterLeafletSincrono } from '../../core/leaflet-loader';
import { UIMapa } from './ui-mapa';
import { parseCoordenada } from '../../gerencigeo-canvas/utils';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';

export class UIMapaMarcador extends SafeHTMLElement {
  static get observedAttributes() {
    return ['lat', 'lng', 'titulo'];
  }
  
  private marker: L.Marker | null = null;
  private _initTimer: any = null;
  private _retryCount: number = 0;
  private _parentMap: HTMLElement | null = null;
  
  connectedCallback() {
    this._parentMap = this.closest('ui-mapa');
    if (this._parentMap) {
      this._parentMap.addEventListener('ui-mapa-pronto', this.handleMapReady);
    }
    // Aguarda o próximo ciclo para garantir que o `<ui-mapa>` pai já foi inicializado
    this._initTimer = setTimeout(() => this.initMarker(), 0);
  }

  disconnectedCallback() {
    if (this._initTimer) {
      clearTimeout(this._initTimer);
      this._initTimer = null;
    }
    if (this._parentMap) {
      this._parentMap.removeEventListener('ui-mapa-pronto', this.handleMapReady);
      this._parentMap = null;
    }
    if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }
  }

  private handleMapReady = () => {
    if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }
    this.initMarker();
  };

  attributeChangedCallback(name: string, oldVal: string, newVal: string) {
    if (oldVal !== newVal && this.marker) {
      if (name === 'lat' || name === 'lng') {
        const coord = parseCoordenada(this.getAttribute('lat'), this.getAttribute('lng'));
        if (coord) {
          this.marker.setLatLng([coord.lat, coord.lon]);
        }
      }
      if (name === 'titulo') {
        this.marker.unbindPopup();
        if (newVal) {
          this.marker.bindPopup(this.createPopupContent(newVal));
        }
      }
    }
  }

  private createPopupContent(titulo: string): HTMLElement {
    const container = document.createElement('div');
    container.className = 'ui-mapa-popup';
    container.textContent = titulo;
    return container;
  }
  
  private initMarker() {
    const parentMapElement = (this._parentMap || this.closest('ui-mapa')) as UIMapa;
    if (!parentMapElement) {
      console.warn('<ui-mapa-marcador> deve estar dentro de um elemento <ui-mapa>');
      return;
    }
    
    const map = parentMapElement.getMap();
    if (!map) {
      const MAX_RETRIES = 30;
      if (this._retryCount >= MAX_RETRIES) {
        console.warn('<ui-mapa-marcador> Tempo limite esgotado aguardando inicialização do mapa pai.');
        return;
      }
      this._retryCount++;
      // Se o mapa ainda não estiver pronto, tenta novamente em breve
      this._initTimer = setTimeout(() => this.initMarker(), 50);
      return;
    }
    
    this._retryCount = 0;
    
    const coord = parseCoordenada(this.getAttribute('lat'), this.getAttribute('lng'));
    if (!coord) return;

    const titulo = this.getAttribute('titulo');
    const L = obterLeafletSincrono() || (window as any).L;
    if (!L) return;

    this.marker = L.marker([coord.lat, coord.lon]);
    if (this.marker) {
      if (titulo) {
        this.marker.bindPopup(this.createPopupContent(titulo));
      }
      this.marker.addTo(map);
    }
  }
}

definirCustomElement('ui-mapa-marcador', UIMapaMarcador);
