import L from 'leaflet';
import type { ILayerRenderer } from '../layer_renderer_factory';
import type { CanvasLayerDef, CanvasRenderContext } from '../types';

export class TileLayerRenderer implements ILayerRenderer {
  public render(layerDef: CanvasLayerDef, _map: L.Map, context: CanvasRenderContext): L.Layer | null {
    let keepBuffer = 16;
    try {
      keepBuffer = context?.qualidade?.().keepBuffer ?? 16;
    } catch {
      // Regra #0: contexto sem perfil usa o padrão
    }
    const url = layerDef.dados?.url || 'https://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}';
    const subdomains = layerDef.dados?.subdomains || ['mt0', 'mt1', 'mt2', 'mt3'];
    const attribution = layerDef.dados?.attribution || 'Google Satélite';

    const tileLayer = L.tileLayer(url, {
      maxZoom: 24,
      maxNativeZoom: 20,
      subdomains,
      attribution,
      keepBuffer,
      updateWhenZooming: false,
      updateWhenIdle: true,
      className: 'smooth-zoom-layer',
      opacity: 1, // a opacidade da camada é do pane (LayerManager)
      pane: `pane-${layerDef.id}`
    });

    return tileLayer;
  }

  /** Opacidade, z-index e visibilidade são do pane da camada (LayerManager): nada a atualizar aqui. */
  public update(): void {}

  public destroy(layerInstance: L.Layer, map: L.Map): void {
    if (map.hasLayer(layerInstance)) {
      map.removeLayer(layerInstance);
    }
  }
}
