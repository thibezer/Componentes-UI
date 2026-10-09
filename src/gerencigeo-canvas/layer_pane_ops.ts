import L from 'leaflet';
import type { CanvasLayerDef } from './types';

/* Operações sobre os panes Leaflet de cada camada (z-index, opacidade, interação) */

export function nomePane(layerId: string): string {
  return `pane-${layerId}`;
}

/**
 * Tipos de geometria de uma camada, do fundo para o topo. Cada um vira um sub-pane aninhado no
 * pane da camada, para polígonos não cobrirem linhas/pontos da mesma camada.
 */
export type TipoGeometriaPane = 'poligono' | 'linha' | 'ponto' | 'texto';

export const ORDEM_GEOMETRIA: TipoGeometriaPane[] = ['poligono', 'linha', 'ponto', 'texto'];

export function nomeSubPane(layerId: string, tipo: TipoGeometriaPane): string {
  return `${nomePane(layerId)}-${tipo}`;
}

/** Garante (e devolve o nome de) o sub-pane de um tipo de geometria dentro do pane da camada. */
export function garantirSubPane(map: L.Map, layerId: string, tipo: TipoGeometriaPane): string {
  const pai = map.getPane(nomePane(layerId)) ?? map.createPane(nomePane(layerId));
  const nome = nomeSubPane(layerId, tipo);
  if (!map.getPane(nome)) {
    const sub = map.createPane(nome, pai);
    sub.style.zIndex = String((ORDEM_GEOMETRIA.indexOf(tipo) + 1) * 100);
  }
  return nome;
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
