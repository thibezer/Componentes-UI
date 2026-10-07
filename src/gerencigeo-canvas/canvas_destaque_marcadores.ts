import L from 'leaflet';
import { getPointShapeHtml, fatorDensidade, modoDensidade } from './mapa_pontos_shapes';

/* Destaque visual de marcadores selecionados (z-index, ícone e classes CSS) */

/**
 * Converte IDs numéricos em string (ex.: "12") para number; mantém demais valores.
 */
export function normalizarIdPonto(pId: string | number): string | number {
  return (pId !== undefined && pId !== null && !isNaN(Number(pId)) && String(pId).trim() !== '')
    ? Number(pId)
    : pId;
}

function calcularTamanhoMarcador(controller: any, anyMarker: any): number {
  const map: L.Map | null = controller.core.map;
  const layerDef = controller.layerManager.getLayerDef(anyMarker.layerId);
  const baseSize = anyMarker.baseSize || 8;
  const multiplier = controller.context.graphicScale?.markerScaleMultiplier || 1.0;

  if (map && layerDef?.estilo?.scaleMode === 'world') {
    const dimMetros = layerDef.estilo.dimensaoMetros || 0.25;
    const center = map.getCenter();
    const zoom = map.getZoom();
    const metersPerPixel = (40075016.686 * Math.abs(Math.cos((center.lat * Math.PI) / 180))) / Math.pow(2, zoom + 8);
    const px = dimMetros / (metersPerPixel > 0 ? metersPerPixel : 1);
    return Math.max(3, Math.round(px * multiplier));
  }
  const fator = fatorDensidade(anyMarker.densTotal || 0, map?.getZoom() ?? 18);
  return Math.max(fator < 1 ? 5 : 4, Math.round(baseSize * multiplier * fator));
}

function recriarIconeMarcador(controller: any, marker: L.Marker, anyMarker: any, pId: any, isSelected: boolean): void {
  const size = calcularTamanhoMarcador(controller, anyMarker);
  const animClass = controller.context.config.enableAnimations ? 'cad-pt-anim' : '';
  const markerHtml = getPointShapeHtml(
    anyMarker.shapeStyle,
    size,
    anyMarker.markerBg,
    animClass,
    `map-marker-${anyMarker.layerId || 'pts'}-${pId}`,
    isSelected,
    { densidade: modoDensidade(anyMarker.densTotal || 0) }
  );
  anyMarker.tamanhoPx = size;

  marker.setIcon(L.divIcon({
    html: markerHtml,
    className: `custom-leaflet-marker ${isSelected ? 'cad-marker-selected ponto-selecionado' : ''}`,
    iconSize: [size + 6, size + 6]
  }));
}

/**
 * Sincroniza o destaque dos marcadores com os pontos selecionados (próprios e de vizinhos).
 */
export function atualizarDestaqueMarcadores(controller: any): void {
  const selectedIds = (controller.context.selectedPontoIds || []) as (string | number)[];
  const selectedVizinhos = (controller.canvasInteracao.ctx.selectedVizinhoPontoIds || []) as (string | number)[];
  const allSelected = new Set([
    ...selectedIds.map(String),
    ...selectedVizinhos.map(String)
  ]);

  for (const marker of controller.getMarkers() as L.Marker[]) {
    const anyMarker = marker as any;
    const pId = anyMarker.pontoId;
    if (pId === undefined || pId === null) continue;

    const isSelected = allSelected.has(String(pId));
    if (anyMarker.isSelected === isSelected) continue;
    anyMarker.isSelected = isSelected;

    marker.setZIndexOffset(isSelected ? 2000 : 0);

    if (anyMarker.shapeStyle && anyMarker.baseSize && anyMarker.markerBg) {
      recriarIconeMarcador(controller, marker, anyMarker, pId, isSelected);
    }

    const el = marker.getElement();
    if (el) {
      if (isSelected) {
        el.classList.add('cad-marker-selected', 'ponto-selecionado');
      } else {
        el.classList.remove('cad-marker-selected', 'ponto-selecionado');
      }
    }
  }
}
