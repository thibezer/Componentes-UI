import L from 'leaflet';
import type { ILayerRenderer } from '../layer_renderer_factory';
import type { CanvasLayerDef, CanvasRenderContext, Ponto, Segmento } from '../types';
import { escapeHtml } from '../utils';

export class VectorLinesLayerRenderer implements ILayerRenderer {
  private zoomListenerMap = new WeakMap<L.LayerGroup, () => void>();

  public render(layerDef: CanvasLayerDef, map: L.Map, context: CanvasRenderContext): L.LayerGroup {
    const group = L.layerGroup();
    const paneName = `pane-${layerDef.id}`;

    this.rebuildLines(layerDef, group, map, context, paneName);

    // Se a camada estiver em modo 'world', atualiza espessura no zoom
    const zoomCallback = () => {
      if (layerDef.estilo.scaleMode === 'world') {
        const newWeight = this.calculateWeight(layerDef, map, context);
        group.eachLayer((layer: any) => {
          if (layer.setStyle) layer.setStyle({ weight: newWeight });
        });
      }
    };

    map.on('zoomend', zoomCallback);
    this.zoomListenerMap.set(group, zoomCallback);

    return group;
  }

  private calculateWeight(layerDef: CanvasLayerDef, map: L.Map, context: CanvasRenderContext): number {
    const baseWeight = layerDef.estilo.espessuraLinha || context.config.perimetroWeight || 2;
    const multiplier = context.graphicScale.lineScaleMultiplier || 1.0;

    if (layerDef.estilo.scaleMode === 'world') {
      const dimMetros = layerDef.estilo.dimensaoMetros || 0.3; // 30cm padrão
      const center = map.getCenter();
      const zoom = map.getZoom();
      // Resolução aproximada em metros por pixel no equador ajustado pela latitude
      const metersPerPixel = (40075016.686 * Math.abs(Math.cos((center.lat * Math.PI) / 180))) / Math.pow(2, zoom + 8);
      const px = dimMetros / (metersPerPixel > 0 ? metersPerPixel : 1);
      return Math.max(1, Math.round(px * multiplier));
    }

    return Math.max(1, Math.round(baseWeight * multiplier));
  }

  private rebuildLines(
    layerDef: CanvasLayerDef,
    group: L.LayerGroup,
    map: L.Map,
    context: CanvasRenderContext,
    paneName: string
  ): void {
    const segmentos = (layerDef.dados?.segmentos || context.segmentos || []) as Segmento[];
    const pontos = (layerDef.dados?.pontos || context.pontos || []) as Ponto[];
    const weight = this.calculateWeight(layerDef, map, context);
    const opacity = layerDef.opacidade !== undefined ? layerDef.opacidade : 1.0;
    const isInteractive = layerDef.interativo && !layerDef.bloqueada;

    // 1. Plota segmentos reais vinculados
    if (segmentos && segmentos.length > 0) {
      segmentos.forEach(s => {
        const pIni = pontos.find(p => String(p.id) === String(s.ponto_inicio_id));
        const pFim = pontos.find(p => String(p.id) === String(s.ponto_fim_id));

        if (pIni && pFim && pIni.lat && pIni.lon && pFim.lat && pFim.lon) {
          const tipoLim = s.tipo_limite_sigef || s.tipo_limite || '';
          const metodoPos = s.metodo_posicionamento_sigef || s.metodo_posicionamento || '';
          const defaultColor = tipoLim === 'LA1' ? '#10b981' : (tipoLim === 'LN1' ? '#3b82f6' : '#00f5a0');
          const color = layerDef.estilo.corPrimaria || defaultColor;

          const polyline = L.polyline([[pIni.lat, pIni.lon], [pFim.lat, pFim.lon]], {
            color,
            weight,
            opacity,
            dashArray: tipoLim === 'LN1' ? '6, 6' : layerDef.estilo.dashArray,
            pane: paneName,
            interactive: isInteractive
          });

          if (isInteractive) {
            polyline.bindPopup(`
              <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3;">
                <div style="font-weight:700; font-size:12px; margin-bottom:3px; color:#ffffff;">${escapeHtml(pIni.nome_vertice)} ↔ ${escapeHtml(pFim.nome_vertice)}</div>
                <div style="font-size:11px; color:rgba(255, 255, 255, 0.65);">Limite: ${escapeHtml(tipoLim || 'N/A')} · ${escapeHtml(metodoPos || 'N/A')}</div>
              </div>
            `, {
              className: 'compact-popup',
              maxWidth: 220
            });
          }

          polyline.addTo(group);
        }
      });
    } else if (pontos && pontos.length >= 2) {
      // 2. Plota polilinha sequencial temporária fechada com agrupamento inteligente por matrícula
      const validPoints = pontos.filter(
        p => p.lat && p.lon && p.lat !== 0 && p.lon !== 0 && p.tipo_ponto !== 'B' && p.tipo !== 'B' && p.ignorar_poligono !== 1
      );

      const grupos: { [key: string]: Ponto[] } = {};
      validPoints.forEach(p => {
        const key = p.matricula_id != null ? `mat_${p.matricula_id}` : (p.planilha_origem || 'default');
        if (!grupos[key]) grupos[key] = [];
        grupos[key].push(p);
      });

      const color = layerDef.estilo.corPrimaria || '#10b981';

      Object.values(grupos).forEach(grupoPontos => {
        grupoPontos.sort((a, b) => Number(a.ordem_caminhamento ?? 999999) - Number(b.ordem_caminhamento ?? 999999));
        if (grupoPontos.length < 2) return;

        for (let i = 0; i < grupoPontos.length - 1; i++) {
          const pIni = grupoPontos[i];
          const pFim = grupoPontos[i + 1];
          const polyline = L.polyline([[pIni.lat as number, pIni.lon as number], [pFim.lat as number, pFim.lon as number]], {
            color,
            weight,
            opacity,
            pane: paneName,
            interactive: isInteractive
          });
          polyline.addTo(group);
        }

        // Fechamento de perímetro
        const pLast = grupoPontos[grupoPontos.length - 1];
        const pFirst = grupoPontos[0];
        const polylineClose = L.polyline([[pLast.lat as number, pLast.lon as number], [pFirst.lat as number, pFirst.lon as number]], {
          color,
          weight,
          opacity,
          dashArray: '4, 4',
          pane: paneName,
          interactive: isInteractive
        });
        polylineClose.addTo(group);
      });
    }
  }

  public update(layerDef: CanvasLayerDef, layerInstance: L.LayerGroup, changes: Partial<CanvasLayerDef>, context: CanvasRenderContext, map: L.Map): void {
    if (changes.opacidade !== undefined || changes.estilo !== undefined || changes.dados !== undefined) {
      layerInstance.clearLayers();
      this.rebuildLines(layerDef, layerInstance, map, context, `pane-${layerDef.id}`);
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
