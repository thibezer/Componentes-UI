import L from 'leaflet';
import type { CanvasLayerDef } from './types';

/* Operações sobre os panes Leaflet de cada camada (z-index, opacidade, interação) */

export function nomePane(layerId: string): string {
  return `pane-${layerId}`;
}

function calcularPointerEvents(layer: CanvasLayerDef): 'auto' | 'none' {
  return layer.visivel && layer.interativo && !layer.bloqueada ? 'auto' : 'none';
}

export function garantirPanes(map: L.Map, layers: CanvasLayerDef[]): void {
  layers.forEach(layer => {
    const paneName = nomePane(layer.id);
    const pane = map.getPane(paneName) ?? map.createPane(paneName);
    if (pane) {
      pane.style.zIndex = String(layer.zIndex);
      pane.style.pointerEvents = calcularPointerEvents(layer);
    }
  });
}

export function aplicarVisibilidadePane(map: L.Map, layer: CanvasLayerDef): void {
  const pane = map.getPane(nomePane(layer.id));
  if (pane) {
    pane.style.display = layer.visivel ? '' : 'none';
    pane.style.pointerEvents = calcularPointerEvents(layer);
  }
}

export function aplicarOpacidadePane(map: L.Map, layer: CanvasLayerDef): void {
  const pane = map.getPane(nomePane(layer.id));
  if (pane) pane.style.opacity = String(layer.opacidade);
}

export function aplicarZIndexPane(map: L.Map, layer: CanvasLayerDef): void {
  const pane = map.getPane(nomePane(layer.id));
  if (pane) pane.style.zIndex = String(layer.zIndex);
}

export function aplicarBloqueioPane(map: L.Map, layer: CanvasLayerDef): void {
  const pane = map.getPane(nomePane(layer.id));
  if (pane) pane.style.pointerEvents = calcularPointerEvents(layer);
}
