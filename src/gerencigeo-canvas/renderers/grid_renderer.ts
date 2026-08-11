import L from 'leaflet';
import type { ILayerRenderer } from '../layer_renderer_factory';
import type { CanvasLayerDef, CanvasRenderContext } from '../types';

export class GridLayerRenderer implements ILayerRenderer {
  private moveListenerMap = new WeakMap<L.LayerGroup, () => void>();

  public render(layerDef: CanvasLayerDef, map: L.Map, _context: CanvasRenderContext): L.LayerGroup {
    const group = L.layerGroup();
    const paneName = `pane-${layerDef.id}`;

    const updateGrid = () => {
      group.clearLayers();
      if (!layerDef.visivel) return;

      const zoom = map.getZoom();
      if (zoom > 20) {
        const bounds = map.getBounds();
        const south = bounds.getSouth();
        const north = bounds.getNorth();
        const west = bounds.getWest();
        const east = bounds.getEast();
        const center = map.getCenter();

        const latGridStep = 0.000008999;
        const cosLat = Math.cos((center.lat * Math.PI) / 180);
        const lonGridStep = latGridStep / (cosLat > 0.1 ? cosLat : 1.0);

        const latLinesCount = Math.floor((north - south) / latGridStep);
        const lonLinesCount = Math.floor((east - west) / lonGridStep);

        if (latLinesCount < 200 && lonLinesCount < 200) {
          const startLat = Math.ceil(south / latGridStep) * latGridStep;
          for (let lat = startLat; lat <= north; lat += latGridStep) {
            L.polyline([[lat, west], [lat, east]], {
              color: layerDef.estilo.corPrimaria || 'rgba(0, 245, 160, 0.18)',
              weight: layerDef.estilo.espessuraLinha || 0.6,
              interactive: false,
              pane: paneName
            }).addTo(group);
          }

          const startLon = Math.ceil(west / lonGridStep) * lonGridStep;
          for (let lon = startLon; lon <= east; lon += lonGridStep) {
            L.polyline([[south, lon], [north, lon]], {
              color: layerDef.estilo.corPrimaria || 'rgba(0, 245, 160, 0.18)',
              weight: layerDef.estilo.espessuraLinha || 0.6,
              interactive: false,
              pane: paneName
            }).addTo(group);
          }
        }
      }
    };

    updateGrid();
    map.on('zoomend moveend', updateGrid);
    this.moveListenerMap.set(group, updateGrid);

    return group;
  }

  public update(layerDef: CanvasLayerDef, layerInstance: L.LayerGroup): void {
    if (!layerDef.visivel) {
      layerInstance.clearLayers();
    }
  }

  public destroy(layerInstance: L.LayerGroup, map: L.Map): void {
    const cb = this.moveListenerMap.get(layerInstance);
    if (cb) {
      map.off('zoomend moveend', cb);
      this.moveListenerMap.delete(layerInstance);
    }
    layerInstance.clearLayers();
    if (map.hasLayer(layerInstance)) {
      map.removeLayer(layerInstance);
    }
  }
}
