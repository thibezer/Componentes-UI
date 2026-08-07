import L from 'leaflet';
import { UIMapa } from './ui-mapa';

export class UIMapaLinha extends HTMLElement {
  static get observedAttributes() {
    return ['pontos', 'cor', 'espessura'];
  }
  
  private polyline: L.Polyline | null = null;

  connectedCallback() {
    setTimeout(() => this.initLinha(), 0);
  }

  disconnectedCallback() {
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
      setTimeout(() => this.initLinha(), 50);
      return;
    }
    
    const cor = this.getAttribute('cor') || '#3388ff';
    const espessura = parseInt(this.getAttribute('espessura') || '3', 10);
    
    this.polyline = L.polyline(this.getPontos(), {
      color: cor,
      weight: espessura
    });
    
    this.polyline.addTo(map);
  }
}

if (!customElements.get('ui-mapa-linha')) {
  customElements.define('ui-mapa-linha', UIMapaLinha);
}
