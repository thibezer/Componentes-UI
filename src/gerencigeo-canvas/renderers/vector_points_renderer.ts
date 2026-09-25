import L from 'leaflet';
import type { ILayerRenderer } from '../layer_renderer_factory';
import type { CanvasLayerDef, CanvasRenderContext } from '../types';
import { escapeHtml, parseCoordenada, renderPopupAcoesHtml, bindPopupAcoesEvents } from '../utils';
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
      // Garante legibilidade mínima em zoom baixo (ao menos o baseSize) e expande metricamente em zoom alto
      return Math.max(baseSize, Math.round(px * multiplier));
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
    const isHomologadoLayer = layerDef.id === 'homologados' || layerDef.id === 'homologados-pontos';
    const isVizinhoLayer = layerDef.id === 'vizinhos';
    const pontosRaw = layerDef.dados?.pontos ?? (Array.isArray(layerDef.dados) ? layerDef.dados : null);
    const pontos = (pontosRaw || (isHomologadoLayer ? (context.bancoPontos || []) : context.pontos) || []) as any[];
    const isInteractive = layerDef.interativo && !layerDef.bloqueada;

    pontos.forEach(p => {
      const rawLat = p.lat ?? (p as any).latitude ?? (p as any).y;
      const rawLon = p.lon ?? (p as any).lng ?? (p as any).longitude ?? (p as any).x;
      const coord = parseCoordenada(rawLat, rawLon);

      if (coord) {
        const { lat, lon } = coord;
        const isBaseFisica = p.tipo_ponto === 'B' || p.tipo === 'B';
        const isBasePPP = p.tipo_ponto === 'M' || p.tipo === 'M';

        let shapeStyle = p.estilo || layerDef.estilo.estiloMarcador || 'circle';
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
          let popupContent = '';
          const acoes = p.acoes || layerDef.acoes || layerDef.dados?.acoes || [];
          const acoesHtml = renderPopupAcoesHtml(acoes, p.id);

          if (p.metadados && Object.keys(p.metadados).length > 0) {
            const metas = Object.entries(p.metadados)
              .map(([k, v]) => `<div style="font-size:11px; margin-bottom:2px;"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</div>`)
              .join('');
            popupContent = `
              <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.35; min-width:160px;">
                <div style="font-weight:700; font-size:12px; margin-bottom:4px; color:#ffffff;">Ponto ${escapeHtml(String(p.id))}</div>
                ${metas}
                <div style="font-size:10px; color:rgba(255, 255, 255, 0.45); font-family:monospace; margin-top:3px;">Lat ${lat.toFixed(6)} &nbsp; Lon ${lon.toFixed(6)}</div>
                ${acoesHtml}
              </div>
            `;
          } else {
            const popupRole = isHomologadoLayer
              ? 'Vértice Homologado SIGEF'
              : isVizinhoLayer
              ? 'Confrontante (Importado)'
              : isBasePPP
              ? 'Base Homologada PPP'
              : isBaseFisica
              ? 'Base de Campo (Translação)'
              : 'Nó / Vértice';

            const title = escapeHtml((p as any).codigo_completo || p.nome_vertice || `Ponto ${String(p.id)}`);
            const este = typeof (p as any).este === 'number' ? `Este (E): ${(p as any).este.toFixed(2)} m` : '';
            const norte = typeof (p as any).norte === 'number' ? `Norte (N): ${(p as any).norte.toFixed(2)} m` : '';
            const alt = typeof (p as any).altitude === 'number' ? `Alt (h): ${(p as any).altitude.toFixed(2)} m` : '';

            popupContent = `
              <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.35; min-width:170px;">
                <div style="font-weight:700; font-size:13px; margin-bottom:4px; color:${isHomologadoLayer ? '#fbbf24' : '#ffffff'};">${title}</div>
                <div style="font-size:11px; color:rgba(255, 255, 255, 0.65);">${escapeHtml(popupRole)} · ${escapeHtml(p.tipo_ponto || p.tipo || 'Ponto')}</div>
                ${este || norte ? `<div style="font-size:10px; color:rgba(255, 255, 255, 0.7); font-family:monospace; margin-top:3px;">${este} ${norte}</div>` : ''}
                ${alt ? `<div style="font-size:10px; color:rgba(255, 255, 255, 0.7); font-family:monospace;">${alt}</div>` : ''}
                <div style="font-size:10px; color:rgba(255, 255, 255, 0.45); font-family:monospace; margin-top:3px;">Lat ${lat.toFixed(6)} &nbsp; Lon ${lon.toFixed(6)}</div>
                ${acoesHtml}
              </div>
            `;
          }

          marker.bindPopup(popupContent, {
            className: 'compact-popup',
            maxWidth: 240
          });

          marker.on('click', () => {
            if (context.modoSequencial) {
              marker.closePopup();
            }
            if (layerDef.dados?.onClique) {
              try {
                layerDef.dados.onClique(p);
              } catch (err) {
                console.error('Erro no callback onClique do ponto:', err);
              }
            }
            if (context.onMarkerClick) {
              context.onMarkerClick(p.id, isVizinhoLayer, p, { lat, lon });
            }
          });

          marker.on('popupopen', (e: any) => {
            if (context.modoSequencial) {
              marker.closePopup();
              return;
            }
            bindPopupAcoesEvents(e.popup, p, context, marker);
          });
        }

        marker.addTo(group);
      }
    });
  }

  public update(layerDef: CanvasLayerDef, layerInstance: L.LayerGroup, changes: Partial<CanvasLayerDef>, context: CanvasRenderContext, map: L.Map): void {
    const onlyOpacity = changes.opacidade !== undefined &&
      changes.estilo === undefined &&
      changes.dados === undefined &&
      changes.interativo === undefined &&
      changes.bloqueada === undefined;

    if (onlyOpacity) {
      // O LayerManager já atualiza o pane.style.opacity de forma O(1).
      // Evita recriar nós DOM e ícones ao deslizar controles de opacidade.
      return;
    }

    if (changes.estilo !== undefined || changes.dados !== undefined || changes.interativo !== undefined || changes.bloqueada !== undefined || changes.opacidade !== undefined) {
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
