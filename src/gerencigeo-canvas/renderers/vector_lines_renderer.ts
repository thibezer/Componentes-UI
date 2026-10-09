import L from 'leaflet';
import { garantirSubPane } from '../layer_pane_ops';
import type { ILayerRenderer } from '../layer_renderer_factory';
import type { CanvasLayerDef, CanvasRenderContext } from '../types';
import { rebuildVectorLines, calculateLineWeight } from './vector_lines_builder';

export class VectorLinesLayerRenderer implements ILayerRenderer {
  private zoomListenerMap = new WeakMap<L.LayerGroup, () => void>();

  public render(layerDef: CanvasLayerDef, map: L.Map, context: CanvasRenderContext): L.LayerGroup {
    const group = L.layerGroup();
    const paneName = garantirSubPane(map, layerDef.id, 'linha');

    rebuildVectorLines(layerDef, group, map, context, paneName);

    // Se a camada estiver em modo 'world', atualiza espessura no zoom
    const zoomCallback = () => {
      if (layerDef.estilo.scaleMode === 'world') {
        const newWeight = calculateLineWeight(layerDef, map, context);
        group.eachLayer((layer: any) => {
          if (layer.setStyle) layer.setStyle({ weight: newWeight });
        });
      }
    };

    map.on('zoomend', zoomCallback);
    this.zoomListenerMap.set(group, zoomCallback);

    return group;
  }

  public update(layerDef: CanvasLayerDef, layerInstance: L.LayerGroup, changes: Partial<CanvasLayerDef>, context: CanvasRenderContext, map: L.Map): void {
    if (changes.opacidade !== undefined || changes.estilo !== undefined || changes.dados !== undefined || changes.interativo !== undefined || changes.bloqueada !== undefined) {
      layerInstance.clearLayers();
      rebuildVectorLines(layerDef, layerInstance, map, context, garantirSubPane(map, layerDef.id, 'linha'));
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
