import type L from 'leaflet';
import { parseCoordenada } from '../../gerencigeo-canvas/utils';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { obterLeaflet } from './mapa-leaflet';
import { COR_MARCADOR_PADRAO, corSegura } from './mapa-atributos';
import { criarIconeMarcador } from './mapa-icones';
import { VinculoMapaPai } from './mapa-vinculo-pai';
import type { FormatoMarcador } from './tipos';

/**
 * Marcador dentro de um `<ui-mapa>`.
 *
 * @attr {number} lat - Latitude (inválida: o marcador não é criado).
 * @attr {number} lng - Longitude.
 * @attr {string} titulo - Texto do popup e nome acessível do marcador (aria-label e title).
 * @attr {string} cor - Cor do ícone (hex, rgb/hsl ou nome; outro valor usa a cor padrão).
 * @attr {'pin'|'circle'} formato - Forma do ícone (padrão `pin`).
 */
export class UIMapaMarcador extends SafeHTMLElement {
  static get observedAttributes() {
    return ['lat', 'lng', 'titulo', 'cor', 'formato'];
  }

  private marker: L.Marker | null = null;
  private vinculo = new VinculoMapaPai(this, {
    rotulo: 'ui-mapa-marcador',
    aoMapa: (mapa) => this.criarMarcador(mapa),
    aoPerderMapa: () => this.removerMarcador()
  });

  connectedCallback() {
    this.vinculo.conectar();
  }

  disconnectedCallback() {
    this.vinculo.desconectar();
    this.removerMarcador();
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal === newVal || !this.marker) return;
    if (name === 'lat' || name === 'lng') {
      const coord = parseCoordenada(this.getAttribute('lat'), this.getAttribute('lng'));
      if (coord) this.marker.setLatLng([coord.lat, coord.lon]);
    } else if (name === 'titulo') {
      this.marker.unbindPopup();
      if (newVal) this.marker.bindPopup(this.createPopupContent(newVal));
      this.aplicarNomeAcessivel();
    } else if (name === 'cor' || name === 'formato') {
      const L = obterLeaflet();
      if (L) this.marker.setIcon(this.createIcon(L));
    }
  }

  private removerMarcador(): void {
    this.marker?.remove();
    this.marker = null;
  }

  private createPopupContent(titulo: string): HTMLElement {
    const container = document.createElement('div');
    container.className = 'ui-mapa-popup';
    container.textContent = titulo;
    return container;
  }

  private createIcon(L: NonNullable<ReturnType<typeof obterLeaflet>>): L.DivIcon {
    const formato: FormatoMarcador = this.getAttribute('formato') === 'circle' ? 'circle' : 'pin';
    return criarIconeMarcador(L, corSegura(this.getAttribute('cor'), COR_MARCADOR_PADRAO), formato);
  }

  /** O ícone é um `div`: o nome acessível vai em `aria-label` (o Leaflet já põe `role=button` e `tabindex=0`). */
  private aplicarNomeAcessivel(): void {
    const icone = this.marker?.getElement();
    if (!icone) return;
    const titulo = this.getAttribute('titulo');
    if (titulo) {
      icone.setAttribute('aria-label', titulo);
      icone.setAttribute('title', titulo);
    } else {
      icone.removeAttribute('aria-label');
      icone.removeAttribute('title');
    }
  }

  private criarMarcador(mapa: L.Map): void {
    this.removerMarcador();
    const coord = parseCoordenada(this.getAttribute('lat'), this.getAttribute('lng'));
    if (!coord) return;
    const L = obterLeaflet();
    if (!L) return;

    const titulo = this.getAttribute('titulo');
    const marcador = L.marker([coord.lat, coord.lon], { icon: this.createIcon(L), keyboard: true, title: titulo || undefined });
    if (titulo) marcador.bindPopup(this.createPopupContent(titulo));
    marcador.addTo(mapa);
    this.marker = marcador;
    this.aplicarNomeAcessivel();
  }
}

definirCustomElement('ui-mapa-marcador', UIMapaMarcador);
