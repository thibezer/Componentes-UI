import L from 'leaflet';
import { UIMapa } from './ui-mapa';

export class UIMapaMarcador extends HTMLElement {
  static get observedAttributes() {
    return ['lat', 'lng', 'titulo'];
  }
  
  private marker: L.Marker | null = null;
  
  connectedCallback() {
    // Aguarda o próximo ciclo para garantir que o `<ui-mapa>` pai já foi inicializado
    setTimeout(() => this.initMarker(), 0);
  }

  disconnectedCallback() {
    if (this.marker) {
      this.marker.remove();
      this.marker = null;
    }
  }

  attributeChangedCallback(name: string, oldVal: string, newVal: string) {
    if (oldVal !== newVal && this.marker) {
      if (name === 'lat' || name === 'lng') {
        const lat = parseFloat(this.getAttribute('lat') || '0');
        const lng = parseFloat(this.getAttribute('lng') || '0');
        this.marker.setLatLng([lat, lng]);
      }
      if (name === 'titulo') {
        this.marker.unbindPopup();
        if (newVal) {
          this.marker.bindPopup(newVal);
        }
      }
    }
  }
  
  private initMarker() {
    const parentMapElement = this.closest('ui-mapa') as UIMapa;
    if (!parentMapElement) {
      console.warn('<ui-mapa-marcador> deve estar dentro de um elemento <ui-mapa>');
      return;
    }
    
    const map = parentMapElement.getMap();
    if (!map) {
      // Se o mapa ainda não estiver pronto, tenta novamente em breve
      setTimeout(() => this.initMarker(), 50);
      return;
    }
    
    const lat = parseFloat(this.getAttribute('lat') || '0');
    const lng = parseFloat(this.getAttribute('lng') || '0');
    const titulo = this.getAttribute('titulo');
    
    this.marker = L.marker([lat, lng]);
    if (titulo) {
      this.marker.bindPopup(titulo);
    }
    
    this.marker.addTo(map);
  }
}

if (!customElements.get('ui-mapa-marcador')) {
  customElements.define('ui-mapa-marcador', UIMapaMarcador);
}
