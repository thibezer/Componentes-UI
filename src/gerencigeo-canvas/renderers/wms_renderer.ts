import L from 'leaflet';
import type { ILayerRenderer } from '../layer_renderer_factory';
import type { CanvasLayerDef, CanvasRenderContext } from '../types';
import { SIGEF_WMS_URL, SIGEF_WMS_CAMADA } from '../sigef_config';

export class WmsLayerRenderer implements ILayerRenderer {
  public render(layerDef: CanvasLayerDef, _map: L.Map, _context: CanvasRenderContext): L.Layer | null {
    const url = layerDef.dados?.url || SIGEF_WMS_URL;
    const layers = layerDef.dados?.layers || SIGEF_WMS_CAMADA;
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
      opacity: 1 // a opacidade da camada é do pane (LayerManager)
    });

    return wmsLayer;
  }

  /** Opacidade, z-index e visibilidade são do pane da camada (LayerManager): nada a atualizar aqui. */
  public update(): void {}

  public destroy(layerInstance: L.Layer, map: L.Map): void {
    if (map.hasLayer(layerInstance)) {
      map.removeLayer(layerInstance);
    }
  }
}
