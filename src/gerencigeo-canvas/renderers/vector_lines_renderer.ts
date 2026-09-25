import L from 'leaflet';
import type { ILayerRenderer } from '../layer_renderer_factory';
import type { CanvasLayerDef, CanvasRenderContext, Segmento } from '../types';
import {
  escapeHtml,
  parseCoordenada,
  renderPopupAcoesHtml,
  bindPopupAcoesEvents,
  agruparPontosPorChave,
  ordenarPontosPorSequencia
} from '../utils';

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
    const isHomologadoLayer = layerDef.id === 'homologados';
    const conexoesRaw = layerDef.dados?.conexoes ?? (Array.isArray(layerDef.dados) && layerDef.dados.length > 0 && ('origemId' in layerDef.dados[0]) ? layerDef.dados : null);
    const segmentos = (layerDef.dados?.segmentos || context.segmentos || []) as Segmento[];
    const pontosOriginais = (layerDef.dados?.pontos || (isHomologadoLayer ? (context.bancoPontos || []) : context.pontos) || []) as any[];
    const weight = this.calculateWeight(layerDef, map, context);
    const opacity = layerDef.opacidade !== undefined ? layerDef.opacidade : 1.0;
    const isInteractive = layerDef.interativo && !layerDef.bloqueada;

    // Normaliza pontos com parseCoordenada
    const pontos: any[] = [];
    pontosOriginais.forEach(p => {
      const coord = parseCoordenada(p.lat ?? p.latitude ?? p.y, p.lon ?? p.lng ?? p.longitude ?? p.x);
      if (coord) {
        pontos.push({ ...p, lat: coord.lat, lon: coord.lon });
      }
    });

    // Função auxiliar para encontrar ponto por ID em diferentes escopos
    const findPonto = (id: string | number) => {
      const p = pontos.find(item => String(item.id) === String(id));
      if (p) return p;
      if (context.pontos) {
        const cp = context.pontos.find(item => String(item.id) === String(id));
        if (cp) {
          const coord = parseCoordenada(cp.lat, cp.lon);
          if (coord) return { ...cp, lat: coord.lat, lon: coord.lon };
        }
      }
      return null;
    };

    // 1. Plota Conexoes CAD agnósticas ({ origemId, destinoId, tipoLinha?, estilo? })
    if (conexoesRaw && Array.isArray(conexoesRaw)) {
      conexoesRaw.forEach((c: any) => {
        const pIni = findPonto(c.origemId);
        const pFim = findPonto(c.destinoId);

        if (pIni && pFim && pIni.lat && pIni.lon && pFim.lat && pFim.lon) {
          const isDashed = c.tipoLinha === 'tracejada' || c.estilo?.tipoLinha === 'tracejada';
          const color = c.estilo?.cor || c.estilo?.color || layerDef.estilo.corPrimaria || '#00f5a0';
          const lineWeight = c.estilo?.espessura || c.estilo?.weight || weight;

          const polyline = L.polyline([[pIni.lat, pIni.lon], [pFim.lat, pFim.lon]], {
            color,
            weight: lineWeight,
            opacity: c.estilo?.opacidade ?? opacity,
            dashArray: isDashed ? '6, 6' : layerDef.estilo.dashArray,
            pane: paneName,
            interactive: isInteractive
          });

          if (isInteractive) {
            const acoes = c.acoes || layerDef.acoes || layerDef.dados?.acoes || [];
            const conexaoId = `${c.origemId}-${c.destinoId}`;
            const acoesHtml = renderPopupAcoesHtml(acoes, conexaoId);

            polyline.bindPopup(`
              <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3;">
                <div style="font-weight:700; font-size:12px; margin-bottom:3px; color:#ffffff;">Conexão ${escapeHtml(String(c.origemId))} ↔ ${escapeHtml(String(c.destinoId))}</div>
                <div style="font-size:11px; color:rgba(255, 255, 255, 0.65);">Tipo: ${escapeHtml(c.tipoLinha || 'contínua')}</div>
                ${acoesHtml}
              </div>
            `, { className: 'compact-popup', maxWidth: 220 });

            polyline.on('popupopen', (e: any) => {
              if (context.modoSequencial) {
                polyline.closePopup();
                return;
              }
              bindPopupAcoesEvents(e.popup, c, context, polyline);
            });
          }

          polyline.addTo(group);
        }
      });
      return;
    }

    // 2. Plota Polilinha Sequencial Agnóstica (P1 -> P2 -> ... -> Pn com fechamento opcional por grupo)
    if (layerDef.dados?.polilinhaSequencial || (layerDef.dados?.fechar !== undefined && pontos.length >= 2)) {
      const chaveGrupo = layerDef.dados?.chaveGrupo || context.chaveGrupo;
      const grupos = agruparPontosPorChave(pontos, chaveGrupo);
      const fechar = layerDef.dados?.fechar !== false;
      const color = layerDef.estilo.corPrimaria || '#00f5a0';

      Object.entries(grupos).forEach(([grupoKey, grupoPontos]) => {
        const sortedPontos = ordenarPontosPorSequencia(grupoPontos);
        if (sortedPontos.length < 2) return;

        const latLngs: [number, number][] = sortedPontos.map(p => [p.lat as number, p.lon as number]);

        const polylineCorpo = L.polyline(latLngs, {
          color,
          weight,
          opacity,
          dashArray: layerDef.estilo.dashArray,
          pane: paneName,
          interactive: isInteractive
        });

        if (isInteractive) {
          polylineCorpo.bindPopup(`
            <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3;">
              <div style="font-weight:700; font-size:12px; margin-bottom:3px; color:#ffffff;">Polilinha: Grupo ${escapeHtml(grupoKey)}</div>
              <div style="font-size:11px; color:rgba(255, 255, 255, 0.65);">Vértices: ${sortedPontos.length}</div>
            </div>
          `, { className: 'compact-popup', maxWidth: 220 });
        }

        polylineCorpo.addTo(group);

        // Se a opção de fechamento estiver ativa, conectar o último ponto ao primeiro ponto do mesmo grupo em linha tracejada
        if (fechar && latLngs.length >= 3) {
          const pLast = latLngs[latLngs.length - 1];
          const pFirst = latLngs[0];
          const polylineClose = L.polyline([pLast, pFirst], {
            color,
            weight,
            opacity,
            dashArray: '4, 4',
            pane: paneName,
            interactive: isInteractive
          });
          polylineClose.addTo(group);
        }
      });
      return;
    }

    // 3. Plota segmentos reais vinculados legados (se não for camada de homologados sem segmentos)
    if (!isHomologadoLayer && segmentos && segmentos.length > 0) {
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
            const acoes = (s as any).acoes || layerDef.acoes || layerDef.dados?.acoes || [];
            const segmentoId = `${s.ponto_inicio_id}-${s.ponto_fim_id}`;
            const acoesHtml = renderPopupAcoesHtml(acoes, segmentoId);

            polyline.bindPopup(`
              <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3;">
                <div style="font-weight:700; font-size:12px; margin-bottom:3px; color:#ffffff;">${escapeHtml(pIni.nome_vertice)} ↔ ${escapeHtml(pFim.nome_vertice)}</div>
                <div style="font-size:11px; color:rgba(255, 255, 255, 0.65);">Limite: ${escapeHtml(tipoLim || 'N/A')} · ${escapeHtml(metodoPos || 'N/A')}</div>
                ${acoesHtml}
              </div>
            `, {
              className: 'compact-popup',
              maxWidth: 220
            });

            polyline.on('popupopen', (e: any) => {
              if (context.modoSequencial) {
                polyline.closePopup();
                return;
              }
              bindPopupAcoesEvents(e.popup, s, context, polyline);
            });
          }

          polyline.addTo(group);
        }
      });
    } else if (pontos && pontos.length >= 2) {
      // 3. Plota polilinhas contínuas otimizadas por grupo com fechamento
      const validPoints = pontos.filter(
        p => p.lat && p.lon && p.tipo_ponto !== 'B' && p.tipo !== 'B' && p.ignorar_poligono !== 1
      );

      const chaveGrupo = layerDef.dados?.chaveGrupo || context.chaveGrupo;
      const grupos = agruparPontosPorChave(validPoints, chaveGrupo);

      const color = layerDef.estilo.corPrimaria || (isHomologadoLayer ? '#f59e0b' : '#10b981');
      const dashArray = layerDef.estilo.dashArray || (isHomologadoLayer ? '6, 8' : undefined);

      Object.values(grupos).forEach(grupoPontos => {
        const sortedPontos = ordenarPontosPorSequencia(grupoPontos);
        if (sortedPontos.length < 2) return;

        // Otimização: traçado unificado contínuo (1 único polyline para o corpo inteiro)
        const latLngs: [number, number][] = sortedPontos.map(p => [p.lat as number, p.lon as number]);

        const polylineCorpo = L.polyline(latLngs, {
          color,
          weight,
          opacity,
          dashArray,
          pane: paneName,
          interactive: isInteractive
        });
        polylineCorpo.addTo(group);

        // Fechamento de perímetro do grupo (último -> primeiro do mesmo grupo)
        if (latLngs.length >= 3) {
          const pLast = latLngs[latLngs.length - 1];
          const pFirst = latLngs[0];
          const polylineClose = L.polyline([pLast, pFirst], {
            color,
            weight,
            opacity,
            dashArray: isHomologadoLayer ? '6, 8' : '4, 4',
            pane: paneName,
            interactive: isInteractive
          });
          polylineClose.addTo(group);
        }
      });
    }
  }

  public update(layerDef: CanvasLayerDef, layerInstance: L.LayerGroup, changes: Partial<CanvasLayerDef>, context: CanvasRenderContext, map: L.Map): void {
    const onlyOpacity = changes.opacidade !== undefined &&
      changes.estilo === undefined &&
      changes.dados === undefined;

    if (onlyOpacity) {
      // O LayerManager já atualiza o pane.style.opacity de forma O(1).
      return;
    }

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
