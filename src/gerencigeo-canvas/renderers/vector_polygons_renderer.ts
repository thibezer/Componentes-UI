import L from 'leaflet';
import type { ILayerRenderer } from '../layer_renderer_factory';
import type { CanvasLayerDef, CanvasRenderContext } from '../types';
import { escapeHtml, parseCoordenada, renderPopupAcoesHtml, bindPopupAcoesEvents } from '../utils';

export class VectorPolygonsLayerRenderer implements ILayerRenderer {
  public render(layerDef: CanvasLayerDef, _map: L.Map, context: CanvasRenderContext): L.LayerGroup {
    const group = L.layerGroup();
    const paneName = `pane-${layerDef.id}`;
    this.rebuildPolygons(layerDef, group, context, paneName);
    return group;
  }

  private rebuildPolygons(
    layerDef: CanvasLayerDef,
    group: L.LayerGroup,
    context: CanvasRenderContext,
    paneName: string
  ): void {
    const poligonosRaw = layerDef.dados?.poligonos ?? (Array.isArray(layerDef.dados) ? layerDef.dados : null);
    const confrontantes = (poligonosRaw || layerDef.dados?.confrontantes || context.confrontantes || []) as any[];
    const isInteractive = layerDef.interativo && !layerDef.bloqueada;
    const defaultColor = layerDef.estilo.corPrimaria || '#a855f7';
    const defaultWeight = layerDef.estilo.espessuraLinha || 1.5;
    const defaultOpacity = layerDef.opacidade !== undefined ? layerDef.opacidade : 0.8;

    confrontantes.forEach(c => {
      if (!c) return;

      const polyColor = c.estilo?.cor || c.estilo?.color || defaultColor;
      const polyWeight = c.estilo?.espessura || c.estilo?.weight || defaultWeight;
      const polyOpacity = c.estilo?.opacidade ?? defaultOpacity;
      const polyFillColor = c.estilo?.fillColor || polyColor;
      const polyFillOpacity = c.estilo?.fillOpacity ?? Math.min(0.2, polyOpacity * 0.15);
      const polyDash = c.estilo?.dashArray || layerDef.estilo.dashArray || '4, 6';

      // 1. Renderiza a partir de coordenadas explícitas (PoligonoCAD: number[][] | [number, number][])
      if (c.coordenadas && Array.isArray(c.coordenadas) && c.coordenadas.length >= 3) {
        // Verifica se é array simples de pontos ou anéis múltiplos
        const isMultiRing = Array.isArray(c.coordenadas[0]) && Array.isArray(c.coordenadas[0][0]);
        let polyCoords: any;

        if (isMultiRing) {
          polyCoords = c.coordenadas.map((ring: any[]) =>
            ring.map((pt: any) => {
              const parsed = parseCoordenada(pt[0], pt[1]);
              return parsed ? [parsed.lat, parsed.lon] : null;
            }).filter(Boolean)
          );
        } else {
          polyCoords = c.coordenadas.map((pt: any) => {
            const parsed = parseCoordenada(pt[0], pt[1]);
            return parsed ? [parsed.lat, parsed.lon] : null;
          }).filter(Boolean);
        }

        if (polyCoords && (isMultiRing ? polyCoords[0]?.length >= 3 : polyCoords.length >= 3)) {
          const poligono = L.polygon(polyCoords, {
            color: polyColor,
            weight: polyWeight,
            opacity: polyOpacity,
            dashArray: polyDash,
            fillColor: polyFillColor,
            fillOpacity: polyFillOpacity,
            pane: paneName,
            interactive: isInteractive
          });

          (poligono as any).poligonoId = c.id;
          (poligono as any).layerId = layerDef.id;          if (isInteractive) {
            let metaHtml = '';
            if (c.metadados && Object.keys(c.metadados).length > 0) {
              metaHtml = Object.entries(c.metadados)
                .map(([k, v]) => `<div style="font-size:11px;"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</div>`)
                .join('');
            }
            poligono.bindPopup(`
              <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3; min-width:180px;">
                <div style="font-weight:700; font-size:12px; color:#c084fc; margin-bottom:3px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:3px;">Polígono ${escapeHtml(String(c.id ?? ''))}</div>
                ${metaHtml || `<div style="font-size:11px;">Área vetorial definida por ${c.coordenadas.length} vértices</div>`}
              </div>
            `, { className: 'compact-popup', maxWidth: 220 });

            poligono.on('popupopen', () => {
              if (context.modoSequencial) {
                poligono.closePopup();
              }
            });
          }

          poligono.addTo(group);
          return;
        }
      }

      // 2. Renderiza polígono WKT (ou c.wkt ou c.poligono_wkt) com suporte a anéis interiores (buracos)
      const wktString = c.wkt || c.poligono_wkt;
      if (wktString) {
        const matches = [...wktString.matchAll(/\(([^()]+)\)/g)];
        if (matches.length > 0) {
          const nomePropriedade = escapeHtml(c.nome_propriedade || `Polígono ${String(c.id || '')}`);
          const nomeConfrontante = escapeHtml(c.nome || 'Proprietário');

          const todosAneis: [number, number][][] = [];

          matches.forEach(match => {
            const coords: [number, number][] = match[1]
              .split(',')
              .map((par: string) => {
                const partes = par.trim().split(/\s+/);
                if (partes.length < 2) return null;
                const coord = parseCoordenada(partes[1], partes[0]);
                return coord ? [coord.lat, coord.lon] as [number, number] : null;
              })
              .filter((p: any): p is [number, number] => p !== null);

            if (coords.length >= 3) {
              todosAneis.push(coords);
            }
          });

          if (todosAneis.length > 0) {
            const polyCoords: any = todosAneis.length === 1 ? todosAneis[0] : todosAneis;

            const poligono = L.polygon(polyCoords, {
              color: polyColor,
              weight: polyWeight,
              opacity: polyOpacity,
              dashArray: polyDash,
              fillColor: polyFillColor,
              fillOpacity: polyFillOpacity,
              pane: paneName,
              interactive: isInteractive
            });

            (poligono as any).poligonoId = c.id;
            (poligono as any).layerId = layerDef.id;

            if (isInteractive) {
              const acoes = c.acoes || layerDef.acoes || layerDef.dados?.acoes || [];
              const acoesHtml = renderPopupAcoesHtml(acoes, c.id);

              poligono.bindPopup(`
                <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3; min-width:180px;">
                  <div style="font-weight:700; font-size:12px; color:#c084fc; margin-bottom:3px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:3px;">${nomePropriedade}</div>
                  <div style="font-size:11px; margin-bottom:2px;"><strong>Identificador:</strong> ${escapeHtml(String(c.id ?? ''))}</div>
                  ${c.nome ? `<div style="font-size:11px;"><strong>Proprietário:</strong> ${nomeConfrontante}</div>` : ''}
                  ${acoesHtml}
                </div>
              `, { className: 'compact-popup', maxWidth: 220 });

              poligono.on('popupopen', (e: any) => {
                if (context.modoSequencial) {
                  poligono.closePopup();
                  return;
                }
                bindPopupAcoesEvents(e.popup, c, context, poligono);
              });
            }

            poligono.addTo(group);
          }
        }
      }

      // 3. Se o confrontante contiver pontos individuais, gera marcadores com flag isVizinho para o CAD
      if (c.pontos && c.pontos.length > 0) {
        c.pontos.forEach((p: any) => {
          const coord = parseCoordenada(p.lat ?? p.latitude ?? p.y, p.lon ?? p.lng ?? p.longitude ?? p.x);
          if (coord) {
            const markerIcon = L.divIcon({
              html: `<div style="width:8px; height:8px; background:#a855f7; border-radius:50%; border:1px solid #ffffff; box-shadow:0 0 4px rgba(168,85,247,0.8);"></div>`,
              className: 'custom-leaflet-marker flex items-center justify-center',
              iconSize: [12, 12]
            });
            const marker = L.marker([coord.lat, coord.lon], {
              icon: markerIcon,
              pane: paneName,
              interactive: isInteractive
            });
            (marker as any).pontoId = p.id;
            (marker as any).isVizinho = true;
            (marker as any).layerId = layerDef.id;

            if (isInteractive) {
              const acoesPonto = p.acoes || c.acoes || layerDef.acoes || layerDef.dados?.acoes || [];
              const acoesPontoHtml = renderPopupAcoesHtml(acoesPonto, p.id);

              marker.bindPopup(`
                <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3; min-width:170px;">
                  <div style="font-weight:700; font-size:12px; color:#c084fc; margin-bottom:3px;">${escapeHtml(p.nome_vertice || String(p.id))}</div>
                  <div style="font-size:11px; color:rgba(255, 255, 255, 0.65);">Confrontante: ${escapeHtml(c.nome || 'Desconhecido')}</div>
                  <div style="font-size:10px; color:rgba(255, 255, 255, 0.45); font-family:monospace; margin-top:3px;">Lat ${coord.lat.toFixed(6)} &nbsp; Lon ${coord.lon.toFixed(6)}</div>
                  ${acoesPontoHtml}
                </div>
              `, { className: 'compact-popup', maxWidth: 220 });

              marker.on('click', () => {
                if (context.modoSequencial) {
                  marker.closePopup();
                }
                if (context.onMarkerClick) {
                  context.onMarkerClick(p.id, true, p, { lat: coord.lat, lon: coord.lon });
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
    });
  }

  public update(layerDef: CanvasLayerDef, layerInstance: L.LayerGroup, changes: Partial<CanvasLayerDef>, context: CanvasRenderContext): void {
    const onlyOpacity = changes.opacidade !== undefined &&
      changes.estilo === undefined &&
      changes.dados === undefined &&
      changes.interativo === undefined &&
      changes.bloqueada === undefined;

    if (onlyOpacity) {
      // O LayerManager já atualiza o pane.style.opacity de forma O(1).
      return;
    }

    if (changes.opacidade !== undefined || changes.estilo !== undefined || changes.dados !== undefined || changes.interativo !== undefined || changes.bloqueada !== undefined) {
      layerInstance.clearLayers();
      this.rebuildPolygons(layerDef, layerInstance, context, `pane-${layerDef.id}`);
    }
  }

  public destroy(layerInstance: L.LayerGroup, map: L.Map): void {
    layerInstance.clearLayers();
    if (map.hasLayer(layerInstance)) {
      map.removeLayer(layerInstance);
    }
  }
}
