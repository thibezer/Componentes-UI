import L from 'leaflet';
import type { ILayerRenderer } from '../layer_renderer_factory';
import type { CanvasLayerDef, CanvasRenderContext } from '../types';

export class TileLayerRenderer implements ILayerRenderer {
  public render(layerDef: CanvasLayerDef, _map: L.Map, _context: CanvasRenderContext): L.Layer | null {
    const url = layerDef.dados?.url || 'https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}';
    const subdomains = layerDef.dados?.subdomains || ['mt0', 'mt1', 'mt2', 'mt3'];
    const attribution = layerDef.dados?.attribution || 'Google Satélite';

    const tileLayer = L.tileLayer(url, {
      maxZoom: 24,
      maxNativeZoom: 20,
      subdomains,
      attribution,
      keepBuffer: 16,
      updateWhenZooming: false,
      updateWhenIdle: true,
      className: 'smooth-zoom-layer',
      opacity: layerDef.opacidade !== undefined ? layerDef.opacidade : 1.0,
      pane: `pane-${layerDef.id}`
    });

    return tileLayer;
  }

  public update(_layerDef: CanvasLayerDef, layerInstance: L.Layer, changes: Partial<CanvasLayerDef>): void {
    if (layerInstance instanceof L.TileLayer) {
      if (changes.opacidade !== undefined) {
        layerInstance.setOpacity(changes.opacidade);
      }
    }
  }

  public destroy(layerInstance: L.Layer, map: L.Map): void {
    if (map.hasLayer(layerInstance)) {
      map.removeLayer(layerInstance);
    }
  }
}
