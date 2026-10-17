/**
 * Ícones dos marcadores do <ui-mapa-marcador>.
 * Responsabilidade única: construir o DOM do ícone (pin SVG ou círculo) com a cor validada, sem interpolar
 * texto em HTML.
 */
import type { DivIcon } from 'leaflet';
import type { FormatoMarcador, LeafletModulo } from './tipos';

const SVG_NS = 'http://www.w3.org/2000/svg';

function criarCirculo(cor: string): HTMLElement {
  const bolinha = document.createElement('div');
  bolinha.style.cssText = 'width:14px;height:14px;border-radius:50%;border:2px solid #ffffff;box-shadow:0 1px 4px rgba(0,0,0,0.6);';
  bolinha.style.backgroundColor = cor;
  return bolinha;
}

function criarPin(cor: string): SVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', '24');
  svg.setAttribute('height', '32');
  svg.setAttribute('viewBox', '0 0 24 32');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.filter = 'drop-shadow(0 2px 4px rgba(0,0,0,0.45))';
  const corpo = document.createElementNS(SVG_NS, 'path');
  corpo.setAttribute('d', 'M12 0C5.372 0 0 5.372 0 12C0 21 12 32 12 32C12 32 24 21 24 12C24 5.372 18.628 0 12 0Z');
  corpo.setAttribute('fill', cor);
  const centro = document.createElementNS(SVG_NS, 'circle');
  centro.setAttribute('cx', '12');
  centro.setAttribute('cy', '11');
  centro.setAttribute('r', '4.5');
  centro.setAttribute('fill', '#ffffff');
  svg.append(corpo, centro);
  return svg;
}

/** `cor` já deve ter passado por `corSegura`. */
export function criarIconeMarcador(L: LeafletModulo, cor: string, formato: FormatoMarcador): DivIcon {
  if (formato === 'circle') {
    return L.divIcon({ className: 'ui-mapa-div-marker', html: criarCirculo(cor), iconSize: [14, 14], iconAnchor: [7, 7] });
  }
  return L.divIcon({ className: 'ui-mapa-svg-pin', html: criarPin(cor) as unknown as HTMLElement, iconSize: [24, 32], iconAnchor: [12, 32], popupAnchor: [0, -30] });
}
