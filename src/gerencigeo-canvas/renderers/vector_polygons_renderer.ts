import L from 'leaflet';
import type { ILayerRenderer } from '../layer_renderer_factory';
import type { CanvasLayerDef, CanvasRenderContext, Confrontante } from '../types';
import { escapeHtml, parseCoordenada } from '../utils';

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
    const confrontantes = (layerDef.dados?.confrontantes || context.confrontantes || []) as Confrontante[];
    const isInteractive = layerDef.interativo && !layerDef.bloqueada;
    const color = layerDef.estilo.corPrimaria || '#a855f7';
    const weight = layerDef.estilo.espessuraLinha || 1.5;
    const opacity = layerDef.opacidade !== undefined ? layerDef.opacidade : 0.8;

    confrontantes.forEach(c => {
      if (!c) return;

      // 1. Renderiza polígono WKT com suporte a anéis interiores (buracos)
      if (c.poligono_wkt) {
        const matches = [...c.poligono_wkt.matchAll(/\(([^()]+)\)/g)];
        if (matches.length > 0) {
          const nomePropriedade = escapeHtml(c.nome_propriedade || 'Propriedade Vizinha');
          const nomeConfrontante = escapeHtml(c.nome || 'Desconhecido');

          // Processa todos os anéis do polígono
          const todosAneis: [number, number][][] = [];

          matches.forEach(match => {
            const coords: [number, number][] = match[1]
              .split(',')
              .map(par => {
                const partes = par.trim().split(/\s+/);
                if (partes.length < 2) return null;
                // WKT padrão: partes[0] = Lon (X), partes[1] = Lat (Y)
                const coord = parseCoordenada(partes[1], partes[0]);
                return coord ? [coord.lat, coord.lon] as [number, number] : null;
              })
              .filter((p): p is [number, number] => p !== null);

            if (coords.length >= 3) {
              todosAneis.push(coords);
            }
          });

          if (todosAneis.length > 0) {
            // Se houver mais de 1 anel (ex: polígono com buraco), passa o array de anéis
            const polyCoords: any = todosAneis.length === 1 ? todosAneis[0] : todosAneis;

            const poligono = L.polygon(polyCoords, {
              color,
              weight,
              opacity,
              dashArray: layerDef.estilo.dashArray || '4, 6',
              fillColor: color,
              fillOpacity: Math.min(0.2, opacity * 0.15),
              pane: paneName,
              interactive: isInteractive
            });

            if (isInteractive) {
              poligono.bindPopup(`
                <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3; min-width:180px;">
                  <div style="font-weight:700; font-size:12px; color:#c084fc; margin-bottom:3px; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:3px;">Limite de Confrontante</div>
                  <div style="font-size:11px; margin-bottom:2px;"><strong>Propriedade:</strong> ${nomePropriedade}</div>
                  <div style="font-size:11px;"><strong>Proprietário:</strong> ${nomeConfrontante}</div>
                </div>
              `, { className: 'compact-popup', maxWidth: 220 });
            }

            poligono.addTo(group);
          }
        }
      }

      // 2. Se o confrontante contiver pontos individuais, gera marcadores com flag isVizinho para o CAD
      if (c.pontos && c.pontos.length > 0) {
        c.pontos.forEach(p => {
          const coord = parseCoordenada(p.lat ?? (p as any).latitude ?? (p as any).y, p.lon ?? (p as any).lng ?? (p as any).longitude ?? (p as any).x);
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
              marker.bindPopup(`
                <div style="font-family:sans-serif; color:rgba(255, 255, 255, 0.9); line-height:1.3; min-width:170px;">
                  <div style="font-weight:700; font-size:12px; color:#c084fc; margin-bottom:3px;">${escapeHtml(p.nome_vertice || String(p.id))}</div>
                  <div style="font-size:11px; color:rgba(255, 255, 255, 0.65);">Confrontante: ${escapeHtml(c.nome || 'Desconhecido')}</div>
                  <div style="font-size:10px; color:rgba(255, 255, 255, 0.45); font-family:monospace; margin-top:3px;">Lat ${coord.lat.toFixed(6)} &nbsp; Lon ${coord.lon.toFixed(6)}</div>
                </div>
              `, { className: 'compact-popup', maxWidth: 220 });

              marker.on('click', () => {
                if (context.onMarkerClick) {
                  context.onMarkerClick(p.id, true);
                }
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
