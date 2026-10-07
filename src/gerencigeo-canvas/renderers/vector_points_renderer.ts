import L from 'leaflet';
import type { ILayerRenderer } from '../layer_renderer_factory';
import type { CanvasLayerDef, CanvasRenderContext, Ponto } from '../types';
import { escapeHtml, renderPopupAcoesHtml, bindPopupAcoesEvents } from '../utils';
import { getPointShapeHtml, fatorDensidade, modoDensidade } from '../mapa_pontos_shapes';

export class VectorPointsLayerRenderer implements ILayerRenderer {
  private zoomListenerMap = new WeakMap<L.LayerGroup, () => void>();

  public render(layerDef: CanvasLayerDef, map: L.Map, context: CanvasRenderContext): L.LayerGroup {
    const group = L.layerGroup();
    const paneName = `pane-${layerDef.id}`;

    this.rebuildPoints(layerDef, group, map, context, paneName);

    const zoomCallback = () => {
      group.eachLayer((marker: any) => {
        if (!(marker.setIcon && marker.baseSize && marker.shapeStyle && marker.markerBg && marker.pontoId !== undefined)) return;
        const total = marker.densTotal || 0;
        if (layerDef.estilo.scaleMode !== 'world' && modoDensidade(total) !== 'compacta') return;

        const size = this.calculateSize(layerDef, map, context, marker.baseSize, total);
        if (size === marker.tamanhoPx) return;
        marker.tamanhoPx = size;
        marker.setIcon(this.criarIcone(layerDef, context, marker.shapeStyle, size, marker.markerBg, marker.pontoId, !!marker.isSelected, total));
      });
    };

    map.on('zoomend', zoomCallback);
    this.zoomListenerMap.set(group, zoomCallback);

    return group;
  }

  private criarIcone(
    layerDef: CanvasLayerDef,
    context: CanvasRenderContext,
    shapeStyle: string,
    size: number,
    markerBg: string,
    pontoId: string | number,
    isSelected: boolean,
    total: number
  ): L.DivIcon {
    const animClass = context.config.enableAnimations ? 'cad-pt-anim' : '';
    const html = getPointShapeHtml(
      shapeStyle,
      size,
      markerBg,
      animClass,
      `map-marker-${layerDef.id}-${pontoId}`,
      isSelected,
      { densidade: modoDensidade(total) }
    );
    return L.divIcon({
      html,
      className: `custom-leaflet-marker ${isSelected ? 'cad-marker-selected' : ''}`.trim(),
      iconSize: [size + 6, size + 6]
    });
  }

  private calculateSize(layerDef: CanvasLayerDef, map: L.Map, context: CanvasRenderContext, baseSize: number, total: number = 0): number {
    const multiplier = context.graphicScale.markerScaleMultiplier || 1.0;

    if (layerDef.estilo.scaleMode === 'world') {
      const dimMetros = layerDef.estilo.dimensaoMetros || 0.25; // 25cm padrão
      const center = map.getCenter();
      const zoom = map.getZoom();
      const metersPerPixel = (40075016.686 * Math.abs(Math.cos((center.lat * Math.PI) / 180))) / Math.pow(2, zoom + 8);
      const px = dimMetros / (metersPerPixel > 0 ? metersPerPixel : 1);
      return Math.max(3, Math.round(px * multiplier));
    }

    const fator = fatorDensidade(total, map.getZoom());
    return Math.max(fator < 1 ? 5 : 4, Math.round(baseSize * multiplier * fator));
  }

  private rebuildPoints(
    layerDef: CanvasLayerDef,
    group: L.LayerGroup,
    map: L.Map,
    context: CanvasRenderContext,
    paneName: string
  ): void {
    const isHomologadoPontosLayer = layerDef.id === 'homologados-pontos';
    const pontos = isHomologadoPontosLayer
      ? ((context as any).bancoPontos || []) as Ponto[]
      : (layerDef.dados?.pontos || context.pontos || []) as Ponto[];
    const isInteractive = layerDef.interativo && !layerDef.bloqueada;
    const isVizinhoLayer = layerDef.id === 'vizinhos';
    const isHomologadoLayer = layerDef.id === 'homologados' || layerDef.id === 'homologados-pontos';

    const selectedIds = ((context as any).selectedPontoIds || []) as (string | number)[];
    const total = pontos.length;

    pontos.forEach(p => {
      const lat = p.lat ?? (p as any).latitude;
      const lon = p.lon ?? (p as any).lng ?? (p as any).longitude;

      if (lat !== undefined && lon !== undefined && lat !== 0 && lon !== 0 && !isNaN(Number(lat)) && !isNaN(Number(lon))) {
        const isBaseFisica = p.tipo_ponto === 'B' || p.tipo === 'B';
        const isBasePPP = p.tipo_ponto === 'M' || p.tipo === 'M';

        let shapeStyle = layerDef.estilo.estiloMarcador || 'x';
        let markerBg = layerDef.estilo.corPrimaria || 'bg-mint-vibrant';
        let baseSize = layerDef.estilo.tamanhoMarcador || 7;

        if (isHomologadoLayer) {
          shapeStyle = 'circle';
          markerBg = layerDef.estilo.corPrimaria || '#f59e0b';
          baseSize = 8;
        } else if (isVizinhoLayer) {
          shapeStyle = isBasePPP ? 'circle-dot' : (layerDef.estilo.estiloMarcador || 'cross');
          markerBg = layerDef.estilo.corPrimaria || '#a855f7';
          baseSize = isBasePPP ? 10 : 8;
        } else if (isBasePPP) {
          markerBg = '#6366f1';
          shapeStyle = 'circle-dot';
          baseSize = 10;
        } else if (isBaseFisica) {
          markerBg = '#f43f5e';
          shapeStyle = 'square';
          baseSize = 9;
        }

        const isSelected = Boolean(
          (p as any).selecionado ||
          (selectedIds.length > 0 && (selectedIds.includes(p.id) || selectedIds.includes(String(p.id)) || selectedIds.includes(Number(p.id))))
        );

        const size = this.calculateSize(layerDef, map, context, baseSize, total);
        const customIcon = this.criarIcone(layerDef, context, shapeStyle, size, markerBg, p.id, isSelected, total);

        const marker = L.marker([Number(lat), Number(lon)], {
          icon: customIcon,
          pane: paneName,
          interactive: isInteractive
        });

        if (isSelected) {
          marker.setZIndexOffset(2000);
        }

        (marker as any).pontoId = p.id;
        (marker as any).layerId = layerDef.id;
        (marker as any).isVizinho = isVizinhoLayer;
        (marker as any).baseSize = baseSize;
        (marker as any).shapeStyle = shapeStyle;
        (marker as any).markerBg = markerBg;
        (marker as any).isSelected = isSelected;
        (marker as any).densTotal = total;
        (marker as any).tamanhoPx = size;

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

          const acoes = p.acoes || layerDef.acoes || layerDef.dados?.acoes || [];
          const acoesHtml = renderPopupAcoesHtml(acoes, p.id);

          marker.bindPopup(`
            <div style="font-family:var(--ui-fonte-base, sans-serif); color:rgba(255, 255, 255, 0.9); line-height:1.3;">
              <div style="font-weight:700; font-size:13px; margin-bottom:4px; color:#ffffff;">${escapeHtml(p.nome_vertice || String(p.id))}</div>
              <div style="font-size:11px; color:rgba(255, 255, 255, 0.65);">${escapeHtml(popupRole)} · ${escapeHtml(p.tipo_ponto || p.tipo || 'Vértice')}</div>
              <div style="font-size:11px; color:rgba(255, 255, 255, 0.45); font-family:var(--ui-fonte-codigo, monospace); margin-top:4px;">Lat ${Number(lat).toFixed(6)} &nbsp; Lon ${Number(lon).toFixed(6)}</div>
              ${acoesHtml}
            </div>
          `, {
            className: 'compact-popup',
            maxWidth: 240
          });

          if (acoes && acoes.length > 0) {
            marker.on('popupopen', (e: any) => {
              bindPopupAcoesEvents(e.popup, p, context, marker);
            });
          }

          marker.on('click', () => {
            if (context.onMarkerClick) {
              context.onMarkerClick(p.id, isVizinhoLayer, p, { lat: Number(lat), lon: Number(lon) });
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
