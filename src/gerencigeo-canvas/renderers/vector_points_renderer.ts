import L from 'leaflet';
import type { ILayerRenderer } from '../layer_renderer_factory';
import type { CanvasLayerDef, CanvasRenderContext, Ponto } from '../types';
import { escapeHtml } from '../utils';
import { getPointShapeHtml } from '../mapa_pontos_shapes';

export class VectorPointsLayerRenderer implements ILayerRenderer {
  private zoomListenerMap = new WeakMap<L.LayerGroup, () => void>();

  public render(layerDef: CanvasLayerDef, map: L.Map, context: CanvasRenderContext): L.LayerGroup {
    const group = L.layerGroup();
    const paneName = `pane-${layerDef.id}`;

    this.rebuildPoints(layerDef, group, map, context, paneName);

    const zoomCallback = () => {
      if (layerDef.estilo.scaleMode === 'world') {
        group.eachLayer((marker: any) => {
          if (marker.setIcon && marker.baseSize && marker.shapeStyle && marker.markerBg && marker.pontoId) {
            const size = this.calculateSize(layerDef, map, context, marker.baseSize);
            const animClass = context.config.enableAnimations ? 'transition-all duration-150' : '';
            const markerHtml = getPointShapeHtml(marker.shapeStyle, size, marker.markerBg, animClass, `map-marker-${layerDef.id}-${marker.pontoId}`);

            const customIcon = L.divIcon({
              html: markerHtml,
              className: 'custom-leaflet-marker flex items-center justify-center',
              iconSize: [size + 6, size + 6]
            });
            marker.setIcon(customIcon);
          }
        });
      }
    };

    map.on('zoomend', zoomCallback);
    this.zoomListenerMap.set(group, zoomCallback);

    return group;
  }

  private calculateSize(layerDef: CanvasLayerDef, map: L.Map, context: CanvasRenderContext, baseSize: number): number {
    const multiplier = context.graphicScale.markerScaleMultiplier || 1.0;

    if (layerDef.estilo.scaleMode === 'world') {
      const dimMetros = layerDef.estilo.dimensaoMetros || 0.25; // 25cm padrão
      const center = map.getCenter();
      const zoom = map.getZoom();
      const metersPerPixel = (40075016.686 * Math.abs(Math.cos((center.lat * Math.PI) / 180))) / Math.pow(2, zoom + 8);
      const px = dimMetros / (metersPerPixel > 0 ? metersPerPixel : 1);
      return Math.max(3, Math.round(px * multiplier));
    }

    return Math.max(4, Math.round(baseSize * multiplier));
  }

  private rebuildPoints(
    layerDef: CanvasLayerDef,
    group: L.LayerGroup,
    map: L.Map,
    context: CanvasRenderContext,
    paneName: string
  ): void {
    const pontos = (layerDef.dados?.pontos || context.pontos || []) as Ponto[];
    const isInteractive = layerDef.interativo && !layerDef.bloqueada;
    const isVizinhoLayer = layerDef.id === 'vizinhos';
    const isHomologadoLayer = layerDef.id === 'homologados';

    pontos.forEach(p => {
      const lat = p.lat ?? (p as any).latitude;
      const lon = p.lon ?? (p as any).lng ?? (p as any).longitude;

      if (lat && lon && lat !== 0 && lon !== 0) {
        const isBaseFisica = p.tipo_ponto === 'B' || p.tipo === 'B';
        const isBasePPP = p.tipo_ponto === 'M' || p.tipo === 'M';

        let shapeStyle = layerDef.estilo.estiloMarcador || 'x';
        let markerBg = 'bg-mint-vibrant';
        let baseSize = layerDef.estilo.tamanhoMarcador || 7;

        if (isHomologadoLayer) {
          shapeStyle = 'circle';
          markerBg = 'bg-amber-500';
          baseSize = 8;
        } else if (isVizinhoLayer) {
          shapeStyle = isBasePPP ? 'circle-dot' : 'cross';
          markerBg = 'bg-[#a855f7]';
          baseSize = isBasePPP ? 10 : 8;
        } else if (isBasePPP) {
          markerBg = 'bg-indigo-500';
          shapeStyle = 'circle-dot';
          baseSize = 10;
        } else if (isBaseFisica) {
          markerBg = 'bg-rose-500';
          shapeStyle = 'square';
          baseSize = 9;
        }

        const size = this.calculateSize(layerDef, map, context, baseSize);
        const animClass = context.config.enableAnimations ? 'transition-all duration-150' : '';
        const markerHtml = getPointShapeHtml(shapeStyle, size, markerBg, animClass, `map-marker-${layerDef.id}-${p.id}`);

        const customIcon = L.divIcon({
          html: markerHtml,
          className: 'custom-leaflet-marker flex items-center justify-center',
          iconSize: [size + 6, size + 6]
        });

        const marker = L.marker([lat, lon], {
          icon: customIcon,
          pane: paneName,
          interactive: isInteractive
        });

        (marker as any).pontoId = p.id;
        (marker as any).layerId = layerDef.id;
        (marker as any).isVizinho = isVizinhoLayer;
        (marker as any).baseSize = baseSize;
        (marker as any).shapeStyle = shapeStyle;
        (marker as any).markerBg = markerBg;

        if (isInteractive) {
          const popupRole = isHomologadoLayer
            ? 'Vértice Homologado SIGEF'
            : isVizinhoLayer
            ? 'Confrontante (Importado)'
            : isBasePPP
            ? 'Base Homologada PPP'
            : isBaseFisica
            ? 'Base de Campo (Translação)'
            : 'Vértice de Perímetro';

          marker.bindPopup(`
            <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3;">
              <div style="font-weight:700; font-size:13px; margin-bottom:4px; color:#ffffff;">${escapeHtml(p.nome_vertice || String(p.id))}</div>
              <div style="font-size:11px; color:rgba(255, 255, 255, 0.65);">${escapeHtml(popupRole)} · ${escapeHtml(p.tipo_ponto || p.tipo || 'Vértice')}</div>
              <div style="font-size:11px; color:rgba(255, 255, 255, 0.45); font-family:monospace; margin-top:4px;">Lat ${Number(lat).toFixed(6)} &nbsp; Lon ${Number(lon).toFixed(6)}</div>
            </div>
          `, {
            className: 'compact-popup',
            maxWidth: 220
          });

          marker.on('click', () => {
            if (context.onMarkerClick) {
              context.onMarkerClick(p.id, isVizinhoLayer);
            }
          });
        }

        marker.addTo(group);
      }
    });
  }

  public update(layerDef: CanvasLayerDef, layerInstance: L.LayerGroup, changes: Partial<CanvasLayerDef>, context: CanvasRenderContext, map: L.Map): void {
    if (changes.opacidade !== undefined || changes.estilo !== undefined || changes.dados !== undefined || changes.interativo !== undefined || changes.bloqueada !== undefined) {
      layerInstance.clearLayers();
      this.rebuildPoints(layerDef, layerInstance, map, context, `pane-${layerDef.id}`);
    }
  }

  public destroy(layerInstance: L.LayerGroup, map: L.Map): void {
    const cb = this.zoomListenerMap.get(layerInstance);
    if (cb) {
      map.off('zoomend', cb);
      this.zoomListenerMap.delete(layerInstance);
    }
    layerInstance.clearLayers();
    if (map.hasLayer(layerInstance)) {
      map.removeLayer(layerInstance);
    }
  }
}
