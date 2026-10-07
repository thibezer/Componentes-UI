import L from 'leaflet';
import type { CanvasLayerDef, CanvasRenderContext, Segmento } from '../types';
import {
  escapeHtml,
  parseCoordenada,
  renderPopupAcoesHtml,
  bindPopupAcoesEvents,
  agruparPontosPorChave,
  ordenarPontosPorSequencia
} from '../utils';

export function calculateLineWeight(layerDef: CanvasLayerDef, map: L.Map, context: CanvasRenderContext): number {
  const baseWeight = layerDef.estilo.espessuraLinha || context.config.perimetroWeight || 2;
  const multiplier = context.graphicScale.lineScaleMultiplier || 1.0;

  if (layerDef.estilo.scaleMode === 'world') {
    const dimMetros = layerDef.estilo.dimensaoMetros || 0.3; // 30cm padrão
    const center = map.getCenter();
    const zoom = map.getZoom();
    const metersPerPixel = (40075016.686 * Math.abs(Math.cos((center.lat * Math.PI) / 180))) / Math.pow(2, zoom + 8);
    const px = dimMetros / (metersPerPixel > 0 ? metersPerPixel : 1);
    return Math.max(1, Math.round(px * multiplier));
  }

  // Padrão CAD: traço fino (1px). Espessuras maiores só quando o usuário define estilo.espessuraLinha
  return Math.max(0.75, Math.round(baseWeight * multiplier * 4) / 4);
}

function addCasingPolyline(
  group: L.LayerGroup,
  coords: any,
  baseWeight: number,
  paneName: string,
  dashArray?: string
): void {
  const casingWeight = baseWeight + 2;
  const casing = L.polyline(coords, {
    color: '#080d0a',
    weight: casingWeight,
    opacity: 0.85,
    lineCap: 'round',
    lineJoin: 'round',
    dashArray: dashArray,
    pane: paneName,
    interactive: false
  });
  casing.addTo(group);
}

export function rebuildVectorLines(
  layerDef: CanvasLayerDef,
  group: L.LayerGroup,
  map: L.Map,
  context: CanvasRenderContext,
  paneName: string
): void {
  const isHomologadoLayer = layerDef.id === 'homologados';
  // Contorno escuro sob a linha: opcional (estilo.contorno). Por padrão o traço é fino, como no CAD.
  const addCasing: typeof addCasingPolyline = (...args) => {
    if (layerDef.estilo.contorno) addCasingPolyline(...args);
  };
  const conexoesRaw = layerDef.dados?.conexoes ?? (Array.isArray(layerDef.dados) && layerDef.dados.length > 0 && ('origemId' in layerDef.dados[0]) ? layerDef.dados : null);
  const segmentos = (layerDef.dados?.segmentos || context.segmentos || []) as Segmento[];
  const pontosOriginais = (layerDef.dados?.pontos || (isHomologadoLayer ? (context.bancoPontos || []) : context.pontos) || []) as any[];
  const weight = calculateLineWeight(layerDef, map, context);
  const opacity = layerDef.opacidade !== undefined ? layerDef.opacidade : 1.0;
  const isInteractive = layerDef.interativo && !layerDef.bloqueada;

  const pontos: any[] = [];
  pontosOriginais.forEach(p => {
    const coord = parseCoordenada(p.lat ?? p.latitude ?? p.y, p.lon ?? p.lng ?? p.longitude ?? p.x);
    if (coord) {
      pontos.push({ ...p, lat: coord.lat, lon: coord.lon });
    }
  });

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
        const coords = [[pIni.lat, pIni.lon], [pFim.lat, pFim.lon]] as [number, number][];
        const dashArray = isDashed ? '6, 6' : layerDef.estilo.dashArray;

        // Casing escuro por baixo para contraste absoluto
        addCasing(group, coords, lineWeight, paneName, dashArray);

        const polyline = L.polyline(coords, {
          color,
          weight: lineWeight,
          opacity: c.estilo?.opacidade ?? opacity,
          dashArray,
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

      // Casing escuro por baixo para contraste absoluto
      addCasing(group, latLngs, weight, paneName, layerDef.estilo.dashArray);

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

      if (fechar && latLngs.length >= 3) {
        const pLast = latLngs[latLngs.length - 1];
        const pFirst = latLngs[0];
        const coordsClose = [pLast, pFirst];

        addCasing(group, coordsClose, weight, paneName, '4, 4');

        const polylineClose = L.polyline(coordsClose, {
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
        const coords = [[pIni.lat, pIni.lon], [pFim.lat, pFim.lon]] as [number, number][];
        const dashArray = tipoLim === 'LN1' ? '6, 6' : layerDef.estilo.dashArray;

        // Casing escuro por baixo para contraste absoluto
        addCasing(group, coords, weight, paneName, dashArray);

        const polyline = L.polyline(coords, {
          color,
          weight,
          opacity,
          dashArray,
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
          `, { className: 'compact-popup', maxWidth: 220 });

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

      const latLngs: [number, number][] = sortedPontos.map(p => [p.lat as number, p.lon as number]);

      // Casing escuro por baixo para contraste absoluto
      addCasing(group, latLngs, weight, paneName, dashArray);

      const polylineCorpo = L.polyline(latLngs, {
        color,
        weight,
        opacity,
        dashArray,
        pane: paneName,
        interactive: isInteractive
      });
      polylineCorpo.addTo(group);

      if (latLngs.length >= 3) {
        const pLast = latLngs[latLngs.length - 1];
        const pFirst = latLngs[0];
        const closeDash = isHomologadoLayer ? '6, 8' : '4, 4';
        const coordsClose = [pLast, pFirst];

        addCasing(group, coordsClose, weight, paneName, closeDash);

        const polylineClose = L.polyline(coordsClose, {
          color,
          weight,
          opacity,
          dashArray: closeDash,
          pane: paneName,
          interactive: isInteractive
        });
        polylineClose.addTo(group);
      }
    });
  }
}
