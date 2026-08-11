import L from 'leaflet';
import type { ILayerRenderer } from '../layer_renderer_factory';
import type { CanvasLayerDef, CanvasRenderContext, Confrontante } from '../types';
import { escapeHtml } from '../utils';

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
      if (!c || !c.poligono_wkt) return;

      const match = /POLYGON\s*\(\s*\(\s*(.*?)\s*\)\s*\)/i.exec(c.poligono_wkt);
      if (!match) return;

      const coords: L.LatLngExpression[] = match[1]
        .split(',')
        .map(par => {
          const partes = par.trim().split(/\s+/);
          const lon = parseFloat(partes[0]);
          const lat = parseFloat(partes[1]);
          return (!isNaN(lat) && !isNaN(lon)) ? [lat, lon] as L.LatLngExpression : null;
        })
        .filter((p): p is L.LatLngExpression => p !== null);

      if (coords.length < 3) return;

      const nomePropriedade = escapeHtml(c.nome_propriedade || 'Propriedade Vizinha');
      const nomeConfrontante = escapeHtml(c.nome || 'Desconhecido');

      const poligono = L.polygon(coords, {
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
    });
  }

  public update(layerDef: CanvasLayerDef, layerInstance: L.LayerGroup, changes: Partial<CanvasLayerDef>, context: CanvasRenderContext): void {
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
