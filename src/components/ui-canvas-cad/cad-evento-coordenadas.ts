/**
 * Leitura de coordenadas e alvo de eventos de mapa/DOM do <ui-canvas-cad>.
 * Responsabilidade única: funções puras que normalizam o formato do evento (Leaflet ou MouseEvent cru),
 * sem tocar no mapa nem despachar eventos.
 */
import type { EventoMapaCad, LatLngEvento } from './tipos';

export interface PontoPixel {
  x: number;
  y: number;
}

/** Evento "de baixo": o `originalEvent` do Leaflet quando existe, senão o próprio evento. */
export function eventoOriginalDe(e: unknown): EventoMapaCad {
  const evento = e as EventoMapaCad | null | undefined;
  return (evento?.originalEvent || evento || {}) as EventoMapaCad;
}

/** Primeiro alvo do evento: `composedPath()[0]` (atravessa o shadow DOM) ou `target`. */
export function alvoDoEvento(e: unknown): HTMLElement | null {
  const evento = e as EventoMapaCad | null | undefined;
  const original = eventoOriginalDe(e);
  const caminho = typeof original.composedPath === 'function' ? original.composedPath() : [];
  return (caminho.length > 0 ? caminho[0] : (original.target || evento?.target || null)) as HTMLElement | null;
}

/**
 * Ponto em pixels relativo ao contêiner: o parâmetro explícito, depois `containerPoint`/`layerPoint` do evento
 * e, por fim, `clientX/clientY` descontando o retângulo do contêiner.
 */
export function pontoPixelDe(e: unknown, explicito: PontoPixel | undefined, retanguloContainer: { left: number; top: number }): PontoPixel {
  if (explicito) return { x: Math.round(explicito.x), y: Math.round(explicito.y) };
  const evento = e as EventoMapaCad | null | undefined;
  if (evento?.containerPoint || evento?.layerPoint) {
    return {
      x: Math.round(evento.containerPoint?.x ?? evento.layerPoint?.x ?? 0),
      y: Math.round(evento.containerPoint?.y ?? evento.layerPoint?.y ?? 0)
    };
  }
  const original = eventoOriginalDe(e);
  return {
    x: Math.round((original.clientX ?? 0) - retanguloContainer.left),
    y: Math.round((original.clientY ?? 0) - retanguloContainer.top)
  };
}

/** Latitude/longitude do parâmetro explícito ou do evento (aceita `lon` no lugar de `lng`); `null` se não houver número em `lat`. */
export function latLngDe(e: unknown, explicito?: LatLngEvento): { lat: number; lng: number } | null {
  const fonte: LatLngEvento | undefined = explicito || (e as EventoMapaCad | null | undefined)?.latlng;
  if (fonte && typeof fonte.lat === 'number') return { lat: fonte.lat, lng: fonte.lng ?? fonte.lon ?? 0 };
  return null;
}
