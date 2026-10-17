import type L from 'leaflet';
import { SafeHTMLElement, definirCustomElement } from '../../core/ssr-safe';
import { obterLeaflet } from './mapa-leaflet';
import { COR_LINHA_PADRAO, ESPESSURA_PADRAO, corSegura, lerInteiroPositivo, lerPontos } from './mapa-atributos';
import { VinculoMapaPai } from './mapa-vinculo-pai';

/**
 * Polilinha dentro de um `<ui-mapa>`.
 *
 * @attr {string} pontos - JSON `[[lat, lng], ...]`; pares inválidos são ignorados.
 * @attr {string} cor - Cor do traço (hex, rgb/hsl ou nome; outro valor usa a cor padrão).
 * @attr {number} espessura - Espessura em pixels (inteiro positivo; padrão 3).
 */
export class UIMapaLinha extends SafeHTMLElement {
  static get observedAttributes() {
    return ['pontos', 'cor', 'espessura'];
  }

  private polyline: L.Polyline | null = null;
  private vinculo = new VinculoMapaPai(this, {
    rotulo: 'ui-mapa-linha',
    aoMapa: (mapa) => this.criarLinha(mapa),
    aoPerderMapa: () => this.removerLinha()
  });

  connectedCallback() {
    this.vinculo.conectar();
  }

  disconnectedCallback() {
    this.vinculo.desconectar();
    this.removerLinha();
  }

  attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null) {
    if (oldVal === newVal || !this.polyline) return;
    if (name === 'pontos') this.polyline.setLatLngs(lerPontos(this.getAttribute('pontos')));
    else this.polyline.setStyle(this.estilo());
  }

  private estilo(): L.PathOptions {
    return {
      color: corSegura(this.getAttribute('cor'), COR_LINHA_PADRAO),
      weight: lerInteiroPositivo(this.getAttribute('espessura'), ESPESSURA_PADRAO)
    };
  }

  private removerLinha(): void {
    this.polyline?.remove();
    this.polyline = null;
  }

  private criarLinha(mapa: L.Map): void {
    this.removerLinha();
    const L = obterLeaflet();
    if (!L) return;
    this.polyline = L.polyline(lerPontos(this.getAttribute('pontos')), this.estilo()).addTo(mapa);
  }
}

definirCustomElement('ui-mapa-linha', UIMapaLinha);
