import type L from 'leaflet';
import { obterLeafletSincrono } from '../../core/leaflet-loader';
import { UIMapa } from './ui-mapa';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';

export class UIMapaLinha extends SafeHTMLElement {
  static get observedAttributes() {
    return ['pontos', 'cor', 'espessura'];
  }
  
  private polyline: L.Polyline | null = null;
  private _initTimer: any = null;
  private _retryCount: number = 0;

  connectedCallback() {
    this._initTimer = setTimeout(() => this.initLinha(), 0);
  }

  disconnectedCallback() {
    if (this._initTimer) {
      clearTimeout(this._initTimer);
      this._initTimer = null;
    }
    if (this.polyline) {
      this.polyline.remove();
      this.polyline = null;
    }
  }
  
  attributeChangedCallback(name: string, oldVal: string, newVal: string) {
    if (oldVal !== newVal && this.polyline) {
      if (name === 'pontos') {
        this.polyline.setLatLngs(this.getPontos());
      } else if (name === 'cor' || name === 'espessura') {
        this.polyline.setStyle({
          color: this.getAttribute('cor') || '#3388ff',
          weight: parseInt(this.getAttribute('espessura') || '3', 10)
        });
      }
    }
  }
  
  private getPontos(): L.LatLngExpression[] {
    try {
      const pontosStr = this.getAttribute('pontos');
      if (pontosStr) {
        // Espera um JSON string com array de coordenadas, ex: "[[lat, lng], [lat, lng]]"
        return JSON.parse(pontosStr);
      }
    } catch(e) {
      console.error('Formato inválido para atributo pontos no <ui-mapa-linha>. Deve ser um JSON array, ex: "[[lat, lng], ...]"', e);
    }
    return [];
  }

  private initLinha() {
    const parentMapElement = this.closest('ui-mapa') as UIMapa;
    if (!parentMapElement) {
      console.warn('<ui-mapa-linha> deve estar dentro de um elemento <ui-mapa>');
      return;
    }
    
    const map = parentMapElement.getMap();
    if (!map) {
      const MAX_RETRIES = 30;
      if (this._retryCount >= MAX_RETRIES) {
        console.warn('<ui-mapa-linha> Tempo limite esgotado aguardando inicialização do mapa pai.');
        return;
      }
      this._retryCount++;
      this._initTimer = setTimeout(() => this.initLinha(), 50);
      return;
    }
    
    this._retryCount = 0;
    
    const cor = this.getAttribute('cor') || '#3388ff';
    const espessura = parseInt(this.getAttribute('espessura') || '3', 10);
    const L = obterLeafletSincrono() || (window as any).L;
    if (!L) return;

    this.polyline = L.polyline(this.getPontos(), {
      color: cor,
      weight: espessura
    });
    
    if (this.polyline) {
      this.polyline.addTo(map);
    }
  }
}

definirCustomElement('ui-mapa-linha', UIMapaLinha);
