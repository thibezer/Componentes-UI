import L from 'leaflet';
import type { CanvasLayerDef, CanvasRenderContext } from './types';
import { LayerRendererFactory } from './layer_renderer_factory';

/* Ciclo de vida das instâncias Leaflet de cada camada (render / update / destroy) */

export type MapaInstancias = Map<string, L.Layer | L.LayerGroup>;

export function montarInstancia(
  layer: CanvasLayerDef,
  map: L.Map,
  context: CanvasRenderContext,
  instances: MapaInstancias
): void {
  const renderer = LayerRendererFactory.get(layer.tipo);
  if (!renderer) return;
  const instance = renderer.render(layer, map, context);
  if (instance) {
    instance.addTo(map);
    instances.set(layer.id, instance);
  }
}

export function destruirInstancia(
  layer: CanvasLayerDef,
  map: L.Map,
  instances: MapaInstancias
): void {
  const instance = instances.get(layer.id);
  if (!instance) return;
  const renderer = LayerRendererFactory.get(layer.tipo);
  if (renderer) renderer.destroy(instance, map);
  instances.delete(layer.id);
}

export function atualizarInstancia(
  layer: CanvasLayerDef,
  patch: Partial<CanvasLayerDef>,
  map: L.Map,
  context: CanvasRenderContext,
  instances: MapaInstancias
): void {
  const instance = instances.get(layer.id);
  if (!instance) return;
  const renderer = LayerRendererFactory.get(layer.tipo);
  if (renderer) renderer.update(layer, instance, patch, context, map);
}
