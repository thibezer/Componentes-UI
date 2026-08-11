import L from 'leaflet';
import type { ILayerRenderer } from '../layer_renderer_factory';
import type { CanvasLayerDef, CanvasRenderContext } from '../types';

export class WmsLayerRenderer implements ILayerRenderer {
  public render(layerDef: CanvasLayerDef, _map: L.Map, _context: CanvasRenderContext): L.Layer | null {
    const url = layerDef.dados?.url || 'https://acervofundiario.incra.gov.br/i3geo/ogc.php';
    const layers = layerDef.dados?.layers || 'certificada_sigef_particular_pr';
    const format = layerDef.dados?.format || 'image/png';
    const attribution = layerDef.dados?.attribution || 'INCRA/SIGEF';

    const wmsLayer = L.tileLayer.wms(url, {
      layers,
      format,
      transparent: true,
      version: '1.1.1',
      pane: `pane-${layerDef.id}`,
      attribution,
      className: 'sigef-wms-layer',
      keepBuffer: 8,
      updateWhenZooming: false,
      updateWhenIdle: true,
      opacity: layerDef.opacidade !== undefined ? layerDef.opacidade : 0.85
    });

    return wmsLayer;
  }

  public update(layerDef: CanvasLayerDef, layerInstance: L.Layer, changes: Partial<CanvasLayerDef>): void {
    if (layerInstance instanceof L.TileLayer.WMS) {
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
