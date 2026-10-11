import L from 'leaflet';
import type { LatLonPar } from './feature_types';

/*
 * Cursores de outros operadores (colaboração). Nome e cor vêm da rede, então: o nome entra por
 * textContent e a cor só passa se for #hex.
 */

const PANE = 'cad-cursores';
const COR_HEX = /^#[0-9a-f]{3,8}$/i;
const COR_PADRAO = '#94a3b8';

export interface UsuarioRemoto {
  id: string;
  nome?: string;
  cor?: string;
}

export function corHexSegura(cor: unknown): string {
  return typeof cor === 'string' && COR_HEX.test(cor.trim()) ? cor.trim() : COR_PADRAO;
}

const SVG =
  '<svg width="18" height="18" viewBox="0 0 24 24" style="display:block;filter:drop-shadow(0 1px 1px rgba(0,0,0,.6))">' +
  '<path d="M3 2 L3 19 L8 14.5 L11.5 22 L14.5 20.5 L11 13.5 L18 13 Z" fill="currentColor" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>';

function montarIcone(usuario: UsuarioRemoto): L.DivIcon {
  const raiz = document.createElement('div');
  raiz.style.cssText = `color:${corHexSegura(usuario.cor)};position:relative;pointer-events:none`;
  raiz.innerHTML = SVG; // constante do código, sem dado externo
  const nome = document.createElement('span');
  nome.textContent = String(usuario.nome ?? usuario.id);
  nome.style.cssText =
    `position:absolute;left:16px;top:14px;white-space:nowrap;font:600 11px sans-serif;color:#fff;background:${corHexSegura(usuario.cor)};` +
    'padding:1px 5px;border-radius:3px;max-width:160px;overflow:hidden;text-overflow:ellipsis';
  raiz.appendChild(nome);
  return L.divIcon({ className: 'custom-leaflet-marker cad-cursor-remoto', iconSize: [18, 18], iconAnchor: [3, 2], html: raiz });
}

export class CursoresRemotos {
  private marcadores = new Map<string, { marker: L.Marker; assinatura: string }>();

  constructor(private obterMapa: () => L.Map | null) {}

  public get quantidade(): number {
    return this.marcadores.size;
  }

  public atualizar(usuario: UsuarioRemoto, coord: LatLonPar): boolean {
    const map = this.obterMapa();
    if (!map || !usuario || usuario.id === undefined || usuario.id === null || usuario.id === '') return false;
    if (!Number.isFinite(coord?.[0]) || !Number.isFinite(coord?.[1])) return false;
    const id = String(usuario.id);
    const assinatura = `${usuario.nome ?? ''}\u0000${corHexSegura(usuario.cor)}`;

    const atual = this.marcadores.get(id);
    if (atual) {
      atual.marker.setLatLng(coord);
      if (atual.assinatura !== assinatura) {
        atual.marker.setIcon(montarIcone(usuario));
        atual.assinatura = assinatura;
      }
      return true;
    }
    if (!map.getPane(PANE)) map.createPane(PANE).style.zIndex = '9500';
    const marker = L.marker(coord, { icon: montarIcone(usuario), pane: PANE, interactive: false, keyboard: false }).addTo(map);
    this.marcadores.set(id, { marker, assinatura });
    return true;
  }

  public remover(id: string): boolean {
    const m = this.marcadores.get(String(id));
    if (!m) return false;
    m.marker.remove();
    this.marcadores.delete(String(id));
    return true;
  }

  public limpar(): void {
    for (const m of this.marcadores.values()) m.marker.remove();
    this.marcadores.clear();
  }
}
